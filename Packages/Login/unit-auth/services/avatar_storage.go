package services

import (
	"mime/multipart"
)

const AvatarNamespace = "avatars"

// AvatarStorage 头像存储（兼容层，委托 StorageRegistry）
type AvatarStorage interface {
	Save(userID string, file multipart.File, header *multipart.FileHeader) (storedValue string, accessKey string, err error)
	ResolvePublicURL(storedValue string, apiBase string) string
	LocalFilePath(filename string) (string, error)
}

type avatarStorageAdapter struct {
	registry *StorageRegistry
}

// NewAvatarStorage 按 FILE_STORAGE_DEFAULT / AVATAR_STORAGE 选择默认后端
func NewAvatarStorage() (AvatarStorage, error) {
	reg, err := DefaultStorageRegistry()
	if err != nil {
		return nil, err
	}
	return &avatarStorageAdapter{registry: reg}, nil
}

func (a *avatarStorageAdapter) Save(userID string, file multipart.File, header *multipart.FileHeader) (string, string, error) {
	uploader, err := a.registry.DefaultUploader()
	if err != nil {
		return "", "", err
	}
	stored, err := uploader.Save(AvatarNamespace, userID, file, header)
	if err != nil {
		return "", "", err
	}
	ref, err := ParseStoredRef(stored)
	if err != nil {
		return stored, "", err
	}
	return stored, ref.Path, nil
}

func (a *avatarStorageAdapter) ResolvePublicURL(storedValue, apiBase string) string {
	return a.registry.ResolveStoredFileURL(storedValue, apiBase)
}

func (a *avatarStorageAdapter) LocalFilePath(filename string) (string, error) {
	return a.registry.LocalDiskPath(filename)
}

// NewLocalAvatarStorage 兼容旧调用
func NewLocalAvatarStorage() *LocalFileStorage {
	return NewLocalFileStorage()
}

// NewCosAvatarStorage 兼容旧调用
func NewCosAvatarStorage() (*CosFileStorage, error) {
	return NewCosFileStorage()
}

// Deprecated: use detectImageExt
func detectAvatarExt(header *multipart.FileHeader) (ext string, contentType string, err error) {
	return detectImageExt(header)
}

// Deprecated: use buildObjectKey
func buildAvatarObjectKey(userID string, ext string, prefix string) string {
	return buildObjectKey(userID, ext, prefix)
}

// Deprecated: use fileCDNBase
func avatarCDNBase() string {
	return fileCDNBase()
}

// 兼容旧类型名
type LocalAvatarStorage = LocalFileStorage
type CosAvatarStorage = CosFileStorage

var _ AvatarStorage = (*avatarStorageAdapter)(nil)
