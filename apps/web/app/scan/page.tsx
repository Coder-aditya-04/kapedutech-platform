"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// BarcodeDetector is not yet in TypeScript's lib.dom — declare it manually
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(src: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

type ScanStatus = "idle" | "verifying" | "success" | "punch_out" | "already_marked" | "not_found" | "error";
interface AttendanceResult { studentName: string; time: string; type: "PUNCH_IN" | "PUNCH_OUT"; }

const COOLDOWN_MS = 2500;

function computeBoxSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Math.min(420, vh - 300, vw - 32);
}

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [boxSize, setBoxSize] = useState(380);
  const [camError, setCamError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const processingRef = useRef(false);
  const now = useDateTime();

  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  useEffect(() => { setBoxSize(computeBoxSize()); }, []);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Use native BarcodeDetector only if it actually supports qr_code format
        let useBarcodeDetector = false;
        if ("BarcodeDetector" in window) {
          try {
            const formats = await (BarcodeDetector as unknown as { getSupportedFormats(): Promise<string[]> }).getSupportedFormats();
            useBarcodeDetector = formats.includes("qr_code");
          } catch { useBarcodeDetector = false; }
        }

        if (useBarcodeDetector) {
          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          scanLoop(detector);
        } else {
          // Fallback: html5-qrcode (ZXing decoder) — works on all browsers
          startHtml5Fallback(stream);
        }
      } catch {
        if (!cancelled) setCamError("Could not access camera. Please allow camera permission.");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scanLoop(detector: BarcodeDetector) {
    let detecting = false;
    function tick() {
      animRef.current = requestAnimationFrame(async () => {
        const video = videoRef.current;
        if (!detecting && video && video.readyState >= 2 && video.videoWidth > 0 && !processingRef.current) {
          detecting = true;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) await handleScan(codes[0].rawValue);
          } catch { /* ignore single-frame decode errors */ }
          detecting = false;
        }
        tick();
      });
    }
    tick();
  }

  // html5-qrcode fallback (Firefox / older browsers / no BarcodeDetector)
  async function startHtml5Fallback(stream: MediaStream) {
    // Stop our stream — html5-qrcode will open its own
    stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    const { Html5Qrcode } = await import("html5-qrcode");
    const size = computeBoxSize();
    const scanner = new Html5Qrcode("qr-fallback");
    scanner.start(
      { facingMode: "environment" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { fps: 10, qrbox: { width: Math.round(size * 0.75), height: Math.round(size * 0.75) }, disableFlip: true } as any,
      (text: string) => handleScan(text),
      () => {}
    ).then(() => {
      // Style the fallback scanner to fill the box
      setTimeout(() => {
        const root = document.getElementById("qr-fallback");
        if (!root) return;
        Array.from(root.children).forEach(c => {
          const el = c as HTMLElement;
          if (!el.id?.includes("scan_region")) el.style.display = "none";
        });
        const video = root.querySelector("video") as HTMLVideoElement | null;
        if (video) Object.assign(video.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" });
      }, 400);
    }).catch(() => setCamError("Could not start scanner."));
  }

  async function handleScan(decodedText: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setStatus("verifying"); // immediate feedback — user knows it was detected

    try {
      const res = await fetch("/api/attendance/qr-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: decodedText }),
      });
      const data = await res.json();
      if (res.ok) {
        const type: "PUNCH_IN" | "PUNCH_OUT" = data.type === "PUNCH_OUT" ? "PUNCH_OUT" : "PUNCH_IN";
        setResult({ studentName: data.studentName, time: data.time ?? new Date().toLocaleTimeString(), type });
        setStatus(type === "PUNCH_OUT" ? "punch_out" : "success");
      } else if (res.status === 409) {
        setStatus("already_marked"); setErrorMsg(data.message ?? "Already marked.");
      } else if (res.status === 404) {
        setStatus("not_found"); setErrorMsg("Student not found.");
      } else {
        setStatus("error"); setErrorMsg(data.message ?? "Something went wrong.");
      }
    } catch {
      setStatus("error"); setErrorMsg("Network error.");
    }
    setTimeout(() => { setStatus("idle"); setResult(null); setErrorMsg(""); processingRef.current = false; }, COOLDOWN_MS);
  }

  const borderColor =
    status === "success" ? "#16A34A" :
    status === "punch_out" ? "#2563EB" :
    status === "already_marked" ? "#D97706" :
    status === "not_found" || status === "error" ? "#DC2626" :
    status === "verifying" ? "#7C3AED" :
    "#4F46E5";

  return (
    <main style={{
      minHeight: "100vh", background: "#F8F9FC",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "24px 16px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* HEADER */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "12px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Image src="/kap_fav.png" alt="KAP Edutech" width={180} height={56} priority style={{ height: "clamp(44px,6vh,60px)", width: "auto", objectFit: "contain" }} />
          <div style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Attendance System</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A" }} />
          <span style={{ color: "#6B7280", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>Live Session</span>
        </div>
      </div>

      {/* SCANNER */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          position: "relative", width: boxSize, height: boxSize,
          borderRadius: 20, overflow: "hidden",
          border: `2px solid ${borderColor}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          background: "#000",
          transition: "border-color 0.2s ease",
        }}>
          {/* Native video feed (BarcodeDetector path) */}
          <video
            ref={videoRef}
            muted playsInline autoPlay
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* html5-qrcode fallback div — hidden unless needed */}
          <div id="qr-fallback" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

          {/* Scan line animation */}
          {status === "idle" && (
            <div style={{
              position: "absolute", left: "5%", right: "5%", height: 2,
              background: "linear-gradient(90deg, transparent, #4F46E5, #818CF8, #4F46E5, transparent)",
              borderRadius: 2, zIndex: 10, pointerEvents: "none",
              animation: "scanline 1.8s ease-in-out infinite",
              boxShadow: "0 0 10px 3px rgba(79,70,229,0.5)",
            }} />
          )}

          {/* Corner accents */}
          {([
            { top: 10, left: 10, borderTop: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRadius: "10px 0 0 0" },
            { top: 10, right: 10, borderTop: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}`, borderRadius: "0 10px 0 0" },
            { bottom: 10, left: 10, borderBottom: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRadius: "0 0 0 10px" },
            { bottom: 10, right: 10, borderBottom: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}`, borderRadius: "0 0 10px 0" },
          ] as React.CSSProperties[]).map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 28, height: 28, pointerEvents: "none", zIndex: 10, ...s }} />
          ))}

          {/* Camera error */}
          {camError && (
            <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", borderRadius: 18, padding: 24, textAlign: "center" }}>
              <p style={{ color: "#FCA5A5", fontWeight: 600, fontSize: 14 }}>{camError}</p>
            </div>
          )}

          {/* Result overlay */}
          {status !== "idle" && !camError && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background:
                status === "verifying" ? "rgba(245,243,255,0.97)" :
                status === "success" ? "rgba(240,253,244,0.97)" :
                status === "punch_out" ? "rgba(239,246,255,0.97)" :
                status === "already_marked" ? "rgba(255,251,235,0.97)" :
                "rgba(254,242,242,0.97)",
              borderRadius: 18, padding: 28, textAlign: "center",
            }}>
              {status === "verifying" && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EDE9FE", border: "2px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <span style={{ color: "#6D28D9", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>Verifying...</span>
                </>
              )}

              {status === "success" && result && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", border: "2px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <span style={{ color: "#15803D", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Attendance Marked</span>
                  <p style={{ color: "#111827", fontWeight: 800, fontSize: "clamp(18px,3.5vw,26px)", margin: "0 0 4px" }}>{result.studentName}</p>
                  <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 16px" }}>Checked in at <span style={{ color: "#15803D", fontWeight: 700 }}>{result.time}</span></p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "6px 16px" }}><div style={{ color: "#C2410C", fontSize: 11, fontWeight: 700 }}>🔥 Keep the streak!</div></div>
                    <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "6px 16px" }}><div style={{ color: "#4338CA", fontSize: 11, fontWeight: 700 }}>🏆 Aim for Rank 1!</div></div>
                  </div>
                </>
              )}

              {status === "punch_out" && result && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DBEAFE", border: "2px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  </div>
                  <span style={{ color: "#1D4ED8", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Punched Out</span>
                  <p style={{ color: "#111827", fontWeight: 800, fontSize: "clamp(18px,3.5vw,26px)", margin: "0 0 4px" }}>{result.studentName}</p>
                  <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 16px" }}>Checked out at <span style={{ color: "#1D4ED8", fontWeight: 700 }}>{result.time}</span></p>
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "6px 16px" }}><div style={{ color: "#1D4ED8", fontSize: 11, fontWeight: 700 }}>See you tomorrow! 👋</div></div>
                </>
              )}

              {status === "already_marked" && (
                <>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
                  <p style={{ color: "#92400E", fontWeight: 800, fontSize: 20, margin: "0 0 6px" }}>Already Marked</p>
                  <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>{errorMsg}</p>
                </>
              )}

              {(status === "not_found" || status === "error") && (
                <>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
                  <p style={{ color: "#991B1B", fontWeight: 800, fontSize: 20, margin: "0 0 6px" }}>{status === "not_found" ? "Not Registered" : "Error"}</p>
                  <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>{errorMsg}</p>
                </>
              )}
            </div>
          )}
        </div>

        <p style={{ color: "#9CA3AF", fontSize: 13, margin: 0 }}>
          {status === "idle" ? "Point camera at QR code" : status === "verifying" ? "QR detected — saving..." : "Ready for next student"}
        </p>
      </div>

      {/* FOOTER CLOCK */}
      <div style={{ textAlign: "center" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "10px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontFamily: "monospace", fontWeight: 800, color: "#111827", fontSize: "clamp(20px,3.2vw,30px)", margin: 0, letterSpacing: 2 }}>{timeStr}</p>
          <p style={{ color: "#9CA3AF", fontSize: "clamp(10px,1.4vw,13px)", margin: "3px 0 0" }}>{dateStr}</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        #qr-fallback > * { display: none !important; }
        #qr-fallback__scan_region { display: block !important; position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; border: none !important; }
        #qr-fallback__scan_region video { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
        @keyframes scanline {
          0%   { top: 8%; }
          50%  { top: 86%; }
          100% { top: 8%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
