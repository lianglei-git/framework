package unitauthsdk

import "unit-auth/sdk"

// Edge Client facade — type aliases so BFF can use a single import path.
// Method names stay aligned with legacy sdk (BuildAuthorizeURL ≈ Authorize, etc.).

type (
	Config             = sdk.Config
	Client             = sdk.Client
	TokenResponse      = sdk.TokenResponse
	UserInfo           = sdk.UserInfo
	AuthorizeURLParams = sdk.AuthorizeURLParams
	SessionCheckRequest = sdk.SessionCheckRequest
	IntrospectResponse = sdk.IntrospectResponse
	APIError           = sdk.APIError
	AuthURLResponse    = sdk.AuthURLResponse
)

// New creates an edge OAuth/Introspect client (delegates to unit-auth/sdk).
func New(cfg Config) *Client {
	return sdk.New(cfg)
}
