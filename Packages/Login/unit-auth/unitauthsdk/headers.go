package unitauthsdk

// HTTP identity headers (plugin mode) and internal auth key names.
const (
	HeaderUserID        = "X-User-Id"
	HeaderUserEmail     = "X-User-Email"
	HeaderUserRole      = "X-User-Role"
	HeaderInternalToken = "X-Internal-Token"

	// Context keys — business code should use UserID/Email/Role helpers, not these.
	ContextKeyUserID = "unitauthsdk_user_id"
	ContextKeyEmail  = "unitauthsdk_email"
	ContextKeyRole   = "unitauthsdk_role"

	ErrorMissingUserID = "missing_user_id"
)
