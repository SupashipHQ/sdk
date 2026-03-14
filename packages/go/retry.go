package supaship

import (
	"context"
	"time"
)

// retryFunc is the signature of the function passed to withRetry.
type retryFunc func(attempt int) error

// withRetry calls fn up to cfg.MaxAttempts times, applying exponential backoff
// between attempts. It stops early if ctx is cancelled or fn succeeds.
// The onAttempt callback (optional) is called after each failed attempt.
func withRetry(
	ctx context.Context,
	cfg RetryConfig,
	fn retryFunc,
	onAttempt func(attempt int, err error, willRetry bool),
) error {
	if !cfg.Enabled || cfg.MaxAttempts <= 1 {
		return fn(1)
	}

	var lastErr error
	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		lastErr = fn(attempt)
		if lastErr == nil {
			return nil
		}

		willRetry := attempt < cfg.MaxAttempts
		if onAttempt != nil {
			onAttempt(attempt, lastErr, willRetry)
		}

		if !willRetry {
			break
		}

		// Exponential backoff: backoff * 2^(attempt-1)
		delay := cfg.Backoff * (1 << (attempt - 1))
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}
	}

	return lastErr
}
