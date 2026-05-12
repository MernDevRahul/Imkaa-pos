import { useEffect, useRef, useState } from "react";

/**
 * Webcam barcode scanner using @zxing/browser.
 * Falls back gracefully if camera is unavailable.
 * onDetect(sku: string) is called when a barcode is read.
 */
export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices.length) throw new Error("No camera found");

        // Prefer back camera on mobile
        const device =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[0];

        if (!active) return;
        setReady(true);

        await reader.decodeFromVideoDevice(
          device.deviceId,
          videoRef.current,
          (result, err) => {
            if (!active) return;
            if (result) {
              onDetect(result.getText());
            }
          },
        );
      } catch (err) {
        if (active) setError(err.message || "Camera access denied");
      }
    };

    start();

    return () => {
      active = false;
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (_) {}
      }
    };
  }, [onDetect]);

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--sp-3) var(--sp-4)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: ready ? "var(--success)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: ready ? "var(--success)" : "var(--text-muted)",
              animation: ready ? "pulse 1.5s infinite" : "none",
            }}
          />
          {ready ? "Scanner Active" : "Starting Camera..."}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      {/* Video */}
      <div style={{ position: "relative", background: "#000" }}>
        <video
          ref={videoRef}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 240,
            objectFit: "cover",
          }}
          muted
          playsInline
        />
        {/* Scan line animation */}
        {ready && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(transparent 45%, rgba(245,166,35,0.08) 50%, transparent 55%)",
                animation: "scanLine 2s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "10%",
                right: "10%",
                transform: "translateY(-50%)",
                height: 2,
                background: "rgba(245,166,35,0.6)",
                boxShadow: "0 0 8px var(--accent)",
                animation: "scanLine 2s ease-in-out infinite",
              }}
            />
          </>
        )}
        {error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.85)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              color: "var(--danger)",
              textAlign: "center",
              padding: "var(--sp-4)",
            }}
          >
            ⚠ {error}
          </div>
        )}
      </div>

      <div
        style={{
          padding: "var(--sp-2) var(--sp-4)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
          textAlign: "center",
        }}
      >
        Point camera at barcode — auto-detects
      </div>
    </div>
  );
}
