# unitauthsdk

v4 unified auth surface for business services (`NewMiddleware` + `UserID`) and an optional edge Client facade over `unit-auth/sdk`.

## Business service (5 lines)

```go
import "unit-auth/unitauthsdk"

mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfigFromEnv())
if err != nil { log.Fatal(err) }
r.Use(mw)

// in handler
userID := unitauthsdk.UserID(c) // UUID string
```

Or explicit config:

```go
mw, err := unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfig{
    Mode:          unitauthsdk.ModeFromEnv(), // plugin | standalone
    UnitAuthURL:   os.Getenv("UNIT_AUTH_URL"),
    JWTSecret:     os.Getenv("JWT_SECRET"),
    ClientID:      os.Getenv("UNIT_AUTH_CLIENT_ID"),
    ClientSecret:  os.Getenv("UNIT_AUTH_CLIENT_SECRET"),
    InternalToken: os.Getenv("INTERNAL_TOKEN"),
})
```

### AUTH_MODE

| Mode | Behavior |
|---|---|
| `plugin` (default) | Read `X-User-Id` (required). Missing → **400** `{"error":"missing_user_id"}`. Does not validate Bearer. Optional `INTERNAL_TOKEN` → require matching `X-Internal-Token`. |
| `standalone` | Browser / client: validate Bearer via Introspect (`UNIT_AUTH_URL`) or local JWT (`JWT_SECRET`). Failure → **401**. |

Standalone preference: if `UnitAuthURL` is set → Introspect; else JWT. Both empty → `NewMiddleware` returns error.

**Standalone S2S dual channel** (when `INTERNAL_TOKEN` is set):

| Request | Result |
|---|---|
| `X-Internal-Token` matches + `X-User-Id` | Trust identity headers; **no** Bearer required |
| `X-Internal-Token` present but wrong | **401** (does not fall back to Bearer) |
| No `X-Internal-Token` | Bearer path (unchanged) |
| `INTERNAL_TOKEN` unset | Bearer only — forged `X-User-Id` alone is ignored |

Callers (e.g. LC → Memory Evidence) send `X-User-Id` + `X-Internal-Token`; both services must share the same `INTERNAL_TOKEN`. Do **not** forward the user's Bearer for S2S.

Claims / introspect: only **`user_id` (UUID)** is written to context. `local_user_id` is never used as business identity.

### Plugin security

Do **not** expose plugin mode on the public internet without `INTERNAL_TOKEN` (header `X-Internal-Token`) or mesh/mTLS. Identity headers are forgeable. Same for standalone S2S: only enable the header channel when `INTERNAL_TOKEN` is configured and callers are trusted.

### Secrets

`ClientSecret` / IdP secrets belong on edge BFF or standalone only — not on untrusted plugin backends.

## Edge / BFF

Preferred: one-line mount of standard OAuth proxy routes:

```go
import "unit-auth/unitauthsdk"

auth := unitauthsdk.New(unitauthsdk.Config{
    BaseURL: unitAuthURL, ClientID: id, ClientSecret: secret, RedirectURI: redirect,
})
r := gin.Default()
r.Use(unitauthsdk.CORS())
unitauthsdk.MountBFF(r, auth, unitauthsdk.MountBFFConfig{AppID: "sso_my_app"})
// mounts: /api/v1/auth/oauth/*, /api/v1/openid-configuration, /api/v1/sso/providers
```

Optional plugin bridge (Bearer → Introspect → `X-User-Id` forward to an upstream):

```go
unitauthsdk.MountPluginProxy(r, auth, unitauthsdk.PluginProxyConfig{
    UpstreamURL:   "http://localhost:9000",
    InternalToken: os.Getenv("INTERNAL_TOKEN"),
})
```

Existing apps (`sso_test_d`, `c_sso`) may keep `import "unit-auth/sdk"` with hand-written routes.

## backend/shared/auth (thin wrap — future)

Prefer wrapping this package when migrating Memory (Phase 1.5.4). Keep legacy `RequireLogin` until callers move:

```go
func NewMiddlewareFromEnv() (gin.HandlerFunc, error) {
    return unitauthsdk.NewMiddleware(unitauthsdk.MiddlewareConfigFromEnv())
}
func UserID(c *gin.Context) string { return unitauthsdk.UserID(c) }
```

## Tests

```bash
cd framework/Packages/Login/unit-auth && go test ./unitauthsdk/...
```
