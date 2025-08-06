package plugins

import (
	"context"
	"unit-auth/models"
)

// AuthProvider 认证提供者接口
type AuthProvider interface {
	// GetName 返回提供者名称
	GetName() string

	// GetType 返回认证类型
	GetType() string

	// IsEnabled 检查是否启用
	IsEnabled() bool

	// Authenticate 执行认证
	Authenticate(ctx context.Context, credentials map[string]interface{}) (*models.User, error)

	// GetAuthURL 获取认证URL（用于OAuth等）
	GetAuthURL(ctx context.Context, state string) (string, error)

	// HandleCallback 处理回调（用于OAuth等）
	HandleCallback(ctx context.Context, code string, state string) (*models.User, error)
}

// PluginManager 插件管理器
type PluginManager struct {
	providers map[string]AuthProvider
}

// NewPluginManager 创建新的插件管理器
func NewPluginManager() *PluginManager {
	return &PluginManager{
		providers: make(map[string]AuthProvider),
	}
}

// RegisterProvider 注册认证提供者
func (pm *PluginManager) RegisterProvider(provider AuthProvider) {
	pm.providers[provider.GetName()] = provider
}

// GetProvider 获取认证提供者
func (pm *PluginManager) GetProvider(name string) (AuthProvider, bool) {
	provider, exists := pm.providers[name]
	return provider, exists
}

// GetEnabledProviders 获取所有启用的提供者
func (pm *PluginManager) GetEnabledProviders() []AuthProvider {
	var enabled []AuthProvider
	for _, provider := range pm.providers {
		if provider.IsEnabled() {
			enabled = append(enabled, provider)
		}
	}
	return enabled
}

// GetAllProviders 获取所有提供者
func (pm *PluginManager) GetAllProviders() map[string]AuthProvider {
	return pm.providers
}
