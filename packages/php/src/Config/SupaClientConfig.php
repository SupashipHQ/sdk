<?php

declare(strict_types=1);

namespace Supaship\Sdk\Config;

use InvalidArgumentException;

final class SupaClientConfig
{
    private const DEFAULT_FEATURES_URL = 'https://edge.supaship.com/v1/features';
    private const DEFAULT_EVENTS_URL = 'https://edge.supaship.com/v1/events';

    public readonly string $apiKey;
    public readonly string $environment;
    /** @var array<string, mixed> */
    public readonly array $features;
    /** @var array<string, scalar|null> */
    public readonly array $context;
    /** @var list<string> */
    public readonly array $sensitiveContextProperties;
    public readonly string $featuresApiUrl;
    public readonly string $eventsApiUrl;
    public readonly bool $retryEnabled;
    public readonly int $retryMaxAttempts;
    public readonly int $retryBackoffMs;
    public readonly int $requestTimeoutMs;

    /**
     * @param array<string, mixed> $features
     * @param array<string, scalar|null> $context
     * @param list<string> $sensitiveContextProperties
     */
    public function __construct(
        string $apiKey,
        string $environment,
        array $features,
        array $context,
        array $sensitiveContextProperties = [],
        string $featuresApiUrl = self::DEFAULT_FEATURES_URL,
        string $eventsApiUrl = self::DEFAULT_EVENTS_URL,
        bool $retryEnabled = true,
        int $retryMaxAttempts = 3,
        int $retryBackoffMs = 1000,
        int $requestTimeoutMs = 10000
    ) {
        if ($apiKey === '') {
            throw new InvalidArgumentException('apiKey must not be empty.');
        }
        if ($environment === '') {
            throw new InvalidArgumentException('environment must not be empty.');
        }
        if ($retryMaxAttempts < 1) {
            throw new InvalidArgumentException('retryMaxAttempts must be >= 1.');
        }
        if ($retryBackoffMs < 0) {
            throw new InvalidArgumentException('retryBackoffMs must be >= 0.');
        }
        if ($requestTimeoutMs < 1) {
            throw new InvalidArgumentException('requestTimeoutMs must be >= 1.');
        }

        $this->apiKey = $apiKey;
        $this->environment = $environment;
        $this->features = $features;
        $this->context = $context;
        $this->sensitiveContextProperties = $sensitiveContextProperties;
        $this->featuresApiUrl = $featuresApiUrl;
        $this->eventsApiUrl = $eventsApiUrl;
        $this->retryEnabled = $retryEnabled;
        $this->retryMaxAttempts = $retryMaxAttempts;
        $this->retryBackoffMs = $retryBackoffMs;
        $this->requestTimeoutMs = $requestTimeoutMs;
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
    public static function fromArray(array $config): self
    {
        /** @var array<string, mixed> $networkConfig */
        $networkConfig = $config['networkConfig'] ?? [];
        /** @var array<string, mixed> $retryConfig */
        $retryConfig = $networkConfig['retry'] ?? [];

        return new self(
            apiKey: $config['apiKey'],
            environment: $config['environment'],
            features: $config['features'],
            context: $config['context'],
            sensitiveContextProperties: $config['sensitiveContextProperties'] ?? [],
            featuresApiUrl: $networkConfig['featuresApiUrl'] ?? self::DEFAULT_FEATURES_URL,
            eventsApiUrl: $networkConfig['eventsApiUrl'] ?? self::DEFAULT_EVENTS_URL,
            retryEnabled: $retryConfig['enabled'] ?? true,
            retryMaxAttempts: $retryConfig['maxAttempts'] ?? 3,
            retryBackoffMs: $retryConfig['backoff'] ?? 1000,
            requestTimeoutMs: $networkConfig['requestTimeoutMs'] ?? 10000
        );
    }
}
