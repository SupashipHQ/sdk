# Supaship PHP SDK

A framework-agnostic PHP SDK for Supaship feature flags. It works with Laravel, CodeIgniter, WordPress, and standalone PHP by using PSR-18/PSR-17 interfaces.

## Installation

```bash
composer require supashiphq/php-sdk
```

You also need a PSR-18 HTTP client and PSR-17 factories in your app. One common setup:

```bash
composer require nyholm/psr7 symfony/http-client
composer require php-http/discovery
```

## Quick Start

```php
<?php

use Nyholm\Psr7\Factory\Psr17Factory;
use Symfony\Component\HttpClient\Psr18Client;
use Supaship\Sdk\SupaClient;

$psr17 = new Psr17Factory();
$httpClient = new Psr18Client();

$client = SupaClient::fromArray(
    [
        'apiKey' => 'your-api-key',
        'environment' => 'production',
        'features' => [
            'new-ui' => false,
            'theme-config' => [
                'darkMode' => false,
                'primaryColor' => '#007bff',
            ],
        ],
        'context' => [
            'userId' => '123',
            'plan' => 'pro',
        ],
    ],
    $httpClient,
    $psr17,
    $psr17
);

$isEnabled = $client->getFeature('new-ui');
$theme = $client->getFeature('theme-config');
```

## API Reference

### Constructor

```php
new Supaship\Sdk\SupaClient(
    Supaship\Sdk\Config\SupaClientConfig $config,
    Psr\Http\Client\ClientInterface $httpClient,
    Psr\Http\Message\RequestFactoryInterface $requestFactory,
    Psr\Http\Message\StreamFactoryInterface $streamFactory
)
```

### Convenience Constructor

```php
SupaClient::fromArray(array $config, ClientInterface $httpClient, RequestFactoryInterface $requestFactory, StreamFactoryInterface $streamFactory)
```

### Config Options

Required:

- `apiKey` (string)
- `environment` (string)
- `features` (array<string, mixed>) fallback definitions
- `context` (array<string, scalar|null>) default targeting context

Optional:

- `sensitiveContextProperties` (list<string>) - values are SHA-256 hashed before sending
- `networkConfig.featuresApiUrl` (string, default `https://edge.supaship.com/v1/features`)
- `networkConfig.eventsApiUrl` (string, default `https://edge.supaship.com/v1/events`)
- `networkConfig.requestTimeoutMs` (int, default `10000`)
- `networkConfig.retry.enabled` (bool, default `true`)
- `networkConfig.retry.maxAttempts` (int, default `3`)
- `networkConfig.retry.backoff` (int ms, default `1000`)

### Methods

- `getFeature(string $featureName, ?array $options = null): mixed`
- `getFeatures(array $featureNames, ?array $options = null): array`
- `updateContext(array $context, bool $mergeWithExisting = true): void`
- `getContext(): ?array`
- `getFeatureFallback(string $featureName): mixed`

`$options` supports:

- `context` - one-request context override. It merges with current default context.

## Error and Fallback Behavior

- If API requests fail (network errors, non-2xx responses, invalid response body), the SDK returns local fallback values from `features`.
- Retries use exponential backoff when enabled.
- Unknown feature names return `null` fallback.

## Framework Usage

### Laravel

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Nyholm\Psr7\Factory\Psr17Factory;
use Supaship\Sdk\SupaClient;
use Symfony\Component\HttpClient\Psr18Client;

class SupashipServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SupaClient::class, function () {
            $psr17 = new Psr17Factory();

            return SupaClient::fromArray(
                [
                    'apiKey' => config('services.supaship.api_key'),
                    'environment' => app()->environment(),
                    'features' => config('supaship.features', []),
                    'context' => [],
                ],
                new Psr18Client(),
                $psr17,
                $psr17
            );
        });
    }
}
```

### CodeIgniter

```php
<?php

use Nyholm\Psr7\Factory\Psr17Factory;
use Supaship\Sdk\SupaClient;
use Symfony\Component\HttpClient\Psr18Client;

function supaship_client(): SupaClient
{
    $psr17 = new Psr17Factory();

    return SupaClient::fromArray(
        [
            'apiKey' => getenv('SUPASHIP_API_KEY'),
            'environment' => ENVIRONMENT,
            'features' => ['new-ui' => false],
            'context' => [],
        ],
        new Psr18Client(),
        $psr17,
        $psr17
    );
}
```

### WordPress

```php
<?php

use Nyholm\Psr7\Factory\Psr17Factory;
use Supaship\Sdk\SupaClient;
use Symfony\Component\HttpClient\Psr18Client;

function supaship_wp_client(): SupaClient
{
    static $client = null;
    if ($client instanceof SupaClient) {
        return $client;
    }

    $psr17 = new Psr17Factory();
    $client = SupaClient::fromArray(
        [
            'apiKey' => defined('SUPASHIP_API_KEY') ? SUPASHIP_API_KEY : '',
            'environment' => wp_get_environment_type(),
            'features' => ['new-block' => false],
            'context' => ['wpUserId' => get_current_user_id()],
        ],
        new Psr18Client(),
        $psr17,
        $psr17
    );

    return $client;
}
```

### Standalone PHP

```php
<?php

use Nyholm\Psr7\Factory\Psr17Factory;
use Supaship\Sdk\SupaClient;
use Symfony\Component\HttpClient\Psr18Client;

$psr17 = new Psr17Factory();
$client = SupaClient::fromArray(
    [
        'apiKey' => $_ENV['SUPASHIP_API_KEY'],
        'environment' => 'production',
        'features' => ['new-ui' => false],
        'context' => ['userId' => 'anon'],
    ],
    new Psr18Client(),
    $psr17,
    $psr17
);
```

## Testing

From `packages/php`:

```bash
composer install
composer test
composer test:coverage
```

## Publish

From `packages/php`:

```bash
./scripts/publish.sh
```

This validates Composer metadata, runs tests, and prints release steps for Packagist.

## License

MIT
