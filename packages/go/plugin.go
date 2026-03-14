package supaship

import "time"

// Plugin is the base interface that all plugins must implement.
// Plugins interact with the client lifecycle by implementing one or more
// of the optional hook interfaces defined below.
type Plugin interface {
	// Name returns a unique identifier for the plugin, used in logging and diagnostics.
	Name() string
}

// OnIniter is implemented by plugins that need to run initialization logic
// once the client has been created.
type OnIniter interface {
	OnInit(info InitInfo)
}

// BeforeGetter is implemented by plugins that want to observe or intercept
// feature evaluation before the network request is made.
// Returning a non-nil error short-circuits the request and triggers fallback.
type BeforeGetter interface {
	BeforeGetFeatures(names []string, ctx EvalContext) error
}

// AfterGetter is implemented by plugins that want to observe the results of
// a successful feature evaluation.
type AfterGetter interface {
	AfterGetFeatures(results map[string]FeatureValue, ctx EvalContext)
}

// OnErrorer is implemented by plugins that want to observe errors during
// feature evaluation (network failures, non-2xx responses, etc.).
type OnErrorer interface {
	OnError(err error, ctx EvalContext)
}

// BeforeRequester is implemented by plugins that want to inspect or record
// the raw HTTP request before it is sent.
type BeforeRequester interface {
	BeforeRequest(url string, body []byte, headers map[string]string)
}

// AfterResponser is implemented by plugins that want to inspect or record
// the HTTP response after it is received.
type AfterResponser interface {
	AfterResponse(statusCode int, duration time.Duration)
}

// OnContextUpdater is implemented by plugins that want to observe changes
// to the client's default evaluation context.
// source is either "updateContext" (explicit call) or "request" (per-call merge).
type OnContextUpdater interface {
	OnContextUpdate(oldCtx, newCtx EvalContext, source string)
}

// OnRetryAttemptter is implemented by plugins that want to observe each
// retry attempt made during a network request.
type OnRetryAttemptter interface {
	OnRetryAttempt(attempt int, err error, willRetry bool)
}

// OnFallbackUser is implemented by plugins that want to be notified whenever
// a fallback value is served instead of an API-evaluated value.
type OnFallbackUser interface {
	OnFallbackUsed(name string, fallback FeatureValue, err error)
}

// CacheProvider may be implemented alongside BeforeGetter to supply cached
// feature values when a short-circuit occurs. The client checks for this
// interface when BeforeGetFeatures returns a non-nil error; if present, the
// cached map is used instead of the configured fallback values.
type CacheProvider interface {
	GetCachedFeatures(names []string) (map[string]FeatureValue, bool)
}
