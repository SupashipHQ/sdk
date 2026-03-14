package supaship

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// hashContext returns a shallow copy of ctx where every key listed in
// sensitiveKeys has its value replaced by its SHA-256 hex digest.
// Keys absent from ctx are silently ignored.
func hashContext(ctx EvalContext, sensitiveKeys []string) EvalContext {
	if len(ctx) == 0 || len(sensitiveKeys) == 0 {
		return ctx
	}

	sensitive := make(map[string]struct{}, len(sensitiveKeys))
	for _, k := range sensitiveKeys {
		sensitive[k] = struct{}{}
	}

	out := make(EvalContext, len(ctx))
	for k, v := range ctx {
		if _, ok := sensitive[k]; ok {
			out[k] = hashValue(v)
		} else {
			out[k] = v
		}
	}
	return out
}

func hashValue(v any) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%v", v)))
	return hex.EncodeToString(h[:])
}
