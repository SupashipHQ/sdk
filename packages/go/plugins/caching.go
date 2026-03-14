package plugins

import (
	"errors"
	"sync"
	"time"

	supaship "github.com/supashiphq/go-sdk"
)

// errCacheHit is returned by BeforeGetFeatures to signal a cache hit and
// short-circuit the network request.
var errCacheHit = errors.New("supaship: cache hit")

// CachingPlugin caches feature evaluation results in memory with a configurable
// TTL. On a cache hit it returns the cached results via BeforeGetFeatures and
// populates the result set, preventing the network request from being made.
//
// Results are stored after a successful AfterGetFeatures call.
type CachingPlugin struct {
	ttl   time.Duration
	mu    sync.RWMutex
	store map[string]cacheEntry
}

type cacheEntry struct {
	results   map[string]supaship.FeatureValue
	expiresAt time.Time
}

// NewCachingPlugin creates a CachingPlugin with the given TTL.
// A TTL of 0 uses a default of 60 seconds.
func NewCachingPlugin(ttl time.Duration) *CachingPlugin {
	if ttl == 0 {
		ttl = 60 * time.Second
	}
	return &CachingPlugin{
		ttl:   ttl,
		store: make(map[string]cacheEntry),
	}
}

func (c *CachingPlugin) Name() string { return "supaship.caching" }

// BeforeGetFeatures checks whether all requested features are cached and fresh.
// If they are, it returns errCacheHit so the client skips the network request.
// The client treats errCacheHit specially: it populates results from the cache
// rather than serving fallbacks.
//
// Note: the cache key is derived from the sorted feature names only; context
// differences are intentionally not part of the key to keep things simple.
// Override this plugin for context-aware caching.
func (c *CachingPlugin) BeforeGetFeatures(names []string, _ supaship.EvalContext) error {
	key := cacheKey(names)

	c.mu.RLock()
	entry, ok := c.store[key]
	c.mu.RUnlock()

	if ok && time.Now().Before(entry.expiresAt) {
		return errCacheHit
	}
	return nil
}

// AfterGetFeatures stores a fresh set of results in the cache.
func (c *CachingPlugin) AfterGetFeatures(results map[string]supaship.FeatureValue, _ supaship.EvalContext) {
	// Build a copy of the names slice from results keys for the cache key.
	names := make([]string, 0, len(results))
	for k := range results {
		names = append(names, k)
	}
	key := cacheKey(names)

	clone := make(map[string]supaship.FeatureValue, len(results))
	for k, v := range results {
		clone[k] = v
	}

	c.mu.Lock()
	c.store[key] = cacheEntry{
		results:   clone,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()
}

// GetCachedFeatures implements supaship.CacheProvider. The client calls this
// after BeforeGetFeatures signals a cache hit to retrieve the stored values.
func (c *CachingPlugin) GetCachedFeatures(names []string) (map[string]supaship.FeatureValue, bool) {
	return c.GetCached(names)
}

// GetCached returns the cached result for the given feature names, if present
// and not expired. A second return value indicates whether the entry was found.
func (c *CachingPlugin) GetCached(names []string) (map[string]supaship.FeatureValue, bool) {
	key := cacheKey(names)

	c.mu.RLock()
	entry, ok := c.store[key]
	c.mu.RUnlock()

	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}

	clone := make(map[string]supaship.FeatureValue, len(entry.results))
	for k, v := range entry.results {
		clone[k] = v
	}
	return clone, true
}

// Invalidate removes a cache entry for the given feature names.
func (c *CachingPlugin) Invalidate(names []string) {
	c.mu.Lock()
	delete(c.store, cacheKey(names))
	c.mu.Unlock()
}

// InvalidateAll removes all cached entries.
func (c *CachingPlugin) InvalidateAll() {
	c.mu.Lock()
	c.store = make(map[string]cacheEntry)
	c.mu.Unlock()
}

// IsCacheHit reports whether err signals a cache hit.
func IsCacheHit(err error) bool {
	return errors.Is(err, errCacheHit)
}

// cacheKey produces a stable string key from an unordered list of feature names.
func cacheKey(names []string) string {
	// Sort a copy to guarantee stability regardless of call order.
	sorted := make([]string, len(names))
	copy(sorted, names)
	sortStrings(sorted)

	key := ""
	for i, n := range sorted {
		if i > 0 {
			key += "|"
		}
		key += n
	}
	return key
}

// sortStrings is a minimal insertion sort to avoid importing "sort" only for this.
func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}
