import { useEffect, useState } from "react";
import { FileText, X, Download } from "lucide-react";

interface FileViewerProps {
  open: boolean;
  onClose: () => void;
  url?: string;
  name?: string;
  type?: string;
}


const isSafeUrl = (urlStr?: string) => {
  if (!urlStr) return false;
  try {
    const urlObj = new URL(urlStr, window.location.origin);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null;

    // Only allow http/https
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return false;
    }

    // Must be same origin or supabase origin
    if (urlObj.origin === window.location.origin || urlObj.origin === supabaseOrigin) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const getFileNameFromUrl = (url?: string) => {
  if (!url) return "Preview";
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(lastSegment || "Preview");
  } catch {
    const lastSegment = url.split("/").filter(Boolean).pop();
    return decodeURIComponent((lastSegment || "Preview").split("?")[0]);
  }
};

const getFileKind = (url?: string, type?: string) => {
  const normalizedType = (type || "").toLowerCase();
  const normalizedUrl = (url || "").toLowerCase();

  if (normalizedType.startsWith("image/")) return "image";
  if (normalizedType.startsWith("video/")) return "video";
  if (normalizedType.startsWith("audio/")) return "audio";

  if (
    normalizedType.startsWith("text/") ||
    normalizedUrl.match(/\.(txt|log|json|md|csv)(\?|#|$)/i)
  )
    return "text";

  if (normalizedType === "application/pdf" || normalizedUrl.endsWith(".pdf"))
    return "pdf";

  if (normalizedUrl.match(/\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|#|$)/i))
    return "image";

  if (normalizedUrl.match(/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i)) return "video";

  if (normalizedUrl.match(/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i)) return "audio";
  if (normalizedUrl.match(/\.(doc|docx)(\?|#|$)/i)) return "doc";

  if (normalizedUrl.match(/\.(ppt|pptx)(\?|#|$)/i)) return "ppt";

  return "file";
};

const FileViewerModal = ({
  open,
  onClose,
  url,
  name,
  type,
}: FileViewerProps) => {
  const [textContent, setTextContent] = useState<string>("");
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!url || !isSafeUrl(url)) return;

    const fileKind = getFileKind(url, type);
    if (fileKind === "text") {
      fetch(url)
        .then((res) => res.text())
        .then(setTextContent)
        .catch(() => setTextContent("Failed to load file"));
    }
  }, [url, type]);

  useEffect(() => {
    setIframeLoading(true);
  }, [url, type]);

  if (!open) return null;

  const fileKind = getFileKind(url, type);
  const displayName = name || getFileNameFromUrl(url);

  const renderPreview = () => {
    if (!url || !isSafeUrl(url)) {
      return (
        <div className="flex min-h-[240px] items-center justify-center text-center text-[#b5bac1]">
          <div>
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{!url ? "No preview available." : "Unsafe file URL."}</p>
          </div>
        </div>
      );
    }

    if (fileKind === "image") {
      return (
        <img
          src={url}
          alt={displayName}
          style={{
            maxHeight: "85vh",
            maxWidth: "90vw",
            borderRadius: "4px",
            objectFit: "contain",
            display: "block",
          }}
        />
      );
    }

    if (fileKind === "video") {
      return (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          style={{
            maxHeight: "85vh",
            maxWidth: "90vw",
            borderRadius: "4px",
            background: "#000",
            objectFit: "contain",
            display: "block",
          }}
        />
      );
    }

    if (fileKind === "audio") {
      return (
        <audio
          src={url}
          controls
          style={{
            width: "min(90vw, 500px)",
          }}
        />
      );
    }

    if (fileKind === "text") {
      return (
        <pre
          style={{
            maxHeight: "85vh",
            maxWidth: "90vw",
            overflow: "auto",
            padding: "16px",
            background: "#1e1e1e",
            color: "#d4d4d4",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        >
          {textContent || "Loading..."}
        </pre>
      );
    }

    if (fileKind === "pdf") {
      return (
        <iframe
          src={url}
          title={displayName}
          style={{
            height: "85vh",
            width: "min(90vw, 1100px)",
            borderRadius: "4px",
            background: "#fff",
            border: "none",
            display: "block",
          }}
        />
      );
    }

    if (fileKind === "ppt" || fileKind === "doc") {
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
        url,
      )}&embedded=true`;

      return (
        <div
          style={{
            position: "relative",
            height: "85vh",
            width: "min(90vw, 1100px)",
          }}
        >
          {iframeLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(20, 20, 20, 0.85)",
                borderRadius: "4px",
                gap: "16px",
                zIndex: 10,
              }}
            >
              {/* Spinner */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.15)",
                  borderTopColor: "#fff",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "13px",
                  margin: 0,
                }}
              >
                Loading Preview
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          <iframe
            src={viewerUrl}
            title={displayName}
            onLoad={() => setIframeLoading(false)}
            style={{
              height: "100%",
              width: "100%",
              border: "none",
              borderRadius: "4px",
              opacity: iframeLoading ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          minHeight: "240px",
          width: "min(90vw, 560px)",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          background: "rgba(0,0,0,0.4)",
          padding: "24px",
          textAlign: "center",
          color: "#b5bac1",
        }}
      >
        <div>
          <div
            style={{
              margin: "0 auto 12px",
              display: "flex",
              height: "56px",
              width: "56px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <FileText size={28} />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 4px" }}>
            {displayName}
          </p>
          <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>
            Open the link to view this file.
          </p>
        </div>
      </div>
    );
  };

  const handleDownload = async () => {
    if (!url || !isSafeUrl(url)) return;

    try {
      const res = await fetch(url);
      const blob = await res.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = displayName || "file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
      }}
    >
      {/* Download button */}
      {url && isSafeUrl(url) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          style={{
            position: "fixed",
            top: "16px",
            right: "64px",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <Download size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close preview"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          border: "1.5px solid rgba(255,255,255,0.15)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxHeight: "100vh",
          maxWidth: "100vw",
        }}
      >
        {renderPreview()}
      </div>
    </div>
  );
};

export default FileViewerModal;
