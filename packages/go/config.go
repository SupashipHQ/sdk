package supaship

import (
	"net/http"
	"time"
)

// config holds the resolved configuration for a Client.
type config struct {
	defaultContext       EvalContext
	sensitiveKeys        []string
	networkConfig        NetworkConfig
	plugins              []Plugin
}

// Option is a functional option for configuring a Client.
type Option func(*config)

// WithContext sets the default evaluation context included with every request.
// Per-call contexts are merged on top of this value.
func WithContext(ctx EvalContext) Option {
	return func(c *config) {
		c.defaultContext = ctx
	}
}

// WithSensitiveKeys registers context keys whose values will be SHA-256 hashed
// before being sent to the Supaship API.
func WithSensitiveKeys(keys ...string) Option {
	return func(c *config) {
		c.sensitiveKeys = append(c.sensitiveKeys, keys...)
	}
}

// WithNetworkConfig replaces the network configuration entirely.
// Unset fields fall back to their defaults.
func WithNetworkConfig(nc NetworkConfig) Option {
	return func(c *config) {
		c.networkConfig = nc
	}
}

// WithPlugins registers one or more plugins with the client.
func WithPlugins(plugins ...Plugin) Option {
	return func(c *config) {
		c.plugins = append(c.plugins, plugins...)
	}
}

// WithHTTPClient replaces the underlying *http.Client used for all requests.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *config) {
		c.networkConfig.HTTPClient = hc
	}
}

// WithTimeout sets the per-request deadline.
func WithTimeout(d time.Duration) Option {
	return func(c *config) {
		c.networkConfig.Timeout = d
	}
}

// WithRetry configures automatic retry behavior.
func WithRetry(rc RetryConfig) Option {
	return func(c *config) {
		c.networkConfig.Retry = rc
	}
}

// WithFeaturesURL overrides the feature evaluation endpoint.
func WithFeaturesURL(url string) Option {
	return func(c *config) {
		c.networkConfig.FeaturesURL = url
	}
}

// WithEventsURL overrides the analytics events endpoint.
func WithEventsURL(url string) Option {
	return func(c *config) {
		c.networkConfig.EventsURL = url
	}
}

// resolveConfig applies options over built-in defaults and returns a ready-to-use config.
func resolveConfig(opts []Option) config {
	cfg := config{
		networkConfig: NetworkConfig{
			FeaturesURL: DefaultFeaturesURL,
			EventsURL:   DefaultEventsURL,
			Timeout:     time.Duration(defaultTimeout) * time.Second,
			Retry: RetryConfig{
				Enabled:     true,
				MaxAttempts: defaultMaxAttempts,
				Backoff:     time.Duration(defaultBackoff) * time.Millisecond,
			},
			HTTPClient: &http.Client{},
		},
	}

	for _, opt := range opts {
		opt(&cfg)
	}

	// Fill in any zero-value network fields with defaults after options are applied.
	if cfg.networkConfig.FeaturesURL == "" {
		cfg.networkConfig.FeaturesURL = DefaultFeaturesURL
	}
	if cfg.networkConfig.EventsURL == "" {
		cfg.networkConfig.EventsURL = DefaultEventsURL
	}
	if cfg.networkConfig.Timeout == 0 {
		cfg.networkConfig.Timeout = time.Duration(defaultTimeout) * time.Second
	}
	if cfg.networkConfig.HTTPClient == nil {
		cfg.networkConfig.HTTPClient = &http.Client{}
	}
	if cfg.networkConfig.Retry.MaxAttempts == 0 {
		cfg.networkConfig.Retry.MaxAttempts = defaultMaxAttempts
	}
	if cfg.networkConfig.Retry.Backoff == 0 {
		cfg.networkConfig.Retry.Backoff = time.Duration(defaultBackoff) * time.Millisecond
	}

	return cfg
}
