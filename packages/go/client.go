// Package supaship provides a Go server SDK for evaluating Supaship feature flags.
//
// # Quick start
//
//	features := map[string]supaship.FeatureValue{
//	    "dark-mode":   false,
//	    "max-retries": 3,
//	    "ui-config":   map[string]any{"theme": "light"},
//	}
//
//	client := supaship.New("YOUR_API_KEY", "production", features,
//	    supaship.WithContext(supaship.EvalContext{"region": "us-east-1"}),
//	)
//
//	val, err := client.GetFeature(ctx, "dark-mode")
//	if err != nil {
//	    // val still holds the configured fallback
//	    log.Println("feature eval failed, using fallback:", err)
//	}
//	darkMode, _ := val.(bool)
package supaship

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Client evaluates Supaship feature flags. All methods are safe for concurrent use.
type Client struct {
	apiKey      string
	environment string
	features    map[string]FeatureValue // name → fallback value
	sensitiveKeys []string
	plugins     []Plugin
	clientID    string

	mu             sync.RWMutex
	defaultContext EvalContext

	netCfg NetworkConfig
}

// New creates a new Client.
//
//   - apiKey: secret key from your Supaship project settings.
//   - environment: e.g. "production", "staging".
//   - features: map of feature names to their fallback values (used when the API
//     is unavailable or a flag is missing from the response).
//   - opts: zero or more functional options (WithContext, WithPlugins, …).
func New(apiKey, environment string, features map[string]FeatureValue, opts ...Option) *Client {
	cfg := resolveConfig(opts)

	c := &Client{
		apiKey:         apiKey,
		environment:    environment,
		features:       features,
		sensitiveKeys:  cfg.sensitiveKeys,
		plugins:        cfg.plugins,
		clientID:       generateClientID(),
		defaultContext: cfg.defaultContext,
		netCfg:         cfg.networkConfig,
	}

	// Notify plugins.
	info := InitInfo{
		ClientID:          c.clientID,
		AvailableFeatures: features,
		DefaultContext:    cfg.defaultContext,
	}
	for _, p := range c.plugins {
		if h, ok := p.(OnIniter); ok {
			h.OnInit(info)
		}
	}

	return c
}

// GetFeature evaluates a single feature flag by name.
// On error the configured fallback value is returned alongside the error so
// callers can proceed safely or inspect the failure.
func (c *Client) GetFeature(ctx context.Context, name string, opts ...RequestOption) (FeatureValue, error) {
	results, err := c.GetFeatures(ctx, []string{name}, opts...)
	if err != nil {
		return c.getFallback(name), err
	}
	return results[name], nil
}

// GetFeatures evaluates multiple feature flags in a single API call.
// Fallback values are used for any flags missing from the response or on error.
func (c *Client) GetFeatures(ctx context.Context, names []string, opts ...RequestOption) (map[string]FeatureValue, error) {
	ro := &RequestOptions{}
	for _, o := range opts {
		o(ro)
	}

	evalCtx := c.mergedContext(ro.Context)
	safeCtx := hashContext(evalCtx, c.sensitiveKeys)

	// BeforeGetFeatures hook — a plugin may short-circuit (e.g. cache hit).
	for _, p := range c.plugins {
		if h, ok := p.(BeforeGetter); ok {
			if err := h.BeforeGetFeatures(names, safeCtx); err != nil {
				// If the plugin also implements CacheProvider, serve cached data.
				if cp, ok := p.(CacheProvider); ok {
					if cached, hit := cp.GetCachedFeatures(names); hit {
						return cached, nil
					}
				}
				// Otherwise return fallbacks and surface the error.
				return c.fallbacksFor(names), err
			}
		}
	}

	results, err := c.fetchFeatures(ctx, names, safeCtx)
	if err != nil {
		for _, p := range c.plugins {
			if h, ok := p.(OnErrorer); ok {
				h.OnError(err, safeCtx)
			}
		}
		fallbacks := c.fallbacksFor(names)
		for name, fb := range fallbacks {
			for _, p := range c.plugins {
				if h, ok := p.(OnFallbackUser); ok {
					h.OnFallbackUsed(name, fb, err)
				}
			}
		}
		return fallbacks, err
	}

	// Merge API results with fallbacks for any missing flags.
	out := c.fallbacksFor(names)
	for k, v := range results {
		out[k] = v
	}

	for _, p := range c.plugins {
		if h, ok := p.(AfterGetter); ok {
			h.AfterGetFeatures(out, safeCtx)
		}
	}

	return out, nil
}

// UpdateContext updates the client's default evaluation context.
// When merge is true the provided map is merged over the existing context;
// when false it replaces it entirely.
func (c *Client) UpdateContext(newCtx EvalContext, merge bool) {
	c.mu.Lock()
	old := cloneContext(c.defaultContext)
	if merge {
		merged := cloneContext(c.defaultContext)
		for k, v := range newCtx {
			merged[k] = v
		}
		c.defaultContext = merged
	} else {
		c.defaultContext = cloneContext(newCtx)
	}
	updated := cloneContext(c.defaultContext)
	c.mu.Unlock()

	for _, p := range c.plugins {
		if h, ok := p.(OnContextUpdater); ok {
			h.OnContextUpdate(old, updated, "updateContext")
		}
	}
}

// GetContext returns a snapshot of the current default evaluation context.
func (c *Client) GetContext() EvalContext {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return cloneContext(c.defaultContext)
}

// GetFallback returns the configured fallback value for the named feature.
func (c *Client) GetFallback(name string) FeatureValue {
	return c.getFallback(name)
}

// --- internal helpers ---

func (c *Client) getFallback(name string) FeatureValue {
	return c.features[name]
}

func (c *Client) fallbacksFor(names []string) map[string]FeatureValue {
	out := make(map[string]FeatureValue, len(names))
	for _, name := range names {
		out[name] = c.getFallback(name)
	}
	return out
}

func (c *Client) mergedContext(perCall EvalContext) EvalContext {
	c.mu.RLock()
	base := cloneContext(c.defaultContext)
	c.mu.RUnlock()

	if len(perCall) == 0 {
		return base
	}
	for k, v := range perCall {
		base[k] = v
	}
	return base
}

// featuresRequest is the JSON body sent to the features API.
type featuresRequest struct {
	Environment string         `json:"environment"`
	Features    []string       `json:"features"`
	Context     EvalContext    `json:"context,omitempty"`
}

// featuresResponse is the JSON body returned by the features API.
type featuresResponse struct {
	Features map[string]struct {
		Variation FeatureValue `json:"variation"`
	} `json:"features"`
}

func (c *Client) fetchFeatures(ctx context.Context, names []string, evalCtx EvalContext) (map[string]FeatureValue, error) {
	payload := featuresRequest{
		Environment: c.environment,
		Features:    names,
		Context:     evalCtx,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("supaship: marshal request: %w", err)
	}

	headers := map[string]string{
		"Authorization": "Bearer " + c.apiKey,
		"Content-Type":  "application/json",
	}

	// BeforeRequest hook.
	for _, p := range c.plugins {
		if h, ok := p.(BeforeRequester); ok {
			h.BeforeRequest(c.netCfg.FeaturesURL, body, headers)
		}
	}

	var respBody []byte

	err = withRetry(ctx, c.netCfg.Retry, func(attempt int) error {
		reqCtx, cancel := context.WithTimeout(ctx, c.netCfg.Timeout)
		defer cancel()

		req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, c.netCfg.FeaturesURL, bytes.NewReader(body))
		if err != nil {
			return fmt.Errorf("supaship: build request: %w", err)
		}
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		start := time.Now()
		resp, err := c.netCfg.HTTPClient.Do(req)
		elapsed := time.Since(start)

		if err != nil {
			return fmt.Errorf("supaship: http request: %w", err)
		}
		defer resp.Body.Close()

		statusCode := resp.StatusCode
		respBody, err = io.ReadAll(resp.Body)

		// AfterResponse hook.
		for _, p := range c.plugins {
			if h, ok := p.(AfterResponser); ok {
				h.AfterResponse(statusCode, elapsed)
			}
		}

		if err != nil {
			return fmt.Errorf("supaship: read response body: %w", err)
		}
		if statusCode < 200 || statusCode >= 300 {
			return fmt.Errorf("supaship: non-2xx response %d: %s", statusCode, respBody)
		}
		return nil
	}, func(attempt int, err error, willRetry bool) {
		for _, p := range c.plugins {
			if h, ok := p.(OnRetryAttemptter); ok {
				h.OnRetryAttempt(attempt, err, willRetry)
			}
		}
	})

	if err != nil {
		return nil, err
	}

	var apiResp featuresResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("supaship: decode response: %w", err)
	}

	out := make(map[string]FeatureValue, len(apiResp.Features))
	for name, entry := range apiResp.Features {
		out[name] = entry.Variation
	}
	return out, nil
}

func cloneContext(ctx EvalContext) EvalContext {
	if ctx == nil {
		return make(EvalContext)
	}
	out := make(EvalContext, len(ctx))
	for k, v := range ctx {
		out[k] = v
	}
	return out
}

func generateClientID() string {
	return fmt.Sprintf("supaship-%d", time.Now().UnixNano())
}
