package services

import "testing"

func TestParseStoredRef(t *testing.T) {
	tests := []struct {
		name       string
		raw        string
		wantScheme string
		wantPath   string
		wantErr    bool
	}{
		{name: "local prefixed", raw: "local:u1_123.jpg", wantScheme: SchemeLocal, wantPath: "u1_123.jpg"},
		{name: "oss prefixed", raw: "oss:avatars/u1_123.jpg", wantScheme: SchemeOSS, wantPath: "avatars/u1_123.jpg"},
		{name: "https external", raw: "https://api.dicebear.com/7.x/avataaars/svg?seed=a", wantScheme: SchemeExternal, wantPath: "https://api.dicebear.com/7.x/avataaars/svg?seed=a"},
		{name: "http external", raw: "http://cdn.example.com/a.png", wantScheme: SchemeExternal, wantPath: "http://cdn.example.com/a.png"},
		{name: "bare filename legacy", raw: "u1_123.jpg", wantScheme: SchemeLocal, wantPath: "u1_123.jpg"},
		{name: "empty", raw: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ref, err := ParseStoredRef(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if ref.Scheme != tt.wantScheme || ref.Path != tt.wantPath {
				t.Fatalf("got scheme=%q path=%q, want scheme=%q path=%q", ref.Scheme, ref.Path, tt.wantScheme, tt.wantPath)
			}
		})
	}
}

func TestFormatStoredRef(t *testing.T) {
	if got := FormatStoredRef(SchemeLocal, "a.jpg"); got != "local:a.jpg" {
		t.Fatalf("local: got %q", got)
	}
	if got := FormatStoredRef(SchemeOSS, "avatars/a.jpg"); got != "oss:avatars/a.jpg" {
		t.Fatalf("oss: got %q", got)
	}
	if got := FormatStoredRef(SchemeExternal, "https://x.com/a.png"); got != "https://x.com/a.png" {
		t.Fatalf("external: got %q", got)
	}
}

func TestFormatParseRoundTrip(t *testing.T) {
	cases := []struct {
		scheme string
		path   string
	}{
		{SchemeLocal, "u1.jpg"},
		{SchemeOSS, "avatars/u1.jpg"},
	}
	for _, c := range cases {
		formatted := FormatStoredRef(c.scheme, c.path)
		ref, err := ParseStoredRef(formatted)
		if err != nil {
			t.Fatalf("parse %q: %v", formatted, err)
		}
		if ref.Scheme != c.scheme || ref.Path != c.path {
			t.Fatalf("round trip failed for %q", formatted)
		}
	}
}
