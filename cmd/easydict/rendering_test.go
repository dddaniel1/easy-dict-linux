package main

import (
	"os"
	"testing"
)

func TestConfigureWebKitRenderer(t *testing.T) {
	for _, tc := range []struct{ initial, expected string }{{"", "0"}, {"0", "0"}, {"1", "1"}} {
		t.Run("override="+tc.initial, func(t *testing.T) {
			t.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", tc.initial)
			configureWebKitRenderer()
			if got := os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER"); got != tc.expected {
				t.Fatalf("renderer override = %q, want %q", got, tc.expected)
			}
		})
	}
}
