package services

import (
	"testing"
)

func TestResolveStoredFileURL_Local(t *testing.T) {
	reg := &StorageRegistry{local: NewLocalFileStorage()}
	got := reg.ResolveStoredFileURL("local:u1.jpg", "http://api.test")
	want := "http://api.test/api/v1/user/avatar/u1.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolveStoredFileURL_External(t *testing.T) {
	reg := &StorageRegistry{local: NewLocalFileStorage()}
	url := "https://api.dicebear.com/7.x/avataaars/svg?seed=x"
	got := reg.ResolveStoredFileURL(url, "http://api.test")
	if got != url {
		t.Fatalf("got %q want %q", got, url)
	}
}

func TestResolveStoredFileURL_OSSWithCDN(t *testing.T) {
	t.Setenv("FILE_COS_CDN_BASE", "https://cdn.test")
	reg := &StorageRegistry{
		local: NewLocalFileStorage(),
		cos: &CosFileStorage{
			bucket:  "b-125",
			region:  "ap-guangzhou",
			cdnBase: fileCDNBase(),
		},
	}

	got := reg.ResolveStoredFileURL("oss:avatars/u1.jpg", "http://api.test")
	want := "https://cdn.test/avatars/u1.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolveStoredFileURL_BareFilename(t *testing.T) {
	reg := &StorageRegistry{local: NewLocalFileStorage()}
	got := reg.ResolveStoredFileURL("u1.jpg", "http://api.test")
	want := "http://api.test/api/v1/user/avatar/u1.jpg"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
