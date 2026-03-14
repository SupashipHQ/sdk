// Package plugins provides ready-to-use Supaship plugin implementations.
package plugins

import (
	"log/slog"
	"time"

	supaship "github.com/supashiphq/go-sdk"
)

// LoggingPlugin logs key SDK lifecycle events using Go's structured logging
// package (log/slog). It implements BeforeGetter, AfterGetter, OnErrorer,
// BeforeRequester, AfterResponser, OnRetryAttemptter, and OnFallbackUser.
type LoggingPlugin struct {
	logger *slog.Logger
}

// NewLoggingPlugin creates a LoggingPlugin that writes to logger.
// Pass slog.Default() to use the process-wide logger.
func NewLoggingPlugin(logger *slog.Logger) *LoggingPlugin {
	if logger == nil {
		logger = slog.Default()
	}
	return &LoggingPlugin{logger: logger}
}

func (l *LoggingPlugin) Name() string { return "supaship.logging" }

func (l *LoggingPlugin) OnInit(info supaship.InitInfo) {
	l.logger.Info("supaship client initialized",
		slog.String("clientID", info.ClientID),
		slog.Int("featureCount", len(info.AvailableFeatures)),
	)
}

func (l *LoggingPlugin) BeforeGetFeatures(names []string, ctx supaship.EvalContext) error {
	l.logger.Debug("evaluating features",
		slog.Any("features", names),
		slog.Any("context", ctx),
	)
	return nil
}

func (l *LoggingPlugin) AfterGetFeatures(results map[string]supaship.FeatureValue, _ supaship.EvalContext) {
	l.logger.Debug("features evaluated", slog.Any("results", results))
}

func (l *LoggingPlugin) OnError(err error, ctx supaship.EvalContext) {
	l.logger.Error("feature evaluation error",
		slog.String("error", err.Error()),
		slog.Any("context", ctx),
	)
}

func (l *LoggingPlugin) BeforeRequest(url string, _ []byte, _ map[string]string) {
	l.logger.Debug("sending request", slog.String("url", url))
}

func (l *LoggingPlugin) AfterResponse(statusCode int, duration time.Duration) {
	l.logger.Debug("received response",
		slog.Int("statusCode", statusCode),
		slog.Duration("duration", duration),
	)
}

func (l *LoggingPlugin) OnRetryAttempt(attempt int, err error, willRetry bool) {
	l.logger.Warn("request failed, retrying",
		slog.Int("attempt", attempt),
		slog.String("error", err.Error()),
		slog.Bool("willRetry", willRetry),
	)
}

func (l *LoggingPlugin) OnFallbackUsed(name string, fallback supaship.FeatureValue, err error) {
	l.logger.Warn("using fallback value",
		slog.String("feature", name),
		slog.Any("fallback", fallback),
		slog.String("reason", err.Error()),
	)
}
