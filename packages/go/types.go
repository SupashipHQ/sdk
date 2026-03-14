package supaship

import (
	"net/http"
	"time"
)

// FeatureValue is the type of a feature flag value returned by the API.
// It can be a bool, map[string]any, []any, or nil.
type FeatureValue = any

// EvalContext is a set of key-value pairs sent with feature evaluation
// requests to influence flag targeting rules.
type EvalContext = map[string]any

// NetworkConfig controls how the client communicates with the Supaship API.
type NetworkConfig struct {
	// FeaturesURL overrides the default feature evaluation endpoint.
	FeaturesURL string
	// EventsURL overrides the default analytics events endpoint.
	EventsURL string
	// Retry configures automatic retry behavior on transient failures.
	Retry RetryConfig
	// Timeout is the per-request deadline. Defaults to 10 seconds.
	Timeout time.Duration
	// HTTPClient replaces the default http.Client (useful for proxies, custom TLS, etc.).
	HTTPClient *http.Client
}

// RetryConfig controls automatic retry with exponential backoff.
type RetryConfig struct {
	// Enabled toggles retry. Defaults to true.
	Enabled bool
	// MaxAttempts is the total number of attempts (initial + retries). Defaults to 3.
	MaxAttempts int
	// Backoff is the base delay between attempts. Doubles on each retry. Defaults to 1 s.
	Backoff time.Duration
}

// InitInfo is passed to plugins when the client is created.
type InitInfo struct {
	// ClientID is a unique identifier for this client instance.
	ClientID string
	// AvailableFeatures maps each feature name to its configured fallback value.
	AvailableFeatures map[string]FeatureValue
	// DefaultContext is the default evaluation context, if any.
	DefaultContext EvalContext
}

// RequestOptions carries per-call overrides that merge with the client defaults.
type RequestOptions struct {
	// Context overrides or augments the client-level default context for this call.
	Context EvalContext
}

// RequestOption is a functional option applied to a single GetFeature/GetFeatures call.
type RequestOption func(*RequestOptions)

// WithRequestContext merges ctx into the client's default context for a single call.
func WithRequestContext(ctx EvalContext) RequestOption {
	return func(o *RequestOptions) {
		o.Context = ctx
	}
}
