package services

import (
	"fmt"
	"mime/multipart"
	"strings"
	"sync"
)

// FileStorage 通用文件存储后端
type FileStorage interface {
	Scheme() string
	Save(namespace, ownerID string, file multipart.File, header *multipart.FileHeader) (stored string, err error)
	ResolveURL(ref StoredFileRef, apiBase string) string
}

// StorageRegistry 存储注册表
type StorageRegistry struct {
	local *LocalFileStorage
	cos   *CosFileStorage
}

var (
	defaultRegistry     *StorageRegistry
	defaultRegistryOnce sync.Once
	defaultRegistryErr  error
)

// DefaultStorageRegistry 单例注册表
func DefaultStorageRegistry() (*StorageRegistry, error) {
	defaultRegistryOnce.Do(func() {
		defaultRegistry, defaultRegistryErr = newStorageRegistry()
	})
	return defaultRegistry, defaultRegistryErr
}

func newStorageRegistry() (*StorageRegistry, error) {
	reg := &StorageRegistry{
		local: NewLocalFileStorage(),
	}

	mode := fileStorageDefault()
	if mode == "cos" || mode == "oss" {
		cosStorage, err := NewCosFileStorage()
		if err != nil {
			return nil, err
		}
		reg.cos = cosStorage
	}

	return reg, nil
}

// DefaultUploader 新上传使用的默认后端
func (r *StorageRegistry) DefaultUploader() (FileStorage, error) {
	mode := fileStorageDefault()
	if mode == "cos" || mode == "oss" {
		if r.cos == nil {
			cosStorage, err := NewCosFileStorage()
			if err != nil {
				return nil, err
			}
			r.cos = cosStorage
		}
		return r.cos, nil
	}
	return r.local, nil
}

// ResolveStoredFileURL 将 DB 存储值解析为可访问的公网 URL
func (r *StorageRegistry) ResolveStoredFileURL(raw, apiBase string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	ref, err := ParseStoredRef(raw)
	if err != nil {
		return ""
	}

	switch ref.Scheme {
	case SchemeExternal:
		return ref.Path
	case SchemeLocal:
		return r.local.ResolveURL(ref, apiBase)
	case SchemeOSS:
		if r.cos != nil {
			return r.cos.ResolveURL(ref, apiBase)
		}
		if cdn := fileCDNBase(); cdn != "" {
			return cdn + "/" + ref.Path
		}
		return raw
	default:
		return raw
	}
}

// LocalDiskPath 本地文件磁盘路径（仅 local scheme）
func (r *StorageRegistry) LocalDiskPath(filename string) (string, error) {
	return r.local.DiskPath(filename)
}

// ResolveStoredFileURL 包级便捷方法
func ResolveStoredFileURL(raw, apiBase string) string {
	reg, err := DefaultStorageRegistry()
	if err != nil {
		return strings.TrimSpace(raw)
	}
	return reg.ResolveStoredFileURL(raw, apiBase)
}

// SaveFile 使用默认后端上传
func SaveFile(namespace, ownerID string, file multipart.File, header *multipart.FileHeader) (string, error) {
	reg, err := DefaultStorageRegistry()
	if err != nil {
		return "", err
	}
	uploader, err := reg.DefaultUploader()
	if err != nil {
		return "", err
	}
	return uploader.Save(namespace, ownerID, file, header)
}

// MustDefaultStorageRegistry 用于 handler 初始化（失败 panic）
func MustDefaultStorageRegistry() *StorageRegistry {
	reg, err := DefaultStorageRegistry()
	if err != nil {
		panic(fmt.Sprintf("failed to init storage registry: %v", err))
	}
	return reg
}
