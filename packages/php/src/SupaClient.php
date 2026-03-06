<?php

declare(strict_types=1);

namespace Supaship\Sdk;

use Supaship\Sdk\Config\SupaClientConfig;
use Supaship\Sdk\Exception\SdkException;
use Supaship\Sdk\Support\Retry;
use Throwable;

final class SupaClient
{
    /** @var array<string, mixed> */
    private array $featureDefinitions;
    /** @var array<string, scalar|null> */
    private array $defaultContext;
    /** @var array<string, bool> */
    private array $sensitiveContextLookup;
    /** @var callable(string, array<string, string>, string, int): array{status: int, body: string} */
    private $transport;

    public function __construct(
        private readonly SupaClientConfig $config,
        ?callable $transport = null
    ) {
        $this->featureDefinitions = $config->features;
        $this->defaultContext = $config->context;
        $this->sensitiveContextLookup = array_fill_keys($config->sensitiveContextProperties, true);
        $this->transport = $transport ?? self::defaultTransport(...);
    }

    /**
     * @param array{
     *   apiKey: string,
     *   environment: string,
     *   features: array<string, mixed>,
     *   context: array<string, scalar|null>,
     *   sensitiveContextProperties?: list<string>,
     *   networkConfig?: array{
     *     featuresApiUrl?: string,
     *     eventsApiUrl?: string,
     *     requestTimeoutMs?: int,
     *     retry?: array{enabled?: bool, maxAttempts?: int, backoff?: int}
     *   }
     * } $config
     */
    public static function fromArray(array $config, ?callable $transport = null): self
    {
        return new self(SupaClientConfig::fromArray($config), $transport);
    }

    public function getFeature(string $featureName, ?array $options = null): mixed
    {
        $features = $this->getFeatures([$featureName], $options);
        return $features[$featureName] ?? $this->getFeatureFallback($featureName);
    }

    /**
     * @param list<string> $featureNames
     * @param array{context?: array<string, scalar|null>}|null $options
     * @return array<string, mixed>
     */
    public function getFeatures(array $featureNames, ?array $options = null): array
    {
        $mergedContext = $this->resolveContext($options['context'] ?? null);

        try {
            $result = $this->config->retryEnabled
                ? Retry::execute(
                    fn (): array => $this->fetchFeatures($featureNames, $mergedContext),
                    $this->config->retryMaxAttempts,
                    $this->config->retryBackoffMs
                )
                : $this->fetchFeatures($featureNames, $mergedContext);

            return $result;
        } catch (Throwable) {
            return $this->buildFallbackResult($featureNames);
        }
    }

    /**
     * @param array<string, scalar|null> $context
     */
    public function updateContext(array $context, bool $mergeWithExisting = true): void
    {
        $this->defaultContext = $mergeWithExisting ? array_merge($this->defaultContext, $context) : $context;
    }

    /**
     * @return array<string, scalar|null>
     */
    public function getContext(): ?array
    {
        return $this->defaultContext;
    }

    public function getFeatureFallback(string $featureName): mixed
    {
        return $this->featureDefinitions[$featureName] ?? null;
    }

    /**
     * @param list<string> $featureNames
     * @param array<string, scalar|null> $context
     * @return array<string, mixed>
     */
    private function fetchFeatures(array $featureNames, array $context): array
    {
        $requestPayload = [
            'environment' => $this->config->environment,
            'features' => array_values($featureNames),
            'context' => $this->hashSensitiveContext($context),
        ];

        $body = (string) json_encode($requestPayload);
        $headers = [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $this->config->apiKey,
            'X-Supaship-Timeout-Ms' => (string) $this->config->requestTimeoutMs,
        ];
        /** @var array{status: int, body: string} $response */
        $response = ($this->transport)(
            $this->config->featuresApiUrl,
            $headers,
            $body,
            $this->config->requestTimeoutMs
        );

        $decoded = $this->decodeResponse($response);

        $result = [];
        foreach ($featureNames as $featureName) {
            $hasVariation = isset($decoded['features'][$featureName]) &&
                array_key_exists('variation', $decoded['features'][$featureName]);
            $variation = $hasVariation ? $decoded['features'][$featureName]['variation'] : null;

            $result[$featureName] = $variation !== null
                ? $variation
                : $this->getFeatureFallback($featureName);
        }

        return $result;
    }

    /**
     * @param array{status: int, body: string} $response
     * @return array<string, mixed>
     */
    private function decodeResponse(array $response): array
    {
        $status = $response['status'] ?? 0;
        if ($status < 200 || $status >= 300) {
            throw new SdkException('Failed to fetch features: HTTP ' . $status);
        }

        $decoded = json_decode($response['body'] ?? '', true);
        if (!is_array($decoded)) {
            throw new SdkException('Failed to decode features response.');
        }

        return $decoded;
    }

    /**
     * @param array<string, scalar|null>|null $contextOverride
     * @return array<string, scalar|null>
     */
    private function resolveContext(?array $contextOverride): array
    {
        if ($contextOverride === null) {
            return $this->defaultContext;
        }

        return array_merge($this->defaultContext, $contextOverride);
    }

    /**
     * @param array<string, scalar|null> $context
     * @return array<string, scalar|null>
     */
    private function hashSensitiveContext(array $context): array
    {
        if ($this->sensitiveContextLookup === []) {
            return $context;
        }

        $hashed = $context;
        foreach ($hashed as $key => $value) {
            if (!isset($this->sensitiveContextLookup[$key]) || $value === null) {
                continue;
            }

            $hashed[$key] = hash('sha256', (string) $value);
        }

        return $hashed;
    }

    /**
     * @param list<string> $featureNames
     * @return array<string, mixed>
     */
    private function buildFallbackResult(array $featureNames): array
    {
        $fallbacks = [];
        foreach ($featureNames as $featureName) {
            $fallbacks[$featureName] = $this->getFeatureFallback($featureName);
        }

        return $fallbacks;
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}
     */
    private static function defaultTransport(
        string $url,
        array $headers,
        string $body,
        int $timeoutMs
    ): array {
        if (function_exists('curl_init')) {
            return self::curlTransport($url, $headers, $body, $timeoutMs);
        }

        return self::streamTransport($url, $headers, $body, $timeoutMs);
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}
     */
    private static function curlTransport(string $url, array $headers, string $body, int $timeoutMs): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new SdkException('Failed to initialize cURL.');
        }

        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = $name . ': ' . $value;
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_TIMEOUT_MS => $timeoutMs,
        ]);

        $responseBody = curl_exec($ch);
        if ($responseBody === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new SdkException('Failed to fetch features: ' . $error);
        }

        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [
            'status' => $status,
            'body' => (string) $responseBody,
        ];
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}
     */
    private static function streamTransport(string $url, array $headers, string $body, int $timeoutMs): array
    {
        $headerLines = [];
        foreach ($headers as $name => $value) {
            $headerLines[] = $name . ': ' . $value;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headerLines),
                'content' => $body,
                'timeout' => max(1, (int) ceil($timeoutMs / 1000)),
                'ignore_errors' => true,
            ],
        ]);

        $responseBody = @file_get_contents($url, false, $context);
        if ($responseBody === false) {
            throw new SdkException('Failed to fetch features using stream transport.');
        }

        $status = 0;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) === 1) {
            $status = (int) $m[1];
        }

        return [
            'status' => $status,
            'body' => $responseBody,
        ];
    }
}
