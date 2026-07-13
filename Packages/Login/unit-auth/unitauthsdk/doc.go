// Package unitauthsdk is the v4 unified auth call surface for business services
// and an optional facade over the legacy edge Client (unit-auth/sdk).
//
// Business services should use NewMiddleware + UserID. AUTH_MODE is internalized:
//
//   - plugin (default): trust upstream identity headers; missing X-User-Id → 400
//   - standalone: validate Bearer via Introspect or local JWT; failure → 401
//
// Edge / BFF should prefer MountBFF (standard OAuth proxy + discovery routes)
// and optionally MountPluginProxy. Only edge and standalone deployments should
// hold client_secret; do not ship secrets to untrusted plugin backends.
// Plugin mode must not be exposed on the public internet without INTERNAL_TOKEN
// (or equivalent mesh/mTLS) — identity headers are forgeable.
package unitauthsdk
