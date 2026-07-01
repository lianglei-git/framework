package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const defaultAvatarMaxBytes = 2 * 1024 * 1024

var allowedAvatarMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// AvatarStorage 头像存储抽象（本地 / 腾讯云 COS）
type AvatarStorage interface {
	Save(userID string, file multipart.File, header *multipart.FileHeader) (storedValue string, accessKey string, err error)
	ResolvePublicURL(storedValue string, apiBase string) string
	LocalFilePath(filename string) (string, error)
}

// NewAvatarStorage 按 AVATAR_STORAGE 选择实现：local（默认）| cos | oss
func NewAvatarStorage() (AvatarStorage, error) {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("AVATAR_STORAGE")))
	switch mode {
	case "cos", "oss":
		return NewCosAvatarStorage()
	default:
		return NewLocalAvatarStorage(), nil
	}
}

func avatarCDNBase() string {
	if base := strings.TrimSpace(os.Getenv("AVATAR_COS_CDN_BASE")); base != "" {
		return strings.TrimSuffix(base, "/")
	}
	return strings.TrimSuffix(strings.TrimSpace(os.Getenv("AVATAR_OSS_CDN_BASE")), "/")
}

func detectAvatarExt(header *multipart.FileHeader) (ext string, contentType string, err error) {
	contentType = header.Header.Get("Content-Type")
	if ext, ok := allowedAvatarMIME[contentType]; ok {
		return ext, contentType, nil
	}

	ext = strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg":
		return ".jpg", "image/jpeg", nil
	case ".png":
		return ".png", "image/png", nil
	case ".webp":
		return ".webp", "image/webp", nil
	default:
		return "", "", fmt.Errorf("unsupported file type")
	}
}

func buildAvatarObjectKey(userID string, ext string, prefix string) string {
	safeUserID := strings.ReplaceAll(userID, "/", "_")
	filename := fmt.Sprintf("%s_%d%s", safeUserID, time.Now().UnixNano(), ext)
	prefix = strings.Trim(prefix, "/")
	if prefix == "" {
		return filename
	}
	return prefix + "/" + filename
}

// LocalAvatarStorage 本地头像存储
type LocalAvatarStorage struct {
	dir      string
	maxBytes int64
}

func NewLocalAvatarStorage() *LocalAvatarStorage {
	dir := os.Getenv("AVATAR_LOCAL_DIR")
	if dir == "" {
		dir = "./uploads/avatars"
	}
	_ = os.MkdirAll(dir, 0o755)
	return &LocalAvatarStorage{dir: dir, maxBytes: defaultAvatarMaxBytes}
}

func (s *LocalAvatarStorage) Save(userID string, file multipart.File, header *multipart.FileHeader) (storedValue string, accessKey string, err error) {
	if header.Size > s.maxBytes {
		return "", "", fmt.Errorf("file too large")
	}

	ext, _, err := detectAvatarExt(header)
	if err != nil {
		return "", "", err
	}

	accessKey = buildAvatarObjectKey(userID, ext, "")
	destPath := filepath.Join(s.dir, accessKey)

	dst, err := os.Create(destPath)
	if err != nil {
		return "", "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		_ = os.Remove(destPath)
		return "", "", err
	}

	return "local:" + accessKey, accessKey, nil
}

func (s *LocalAvatarStorage) ResolvePublicURL(storedValue string, apiBase string) string {
	if strings.HasPrefix(storedValue, "http://") || strings.HasPrefix(storedValue, "https://") {
		return storedValue
	}

	if strings.HasPrefix(storedValue, "oss:") {
		key := storedValue[4:]
		if cdn := avatarCDNBase(); cdn != "" {
			return cdn + "/" + key
		}
		return storedValue
	}

	key := strings.TrimPrefix(storedValue, "local:")
	if publicBase := strings.TrimSuffix(strings.TrimSpace(os.Getenv("AVATAR_PUBLIC_BASE_URL")), "/"); publicBase != "" {
		return publicBase + "/" + key
	}

	apiBase = strings.TrimSuffix(apiBase, "/")
	return apiBase + "/api/v1/user/avatar/" + key
}

func (s *LocalAvatarStorage) LocalFilePath(filename string) (string, error) {
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return "", fmt.Errorf("invalid filename")
	}
	path := filepath.Join(s.dir, filename)
	if _, err := os.Stat(path); err != nil {
		return "", err
	}
	return path, nil
}
