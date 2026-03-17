# Supaship Go SDK

Server-side Go SDK for evaluating [Supaship](https://supaship.com) feature flags. Built for Go 1.21+ with zero external dependencies.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Feature Evaluation](#feature-evaluation)
6. [Context Management](#context-management)
7. [Sensitive Context Hashing](#sensitive-context-hashing)
8. [Plugin System](#plugin-system)
   - [Built-in Plugins](#built-in-plugins)
   - [Writing a Custom Plugin](#writing-a-custom-plugin)
9. [Error Handling](#error-handling)
10. [Retry & Timeout Behavior](#retry--timeout-behavior)
11. [Thread Safety](#thread-safety)
12. [Full Example](#full-example)

---

## Overview

The Supaship Go SDK evaluates feature flags by calling the Supaship edge API. Key characteristics:

- **Always returns a value** — on any network error the SDK returns the configured fallback value alongside the error, so your server never panics or returns zero-values unexpectedly.
- **`context.Context` throughout** — every evaluation call respects cancellation and deadlines.
- **Zero external dependencies** — the entire SDK uses only the Go standard library.
- **Plugin system** — observability, caching, logging, and analytics are implemented as optional plugins without touching the core client.
- **Thread-safe** — safe to share a single `*Client` across goroutines.

---

## Installation

```bash
go get github.com/supashiphq/go-sdk
```

Requires **Go 1.21** or later.

---

## Quick Start

```go
package main

import (
    "context"
    "log"

    supaship "github.com/supashiphq/go-sdk"
)

func main() {
    // 1. Declare your feature flags with fallback values.
    features := map[string]supaship.FeatureValue{
        "dark-mode":      false,
        "max-page-size":  100,
        "checkout-v2":    false,
        "ui-config":      map[string]any{"theme": "light", "density": "compact"},
    }

    // 2. Create the client (one instance per process is recommended).
    client := supaship.New("YOUR_API_KEY", "production", features,
        supaship.WithContext(supaship.EvalContext{
            "region": "us-east-1",
        }),
    )

    ctx := context.Background()

    // 3. Evaluate a single flag.
    val, err := client.GetFeature(ctx, "dark-mode")
    if err != nil {
        log.Println("evaluation failed, using fallback:", err)
    }
    darkMode, _ := val.(bool)
    log.Println("dark-mode:", darkMode)

    // 4. Evaluate multiple flags in one request.
    vals, err := client.GetFeatures(ctx, []string{"checkout-v2", "max-page-size"})
    if err != nil {
        log.Println("evaluation failed, using fallbacks:", err)
    }
    log.Println("checkout-v2:", vals["checkout-v2"])
    log.Println("max-page-size:", vals["max-page-size"])
}
```

---

## Configuration

The client is configured entirely through **functional options** passed as variadic arguments to `supaship.New`.

```go
client := supaship.New(apiKey, environment, features,
    supaship.WithContext(ctx),
    supaship.WithSensitiveKeys("userId", "email"),
    supaship.WithNetworkConfig(supaship.NetworkConfig{...}),
    supaship.WithPlugins(...),
    supaship.WithTimeout(5 * time.Second),
    supaship.WithRetry(supaship.RetryConfig{...}),
    supaship.WithHTTPClient(myHTTPClient),
    supaship.WithFeaturesURL("https://my-proxy/v1/features"),
    supaship.WithEventsURL("https://my-proxy/v1/events"),
)
```

### Available Options

| Option                       | Description                                          | Default                                 |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `WithContext(ctx)`           | Default evaluation context merged into every request | `nil`                                   |
| `WithSensitiveKeys(keys...)` | Context keys to SHA-256 hash before sending          | none                                    |
| `WithNetworkConfig(nc)`      | Full `NetworkConfig` override                        | see below                               |
| `WithPlugins(plugins...)`    | Register one or more plugins                         | none                                    |
| `WithHTTPClient(hc)`         | Replace the underlying `*http.Client`                | `&http.Client{}`                        |
| `WithTimeout(d)`             | Per-request deadline                                 | `10s`                                   |
| `WithRetry(rc)`              | Retry configuration                                  | enabled, 3 attempts, 1 s backoff        |
| `WithFeaturesURL(url)`       | Override the feature evaluation endpoint             | `https://edge.supaship.com/v1/features` |
| `WithEventsURL(url)`         | Override the analytics events endpoint               | `https://edge.supaship.com/v1/events`   |

### NetworkConfig

```go
supaship.WithNetworkConfig(supaship.NetworkConfig{
    FeaturesURL: "https://edge.supaship.com/v1/features",
    EventsURL:   "https://edge.supaship.com/v1/events",
    Timeout:     5 * time.Second,
    HTTPClient:  myHTTPClient,
    Retry: supaship.RetryConfig{
        Enabled:     true,
        MaxAttempts: 3,
        Backoff:     500 * time.Millisecond, // base delay; doubles each attempt
    },
})
```

### RetryConfig

| Field         | Type            | Default | Description                                    |
| ------------- | --------------- | ------- | ---------------------------------------------- |
| `Enabled`     | `bool`          | `true`  | Enables automatic retry on failure             |
| `MaxAttempts` | `int`           | `3`     | Total attempts (1 initial + N-1 retries)       |
| `Backoff`     | `time.Duration` | `1s`    | Base delay; grows as `backoff × 2^(attempt-1)` |

---

## Feature Evaluation

### `GetFeature`

Evaluates a single feature flag. Always returns a value — the fallback is used when the API is unavailable.

```go
val, err := client.GetFeature(ctx, "dark-mode")
if err != nil {
    // Network error or non-2xx response. val == configured fallback.
    log.Println("using fallback:", err)
}
darkMode, ok := val.(bool)
```

### `GetFeatures`

Evaluates multiple flags in a single API request.

```go
vals, err := client.GetFeatures(ctx, []string{"checkout-v2", "max-page-size", "ui-config"})
```

`vals` is always a `map[string]FeatureValue` — missing keys use their fallback values.

### Per-call Context Override

Override or augment the default context for a single call without mutating the client:

```go
val, err := client.GetFeature(ctx, "premium-feature",
    supaship.WithRequestContext(supaship.EvalContext{
        "userId": req.UserID,
        "plan":   "enterprise",
    }),
)
```

The per-call context is **merged on top of** the client's default context.

### Feature Value Types

Feature flag values can be any JSON-compatible type:

| Go type          | Example             | Use case                   |
| ---------------- | ------------------- | -------------------------- |
| `bool`           | `false`             | Simple on/off flags        |
| `float64`        | `100`               | Numeric limits, thresholds |
| `string`         | `"v2"`              | Variants, algorithm names  |
| `map[string]any` | `{"theme": "dark"}` | Structured configuration   |
| `[]any`          | `["a", "b"]`        | Allow-lists                |
| `nil`            | `nil`               | Disabled state             |

Type-assert the return value to use it:

```go
if uiConfig, ok := vals["ui-config"].(map[string]any); ok {
    theme, _ := uiConfig["theme"].(string)
}
```

---

## Context Management

The evaluation context supplies targeting attributes (user ID, plan, region, etc.) that the Supaship rules engine uses to determine which variation to serve.

### Default Context

Set a default context at construction time. It is included in every request:

```go
client := supaship.New(apiKey, env, features,
    supaship.WithContext(supaship.EvalContext{
        "region":  "eu-west-1",
        "version": "2.4.0",
    }),
)
```

### Updating the Default Context

Update the default context at runtime. The `merge` parameter controls whether the new values are merged with or replace the existing context:

```go
// Merge new keys on top of existing ones.
client.UpdateContext(supaship.EvalContext{"plan": "pro"}, true)

// Replace the entire default context.
client.UpdateContext(supaship.EvalContext{"userId": "u_123"}, false)
```

### Retrieving the Current Context

```go
ctx := client.GetContext() // returns a snapshot copy; safe to mutate
```

### Per-call Context

For request-scoped attributes, pass a per-call context via `WithRequestContext`. It is merged on top of the default context for that call only:

```go
val, _ := client.GetFeature(httpCtx, "feature",
    supaship.WithRequestContext(supaship.EvalContext{"userId": userID}),
)
```

---

## Sensitive Context Hashing

Context fields that contain personally identifiable information (PII) can be automatically SHA-256 hashed before being sent to the API:

```go
client := supaship.New(apiKey, env, features,
    supaship.WithSensitiveKeys("userId", "email", "ipAddress"),
    supaship.WithContext(supaship.EvalContext{
        "userId": "u_abc123",
        "email":  "user@example.com",
        "plan":   "pro",           // not hashed — still sent as-is
    }),
)
```

The value of each sensitive key is converted to its string representation and hashed using `crypto/sha256`. The original value never leaves the process. Hashing is deterministic, so the Supaship targeting rules can still match on hashed values if configured to do so.

---

## Plugin System

Plugins let you observe and extend the client without modifying core logic. They are registered at construction time and called synchronously in registration order.

### Plugin Interface

Every plugin must implement the base `Plugin` interface:

```go
type Plugin interface {
    Name() string
}
```

To receive lifecycle events, implement one or more of the optional hook interfaces:

| Interface           | Method                                                               | When called                                                     |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `OnIniter`          | `OnInit(InitInfo)`                                                   | Once, when the client is created                                |
| `BeforeGetter`      | `BeforeGetFeatures(names []string, ctx EvalContext) error`           | Before each evaluation request; return non-nil to short-circuit |
| `AfterGetter`       | `AfterGetFeatures(results map[string]FeatureValue, ctx EvalContext)` | After a successful evaluation                                   |
| `OnErrorer`         | `OnError(err error, ctx EvalContext)`                                | On any evaluation error                                         |
| `BeforeRequester`   | `BeforeRequest(url string, body []byte, headers map[string]string)`  | Before the HTTP request is sent                                 |
| `AfterResponser`    | `AfterResponse(statusCode int, duration time.Duration)`              | After the HTTP response is received                             |
| `OnContextUpdater`  | `OnContextUpdate(old, new EvalContext, source string)`               | When `UpdateContext` is called                                  |
| `OnRetryAttemptter` | `OnRetryAttempt(attempt int, err error, willRetry bool)`             | On each retry attempt                                           |
| `OnFallbackUser`    | `OnFallbackUsed(name string, fallback FeatureValue, err error)`      | When a fallback value is served                                 |

Only implement the interfaces you need — the client checks each plugin at runtime.

---

### Built-in Plugins

All built-in plugins live in the `plugins` sub-package:

```go
import "github.com/supashiphq/go-sdk/plugins"
```

#### LoggingPlugin

Structured logging via `log/slog`. Logs evaluations, errors, retries, and fallback usage.

```go
import (
    "log/slog"
    "github.com/supashiphq/go-sdk/plugins"
)

logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelDebug,
}))

client := supaship.New(apiKey, env, features,
    supaship.WithPlugins(plugins.NewLoggingPlugin(logger)),
)
```

Pass `nil` to use `slog.Default()`.

#### CachingPlugin

In-memory cache with a configurable TTL. On a cache hit `BeforeGetFeatures` returns an error that short-circuits the network request.

```go
cache := plugins.NewCachingPlugin(60 * time.Second)

client := supaship.New(apiKey, env, features,
    supaship.WithPlugins(cache),
)

// Manual invalidation:
cache.Invalidate([]string{"dark-mode"})
cache.InvalidateAll()

// Check if an error was a cache hit (useful in middleware):
if plugins.IsCacheHit(err) {
    // result came from cache
}
```

**Note:** The cache key is derived from the feature names only, not the evaluation context. For context-aware caching, implement a custom plugin.

#### AnalyticsPlugin

Batches impression and conversion events and flushes them to the Supaship events API in the background.

```go
analytics := plugins.NewAnalyticsPlugin(plugins.AnalyticsConfig{
    Endpoint:      supaship.DefaultEventsURL,
    BatchSize:     50,
    FlushInterval: 10 * time.Second,
})

client := supaship.New(apiKey, env, features,
    supaship.WithPlugins(analytics),
)

// Record a conversion event manually:
analytics.TrackConversion("checkout-v2", true, supaship.EvalContext{"userId": userID})

// Flush and stop the background goroutine before process exit:
defer analytics.Close()
```

---

### Writing a Custom Plugin

Implement `Plugin` plus any hook interfaces you need:

```go
type MetricsPlugin struct {
    requestCount atomic.Int64
    errorCount   atomic.Int64
}

func (m *MetricsPlugin) Name() string { return "myapp.metrics" }

func (m *MetricsPlugin) BeforeGetFeatures(_ []string, _ supaship.EvalContext) error {
    m.requestCount.Add(1)
    return nil // return non-nil to short-circuit (e.g. circuit breaker)
}

func (m *MetricsPlugin) OnError(_ error, _ supaship.EvalContext) {
    m.errorCount.Add(1)
}

// Register:
client := supaship.New(apiKey, env, features,
    supaship.WithPlugins(&MetricsPlugin{}),
)
```

---

## Error Handling

The SDK follows Go conventions: errors are returned, not panicked.

**`GetFeature` and `GetFeatures` always return a value** — when an error occurs, the configured fallback for each flag is used. This means your server code can safely discard the error if degraded operation is acceptable:

```go
// Ignore the error — val is always the fallback on failure.
val, _ := client.GetFeature(ctx, "new-feature")

// Or inspect the error for logging/alerting:
val, err := client.GetFeature(ctx, "new-feature")
if err != nil {
    metrics.Increment("feature_flag.error")
    log.Warn("feature eval failed", "err", err, "fallback", val)
}
```

**Common error scenarios:**

| Scenario                     | Behavior                                                 |
| ---------------------------- | -------------------------------------------------------- |
| Network timeout              | Returns fallback; error wraps `context.DeadlineExceeded` |
| `ctx` cancelled              | Returns fallback; error wraps `context.Canceled`         |
| Non-2xx HTTP response        | Returns fallback; error contains status code and body    |
| Invalid JSON response        | Returns fallback; error wraps `json.SyntaxError`         |
| All retry attempts exhausted | Returns fallback; last error is returned                 |

---

## Retry & Timeout Behavior

Retries use **exponential backoff**: the delay between attempts doubles each time.

```
Attempt 1 → fail → wait 1s
Attempt 2 → fail → wait 2s
Attempt 3 → fail → return error + fallback
```

The backoff base and number of attempts are configurable:

```go
supaship.WithRetry(supaship.RetryConfig{
    Enabled:     true,
    MaxAttempts: 5,
    Backoff:     200 * time.Millisecond, // delays: 200ms, 400ms, 800ms, 1.6s
})
```

Context cancellation is respected between retry attempts — if `ctx` is cancelled while waiting for the next attempt, the retry loop exits immediately.

Each attempt also enforces its own per-request timeout (set via `WithTimeout`). The timeout applies independently of the overall context deadline.

---

## Thread Safety

All `Client` methods are safe for concurrent use. A single `*Client` instance should be created once at startup (ideally as a process-level singleton) and shared across all goroutines and HTTP handlers.

```go
// main.go
var featureClient *supaship.Client

func main() {
    featureClient = supaship.New(os.Getenv("SUPASHIP_API_KEY"), "production", features)
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}

func handler(w http.ResponseWriter, r *http.Request) {
    val, _ := featureClient.GetFeature(r.Context(), "new-ui",
        supaship.WithRequestContext(supaship.EvalContext{
            "userId": r.Header.Get("X-User-ID"),
        }),
    )
    // ...
}
```

Internal state (default context) is protected by a `sync.RWMutex`. Plugin hooks are called with no locks held, so plugins may themselves be concurrent-safe if needed.

---

## Full Example

```go
package main

import (
    "context"
    "log"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    supaship "github.com/supashiphq/go-sdk"
    "github.com/supashiphq/go-sdk/plugins"
)

var features = map[string]supaship.FeatureValue{
    "new-checkout":  false,
    "max-items":     50,
    "ui-config":     map[string]any{"theme": "light"},
    "beta-features": false,
}

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))

    analytics := plugins.NewAnalyticsPlugin(plugins.AnalyticsConfig{
        BatchSize:     100,
        FlushInterval: 10 * time.Second,
    })
    defer analytics.Close()

    cache := plugins.NewCachingPlugin(30 * time.Second)

    client := supaship.New(
        os.Getenv("SUPASHIP_API_KEY"),
        "production",
        features,
        supaship.WithContext(supaship.EvalContext{
            "service": "checkout-api",
            "version": "3.1.0",
        }),
        supaship.WithSensitiveKeys("userId", "email"),
        supaship.WithTimeout(5*time.Second),
        supaship.WithRetry(supaship.RetryConfig{
            Enabled:     true,
            MaxAttempts: 3,
            Backoff:     500 * time.Millisecond,
        }),
        supaship.WithPlugins(
            plugins.NewLoggingPlugin(logger),
            cache,
            analytics,
        ),
    )

    mux := http.NewServeMux()
    mux.HandleFunc("/checkout", func(w http.ResponseWriter, r *http.Request) {
        userID := r.Header.Get("X-User-ID")

        val, err := client.GetFeature(r.Context(), "new-checkout",
            supaship.WithRequestContext(supaship.EvalContext{
                "userId": userID,
            }),
        )
        if err != nil {
            logger.Error("feature flag error", slog.String("err", err.Error()))
        }

        if enabled, _ := val.(bool); enabled {
            // serve new checkout
            w.Write([]byte("new checkout"))
        } else {
            // serve legacy checkout
            w.Write([]byte("legacy checkout"))
        }

        // Track a conversion when the user completes checkout.
        analytics.TrackConversion("new-checkout", val, supaship.EvalContext{"userId": userID})
    })

    srv := &http.Server{Addr: ":8080", Handler: mux}

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        logger.Info("server started", slog.String("addr", srv.Addr))
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    <-stop

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
    logger.Info("server stopped")
}
```

---

## Publishing a New Release

The `scripts/publish.sh` script handles pre-flight checks, git tagging, and proxy warm-up:

```bash
# Interactive (prompts for version)
./scripts/publish.sh

# Non-interactive
./scripts/publish.sh v0.2.0

# Dry run — validates without creating any tags
./scripts/publish.sh v0.2.0 --dry-run
```

The script will:

1. Validate the version is valid semver (`vMAJOR.MINOR.PATCH`)
2. Verify the working tree is clean
3. Run `go vet ./...` and `go build ./...`
4. Run `go test ./...` if test files are present
5. Prompt for confirmation
6. Create an annotated git tag (`packages/go/vX.Y.Z`) and push it to origin
7. Warm up the Go module proxy so the version is immediately fetchable

**Module versioning note:** Because the SDK lives at `packages/go/` inside the `supashiphq/sdk` monorepo, Go module proxy expects tags prefixed with the subdirectory path (e.g. `packages/go/v0.2.0`). The module import path is therefore `github.com/supashiphq/sdk/packages/go`. If you later move the module to its own repository (`github.com/supashiphq/go-sdk`), use plain `vX.Y.Z` tags instead.

---

## License

MIT — see [LICENSE](../../LICENSE).
