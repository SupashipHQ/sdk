<?php

declare(strict_types=1);

namespace Supaship\Sdk\Tests;

use PHPUnit\Framework\TestCase;
use Supaship\Sdk\Config\SupaClientConfig;
use Supaship\Sdk\Exception\SdkException;
use Supaship\Sdk\SupaClient;

final class SupaClientTest extends TestCase
{
    public function testConfigDefaultsAreApplied(): void
    {
        $config = SupaClientConfig::fromArray([
            'apiKey' => 'key',
            'environment' => 'production',
            'features' => ['new-ui' => false],
            'context' => ['userId' => '123'],
        ]);

        self::assertSame('https://edge.supaship.com/v1/features', $config->featuresApiUrl);
        self::assertSame('https://edge.supaship.com/v1/events', $config->eventsApiUrl);
        self::assertTrue($config->retryEnabled);
        self::assertSame(3, $config->retryMaxAttempts);
        self::assertSame(1000, $config->retryBackoffMs);
        self::assertSame(10000, $config->requestTimeoutMs);
    }

    public function testGetFeatureReturnsVariation(): void
    {
        $client = $this->makeClientWithResponses(
            [['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])]]
        );

        self::assertTrue($client->getFeature('new-ui'));
    }

    public function testGetFeaturesReturnsFallbackWhenVariationIsNull(): void
    {
        $client = $this->makeClientWithResponses(
            [['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => null]]])]]
        );

        $result = $client->getFeatures(['new-ui']);
        self::assertSame(['new-ui' => false], $result);
    }

    public function testUpdateContextMergesByDefault(): void
    {
        $spy = new SpyTransport([
            ['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])],
        ]);
        $client = $this->makeClient($spy, ['context' => ['userId' => '123', 'plan' => 'free']]);

        $client->updateContext(['plan' => 'pro']);
        $client->getFeature('new-ui');

        $payload = $spy->lastPayload;
        self::assertIsArray($payload);
        self::assertSame('123', $payload['context']['userId']);
        self::assertSame('pro', $payload['context']['plan']);
    }

    public function testUpdateContextCanReplace(): void
    {
        $client = $this->makeClientWithResponses(
            [['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])]],
            ['context' => ['userId' => '123', 'plan' => 'free']]
        );

        $client->updateContext(['tenant' => 'acme'], false);

        self::assertSame(['tenant' => 'acme'], $client->getContext());
    }

    public function testRequestContextOverrideIsMerged(): void
    {
        $spy = new SpyTransport([
            ['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])],
        ]);
        $client = $this->makeClient($spy);

        $client->getFeature('new-ui', ['context' => ['plan' => 'pro']]);

        $payload = $spy->lastPayload;
        self::assertIsArray($payload);
        self::assertSame('123', $payload['context']['userId']);
        self::assertSame('pro', $payload['context']['plan']);
    }

    public function testSensitiveContextPropertiesAreHashed(): void
    {
        $spy = new SpyTransport([
            ['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])],
        ]);
        $client = $this->makeClient($spy, ['sensitiveContextProperties' => ['email']]);

        $client->getFeature('new-ui');

        $payload = $spy->lastPayload;
        self::assertIsArray($payload);
        self::assertSame(hash('sha256', 'john@example.com'), $payload['context']['email']);
        self::assertSame('123', $payload['context']['userId']);
    }

    public function testRetryEnabledRetriesAndThenSucceeds(): void
    {
        $client = $this->makeClient(
            new SequenceTransport([
                new SdkException('temporary error'),
                ['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])],
            ]),
            [
                'networkConfig' => [
                    'retry' => ['enabled' => true, 'maxAttempts' => 2, 'backoff' => 0],
                ],
            ]
        );

        self::assertTrue($client->getFeature('new-ui'));
    }

    public function testRetryDisabledReturnsFallbackOnFirstFailure(): void
    {
        $client = $this->makeClient(
            new SequenceTransport([new SdkException('network error')]),
            [
                'networkConfig' => [
                    'retry' => ['enabled' => false, 'maxAttempts' => 3, 'backoff' => 0],
                ],
            ]
        );

        self::assertFalse($client->getFeature('new-ui'));
    }

    public function testHttpErrorFallsBack(): void
    {
        $client = $this->makeClientWithResponses([['status' => 401, 'body' => '{}']]);

        self::assertFalse($client->getFeature('new-ui'));
    }

    public function testTimeoutConfigIsPassedToTransport(): void
    {
        $spy = new SpyTransport([
            ['status' => 200, 'body' => json_encode(['features' => ['new-ui' => ['variation' => true]]])],
        ]);
        $client = $this->makeClient($spy, [
            'networkConfig' => ['requestTimeoutMs' => 2500],
        ]);

        $client->getFeature('new-ui');

        self::assertSame(2500, $spy->lastTimeoutMs);
    }

    public function testGetFeatureFallbackReturnsDefinedFallback(): void
    {
        $client = $this->makeClientWithResponses([]);
        self::assertFalse($client->getFeatureFallback('new-ui'));
        self::assertNull($client->getFeatureFallback('unknown-feature'));
    }

    /**
     * @param list<array{status: int, body: string}|\Throwable> $queue
     * @param array<string, mixed> $overrides
     */
    private function makeClientWithResponses(array $queue, array $overrides = []): SupaClient
    {
        return $this->makeClient(new SequenceTransport($queue), $overrides);
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function makeClient(callable $transport, array $overrides = []): SupaClient
    {
        $config = array_replace_recursive(
            [
                'apiKey' => 'test-api-key',
                'environment' => 'test-environment',
                'features' => ['new-ui' => false, 'beta' => true],
                'context' => ['userId' => '123', 'email' => 'john@example.com'],
                'networkConfig' => [
                    'featuresApiUrl' => 'https://example.supaship.com/v1/features',
                    'retry' => ['enabled' => true, 'maxAttempts' => 3, 'backoff' => 0],
                    'requestTimeoutMs' => 10000,
                ],
            ],
            $overrides
        );

        return SupaClient::fromArray($config, $transport);
    }
}

final class SequenceTransport
{
    /** @var list<array{status: int, body: string}|\Throwable> */
    private array $queue;

    /**
     * @param list<array{status: int, body: string}|\Throwable> $queue
     */
    public function __construct(array $queue)
    {
        $this->queue = $queue;
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}
     */
    public function __invoke(string $url, array $headers, string $body, int $timeoutMs): array
    {
        if ($this->queue === []) {
            return ['status' => 200, 'body' => (string) json_encode(['features' => []])];
        }

        $next = array_shift($this->queue);
        if ($next instanceof \Throwable) {
            throw $next;
        }

        return $next;
    }
}

final class SpyTransport
{
    /** @var list<array{status: int, body: string}|\Throwable> */
    private array $queue;
    /** @var array<string, mixed>|null */
    public ?array $lastPayload = null;
    /** @var array<string, string>|null */
    public ?array $lastHeaders = null;
    public ?string $lastUrl = null;
    public ?int $lastTimeoutMs = null;

    /**
     * @param list<array{status: int, body: string}|\Throwable> $queue
     */
    public function __construct(array $queue)
    {
        $this->queue = $queue;
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string}
     */
    public function __invoke(string $url, array $headers, string $body, int $timeoutMs): array
    {
        $this->lastUrl = $url;
        $this->lastHeaders = $headers;
        $this->lastTimeoutMs = $timeoutMs;
        $decoded = json_decode($body, true);
        $this->lastPayload = is_array($decoded) ? $decoded : null;

        if ($this->queue === []) {
            return ['status' => 200, 'body' => (string) json_encode(['features' => []])];
        }

        $next = array_shift($this->queue);
        if ($next instanceof \Throwable) {
            throw $next;
        }

        return $next;
    }
}
