package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

// LocalFileStorage 本地文件存储
type LocalFileStorage struct {
	rootDir  string
	maxBytes int64
}

func NewLocalFileStorage() *LocalFileStorage {
	dir := fileLocalRoot()
	_ = os.MkdirAll(dir, 0o755)
	return &LocalFileStorage{rootDir: dir, maxBytes: defaultFileMaxBytes}
}

func (s *LocalFileStorage) Scheme() string {
	return SchemeLocal
}

func (s *LocalFileStorage) Save(namespace, ownerID string, file multipart.File, header *multipart.FileHeader) (string, error) {
	if header.Size > s.maxBytes {
		return "", fmt.Errorf("file too large")
	}

	ext, _, err := detectImageExt(header)
	if err != nil {
		return "", err
	}

	// 本地模式：对象平铺在 rootDir，namespace 仅编码进 DB path 时不用子目录（与历史行为一致）
	_ = namespace
	objectKey := buildObjectKey(ownerID, ext, "")
	destPath := filepath.Join(s.rootDir, objectKey)

	dst, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		_ = os.Remove(destPath)
		return "", err
	}

	return FormatStoredRef(SchemeLocal, objectKey), nil
}

func (s *LocalFileStorage) ResolveURL(ref StoredFileRef, apiBase string) string {
	if ref.Scheme != SchemeLocal {
		return ""
	}
	if publicBase := filePublicBaseURL(); publicBase != "" {
		return publicBase + "/" + ref.Path
	}
	apiBase = strings.TrimSuffix(apiBase, "/")
	return apiBase + "/api/v1/user/avatar/" + ref.Path
}

func (s *LocalFileStorage) DiskPath(filename string) (string, error) {
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return "", fmt.Errorf("invalid filename")
	}
	path := filepath.Join(s.rootDir, filename)
	if _, err := os.Stat(path); err != nil {
		return "", err
	}
	return path, nil
}
