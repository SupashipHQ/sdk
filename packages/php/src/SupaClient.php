<?php

declare(strict_types=1);

namespace Supaship\Sdk;

use Psr\Http\Client\ClientInterface;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\StreamFactoryInterface;
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

    public function __construct(
        private readonly SupaClientConfig $config,
        private readonly ClientInterface $httpClient,
        private readonly RequestFactoryInterface $requestFactory,
        private readonly StreamFactoryInterface $streamFactory
    ) {
        $this->featureDefinitions = $config->features;
        $this->defaultContext = $config->context;
        $this->sensitiveContextLookup = array_fill_keys($config->sensitiveContextProperties, true);
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
    public static function fromArray(
        array $config,
        ClientInterface $httpClient,
        RequestFactoryInterface $requestFactory,
        StreamFactoryInterface $streamFactory
    ): self {
        return new self(
            SupaClientConfig::fromArray($config),
            $httpClient,
            $requestFactory,
            $streamFactory
        );
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

        $request = $this->requestFactory
            ->createRequest('POST', $this->config->featuresApiUrl)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Authorization', 'Bearer ' . $this->config->apiKey)
            ->withHeader('X-Supaship-Timeout-Ms', (string) $this->config->requestTimeoutMs)
            ->withBody($this->streamFactory->createStream((string) json_encode($requestPayload)));

        $response = $this->sendRequest($request);
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

    private function sendRequest(\Psr\Http\Message\RequestInterface $request): ResponseInterface
    {
        try {
            $response = $this->httpClient->sendRequest($request);
        } catch (ClientExceptionInterface $exception) {
            throw new SdkException('Failed to fetch features: ' . $exception->getMessage(), 0, $exception);
        }

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            throw new SdkException('Failed to fetch features: HTTP ' . $response->getStatusCode());
        }

        return $response;
    }

    /**
     * @return array{features?: array<string, array{variation?: mixed}>}
     */
    private function decodeResponse(ResponseInterface $response): array
    {
        $decoded = json_decode((string) $response->getBody(), true);
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
}
