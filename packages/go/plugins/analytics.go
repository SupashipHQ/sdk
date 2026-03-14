package plugins

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	supaship "github.com/supashiphq/go-sdk"
)

// EventType classifies the kind of analytics event being recorded.
type EventType string

const (
	EventTypeImpression EventType = "impression"
	EventTypeConversion EventType = "conversion"

	defaultBatchSize     = 100
	defaultFlushInterval = 5 * time.Second
)

// Event is a single analytics event sent to the Supaship events API.
type Event struct {
	Type        EventType            `json:"type"`
	FeatureName string               `json:"featureName"`
	Variation   supaship.FeatureValue `json:"variation"`
	Context     supaship.EvalContext  `json:"context,omitempty"`
	Timestamp   time.Time            `json:"timestamp"`
}

// AnalyticsConfig controls how the AnalyticsPlugin batches and flushes events.
type AnalyticsConfig struct {
	// Endpoint is the URL to POST event batches to.
	// Defaults to supaship.DefaultEventsURL.
	Endpoint string
	// BatchSize is the maximum number of events per flush. Defaults to 100.
	BatchSize int
	// FlushInterval is how often the background goroutine flushes. Defaults to 5 s.
	FlushInterval time.Duration
	// HTTPClient is used for flush requests. Defaults to http.DefaultClient.
	HTTPClient *http.Client
}

// AnalyticsPlugin batches feature impression and conversion events and
// periodically flushes them to the Supaship events API.
//
// Always call Close() before process exit to flush pending events.
type AnalyticsPlugin struct {
	cfg    AnalyticsConfig
	ch     chan Event
	done   chan struct{}
	wg     sync.WaitGroup
	closeOnce sync.Once
}

// NewAnalyticsPlugin creates and starts an AnalyticsPlugin.
// The background flush goroutine is started immediately.
func NewAnalyticsPlugin(cfg AnalyticsConfig) *AnalyticsPlugin {
	if cfg.Endpoint == "" {
		cfg.Endpoint = supaship.DefaultEventsURL
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = defaultBatchSize
	}
	if cfg.FlushInterval <= 0 {
		cfg.FlushInterval = defaultFlushInterval
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = http.DefaultClient
	}

	p := &AnalyticsPlugin{
		cfg:  cfg,
		ch:   make(chan Event, cfg.BatchSize*2),
		done: make(chan struct{}),
	}

	p.wg.Add(1)
	go p.flushLoop()

	return p
}

func (a *AnalyticsPlugin) Name() string { return "supaship.analytics" }

// AfterGetFeatures records an impression event for each evaluated flag.
func (a *AnalyticsPlugin) AfterGetFeatures(results map[string]supaship.FeatureValue, ctx supaship.EvalContext) {
	for name, variation := range results {
		a.track(Event{
			Type:        EventTypeImpression,
			FeatureName: name,
			Variation:   variation,
			Context:     ctx,
			Timestamp:   time.Now(),
		})
	}
}

// TrackConversion records a conversion event for the named feature.
func (a *AnalyticsPlugin) TrackConversion(featureName string, variation supaship.FeatureValue, ctx supaship.EvalContext) {
	a.track(Event{
		Type:        EventTypeConversion,
		FeatureName: featureName,
		Variation:   variation,
		Context:     ctx,
		Timestamp:   time.Now(),
	})
}

// Close flushes any pending events and stops the background goroutine.
// It is safe to call Close multiple times.
func (a *AnalyticsPlugin) Close() {
	a.closeOnce.Do(func() {
		close(a.done)
		a.wg.Wait()
	})
}

func (a *AnalyticsPlugin) track(e Event) {
	select {
	case a.ch <- e:
	default:
		// Drop the event rather than block the caller if the channel is full.
	}
}

func (a *AnalyticsPlugin) flushLoop() {
	defer a.wg.Done()

	ticker := time.NewTicker(a.cfg.FlushInterval)
	defer ticker.Stop()

	batch := make([]Event, 0, a.cfg.BatchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := a.send(batch); err != nil {
			// Re-queue events (best-effort; drop if channel full).
			for _, e := range batch {
				select {
				case a.ch <- e:
				default:
				}
			}
		}
		batch = batch[:0]
	}

	for {
		select {
		case e := <-a.ch:
			batch = append(batch, e)
			if len(batch) >= a.cfg.BatchSize {
				flush()
			}

		case <-ticker.C:
			flush()

		case <-a.done:
			// Drain remaining events from the channel.
			for {
				select {
				case e := <-a.ch:
					batch = append(batch, e)
				default:
					flush()
					return
				}
			}
		}
	}
}

func (a *AnalyticsPlugin) send(events []Event) error {
	body, err := json.Marshal(map[string]any{"events": events})
	if err != nil {
		return fmt.Errorf("supaship analytics: marshal events: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.Endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("supaship analytics: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.cfg.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("supaship analytics: send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("supaship analytics: non-2xx response: %d", resp.StatusCode)
	}
	return nil
}
