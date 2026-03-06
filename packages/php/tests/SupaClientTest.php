<?php

declare(strict_types=1);

namespace Supaship\Sdk\Tests;

use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7\Response;
use PHPUnit\Framework\TestCase;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Supaship\Sdk\Config\SupaClientConfig;
use Supaship\Sdk\SupaClient;

final class SupaClientTest extends TestCase
{
    private Psr17Factory $psr17Factory;

    protected function setUp(): void
    {
        $this->psr17Factory = new Psr17Factory();
    }

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
            [new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))]
        );

        self::assertTrue($client->getFeature('new-ui'));
    }

    public function testGetFeaturesReturnsFallbackWhenVariationIsNull(): void
    {
        $client = $this->makeClientWithResponses(
            [new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => null]]]))]
        );

        $result = $client->getFeatures(['new-ui']);
        self::assertSame(['new-ui' => false], $result);
    }

    public function testUpdateContextMergesByDefault(): void
    {
        $spy = new SpyHttpClient([new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))]);
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
            [new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))],
            ['context' => ['userId' => '123', 'plan' => 'free']]
        );

        $client->updateContext(['tenant' => 'acme'], false);

        self::assertSame(['tenant' => 'acme'], $client->getContext());
    }

    public function testRequestContextOverrideIsMerged(): void
    {
        $spy = new SpyHttpClient([new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))]);
        $client = $this->makeClient($spy);

        $client->getFeature('new-ui', ['context' => ['plan' => 'pro']]);

        $payload = $spy->lastPayload;
        self::assertIsArray($payload);
        self::assertSame('123', $payload['context']['userId']);
        self::assertSame('pro', $payload['context']['plan']);
    }

    public function testSensitiveContextPropertiesAreHashed(): void
    {
        $spy = new SpyHttpClient([new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))]);
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
            new SequenceHttpClient([
                new FakeClientException('temporary error'),
                new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]])),
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
            new SequenceHttpClient([new FakeClientException('network error')]),
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
        $client = $this->makeClientWithResponses([new Response(401, [], '{}')]);

        self::assertFalse($client->getFeature('new-ui'));
    }

    public function testTimeoutConfigIsAddedToRequestHeader(): void
    {
        $spy = new SpyHttpClient([new Response(200, [], json_encode(['features' => ['new-ui' => ['variation' => true]]]))]);
        $client = $this->makeClient($spy, [
            'networkConfig' => ['requestTimeoutMs' => 2500],
        ]);

        $client->getFeature('new-ui');

        self::assertNotNull($spy->lastRequest);
        self::assertSame('2500', $spy->lastRequest->getHeaderLine('X-Supaship-Timeout-Ms'));
    }

    public function testGetFeatureFallbackReturnsDefinedFallback(): void
    {
        $client = $this->makeClientWithResponses([]);
        self::assertFalse($client->getFeatureFallback('new-ui'));
        self::assertNull($client->getFeatureFallback('unknown-feature'));
    }

    /**
     * @param list<ResponseInterface|ClientExceptionInterface> $queue
     * @param array<string, mixed> $overrides
     */
    private function makeClientWithResponses(array $queue, array $overrides = []): SupaClient
    {
        return $this->makeClient(new SequenceHttpClient($queue), $overrides);
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function makeClient(ClientInterface $httpClient, array $overrides = []): SupaClient
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

        return SupaClient::fromArray(
            $config,
            $httpClient,
            $this->psr17Factory,
            $this->psr17Factory
        );
    }
}

final class SequenceHttpClient implements ClientInterface
{
    /** @var list<ResponseInterface|ClientExceptionInterface> */
    private array $queue;

    /**
     * @param list<ResponseInterface|ClientExceptionInterface> $queue
     */
    public function __construct(array $queue)
    {
        $this->queue = $queue;
    }

    public function sendRequest(RequestInterface $request): ResponseInterface
    {
        if ($this->queue === []) {
            return new Response(200, [], json_encode(['features' => []]));
        }

        $next = array_shift($this->queue);
        if ($next instanceof ClientExceptionInterface) {
            throw $next;
        }

        return $next;
    }
}

final class SpyHttpClient implements ClientInterface
{
    /** @var list<ResponseInterface|ClientExceptionInterface> */
    private array $queue;
    public ?RequestInterface $lastRequest = null;
    /** @var array<string, mixed>|null */
    public ?array $lastPayload = null;

    /**
     * @param list<ResponseInterface|ClientExceptionInterface> $queue
     */
    public function __construct(array $queue)
    {
        $this->queue = $queue;
    }

    public function sendRequest(RequestInterface $request): ResponseInterface
    {
        $this->lastRequest = $request;
        $body = (string) $request->getBody();
        $decoded = json_decode($body, true);
        $this->lastPayload = is_array($decoded) ? $decoded : null;

        if ($this->queue === []) {
            return new Response(200, [], json_encode(['features' => []]));
        }

        $next = array_shift($this->queue);
        if ($next instanceof ClientExceptionInterface) {
            throw $next;
        }

        return $next;
    }
}

final class FakeClientException extends \RuntimeException implements ClientExceptionInterface
{
}
