package plugins

import (
	"net/http"
	"time"
)

// 出站 OAuth 请求（GitHub/Google 等）超时，避免无超时的 DefaultClient 长时间挂起
var oauthOutboundClient = &http.Client{
	Timeout: 30 * time.Second,
}
