"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type ScanStatus = "idle" | "success" | "punch_out" | "already_marked" | "not_found" | "error";
interface AttendanceResult { studentName: string; time: string; type: "PUNCH_IN" | "PUNCH_OUT"; }

const SCANNER_ID = "qr-reader";
const COOLDOWN_MS = 3000;

function computeBoxSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Math.min(420, vh - 320, vw - 48);
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const now = useDateTime();

  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  useEffect(() => {
    setBoxSize(computeBoxSize());
  }, []);

  useEffect(() => {
    const size = computeBoxSize();
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    const qrbox = Math.round(size * 0.6);

    scanner.start(
      { facingMode: "environment" },
      { fps: 30, qrbox: { width: qrbox, height: qrbox } },
      handleScan, () => {}
    ).then(() => {
      setTimeout(() => {
        const root = document.getElementById(SCANNER_ID);
        if (!root) return;
        Array.from(root.children).forEach((c) => {
          const el = c as HTMLElement;
          if (el.id !== "qr-reader__scan_region") el.style.display = "none";
        });
        const region = document.getElementById("qr-reader__scan_region");
        if (region) Object.assign(region.style, { position: "absolute", inset: "0", width: "100%", height: "100%", border: "none" });
        const video = root.querySelector("video") as HTMLVideoElement | null;
        if (video) Object.assign(video.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", display: "block" });
        root.querySelectorAll("canvas").forEach((c) => Object.assign((c as HTMLElement).style, { position: "absolute", inset: "0", width: "100%", height: "100%" }));
      }, 300);
    }).catch(() => { setStatus("error"); setErrorMsg("Could not access camera."); });

    return () => { scanner.isScanning && scanner.stop().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan(decodedText: string) {
    if (processingRef.current) return;
    processingRef.current = true;
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
      }
      else if (res.status === 409) { setStatus("already_marked"); setErrorMsg(data.message ?? "Already marked."); }
      else if (res.status === 404) { setStatus("not_found"); setErrorMsg("Student not found."); }
      else { setStatus("error"); setErrorMsg(data.message ?? "Something went wrong."); }
    } catch { setStatus("error"); setErrorMsg("Network error."); }
    setTimeout(() => { setStatus("idle"); setResult(null); setErrorMsg(""); processingRef.current = false; }, COOLDOWN_MS);
  }

  const borderColor =
    status === "success" ? "#16A34A" :
    status === "punch_out" ? "#2563EB" :
    status === "already_marked" ? "#D97706" :
    status === "not_found" || status === "error" ? "#DC2626" :
    "#4F46E5";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#F8F9FC",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      padding: "24px 16px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
        <div style={{
          background: "#FFFFFF",
          borderRadius: 16, padding: "14px 32px",
          border: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <Image src="/kap_fav.png" alt="Kap EduTech" width={140} height={46} priority
            style={{ height: "clamp(32px,5vh,44px)", width: "auto", objectFit: "contain" }} />
          <div style={{ width: 1, height: 36, background: "#E5E7EB" }} />
          <div>
            <div style={{ color: "#111827", fontWeight: 700, fontSize: "clamp(14px,2vw,16px)" }}>
              Attendance System
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {["JEE", "NEET"].map((tag, i) => (
                <span key={tag} style={{
                  fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 20,
                  letterSpacing: 1,
                  background: i === 0 ? "#FFF7ED" : "#F0FDF4",
                  color: i === 0 ? "#C2410C" : "#15803D",
                  border: `1px solid ${i === 0 ? "#FED7AA" : "#BBF7D0"}`,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#16A34A" }} />
          <span style={{ color: "#6B7280", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600 }}>
            Live Session
          </span>
        </div>
      </div>

      {/* ── SCANNER ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

        {/* Scanner box */}
        <div style={{
          position: "relative", width: boxSize, height: boxSize,
          borderRadius: 20, overflow: "hidden",
          border: `2px solid ${borderColor}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          background: "#000",
        }}>
          {/* Scanner div — always in DOM */}
          <div id={SCANNER_ID} style={{ position: "relative", width: boxSize, height: boxSize }} />

          {/* Corner accents */}
          {[
            { top: 10, left: 10, borderTop: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRadius: "10px 0 0 0" },
            { top: 10, right: 10, borderTop: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}`, borderRadius: "0 10px 0 0" },
            { bottom: 10, left: 10, borderBottom: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRadius: "0 0 0 10px" },
            { bottom: 10, right: 10, borderBottom: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}`, borderRadius: "0 0 10px 0" },
          ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 26, height: 26, pointerEvents: "none", zIndex: 10, ...s }} />
          ))}

          {/* Result overlay */}
          {status !== "idle" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background:
                status === "success" ? "rgba(240,253,244,0.97)" :
                status === "punch_out" ? "rgba(239,246,255,0.97)" :
                status === "already_marked" ? "rgba(255,251,235,0.97)" :
                "rgba(254,242,242,0.97)",
              borderRadius: 18,
              padding: 28,
              textAlign: "center",
            }}>
              {status === "success" && result && (
                <>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "#DCFCE7", border: "2px solid #16A34A",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 14,
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ color: "#15803D", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                    Attendance Marked
                  </span>
                  <p style={{ color: "#111827", fontWeight: 800, fontSize: "clamp(18px,3.5vw,26px)", margin: "0 0 4px" }}>
                    {result.studentName}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 16px" }}>
                    Checked in at <span style={{ color: "#15803D", fontWeight: 700 }}>{result.time}</span>
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "6px 16px" }}>
                      <div style={{ color: "#C2410C", fontSize: 11, fontWeight: 700 }}>🔥 Keep the streak!</div>
                    </div>
                    <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 10, padding: "6px 16px" }}>
                      <div style={{ color: "#4338CA", fontSize: 11, fontWeight: 700 }}>🏆 Aim for Rank 1!</div>
                    </div>
                  </div>
                </>
              )}

              {status === "punch_out" && result && (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DBEAFE", border: "2px solid #2563EB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                  <span style={{ color: "#1D4ED8", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, display: "block" }}>Punched Out</span>
                  <p style={{ color: "#111827", fontWeight: 800, fontSize: "clamp(18px,3.5vw,26px)", margin: "0 0 4px" }}>{result.studentName}</p>
                  <p style={{ color: "#6B7280", fontSize: 14, margin: "0 0 16px" }}>
                    Checked out at <span style={{ color: "#1D4ED8", fontWeight: 700 }}>{result.time}</span>
                  </p>
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "6px 16px" }}>
                    <div style={{ color: "#1D4ED8", fontSize: 11, fontWeight: 700 }}>See you tomorrow! 👋</div>
                  </div>
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
                  <p style={{ color: "#991B1B", fontWeight: 800, fontSize: 20, margin: "0 0 6px" }}>
                    {status === "not_found" ? "Not Registered" : "Error"}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>{errorMsg}</p>
                </>
              )}
            </div>
          )}
        </div>

        <p style={{ color: "#9CA3AF", fontSize: 13, margin: 0 }}>
          {status === "idle" ? "Hold QR code steady in the frame" : "Scanner ready — next student can scan"}
        </p>
      </div>

      {/* ── FOOTER CLOCK ── */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          background: "#FFFFFF", borderRadius: 14, padding: "10px 28px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontFamily: "monospace", fontWeight: 800, color: "#111827", fontSize: "clamp(20px,3.2vw,30px)", margin: 0, letterSpacing: 2 }}>{timeStr}</p>
          <p style={{ color: "#9CA3AF", fontSize: "clamp(10px,1.4vw,13px)", margin: "3px 0 0" }}>{dateStr}</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        #qr-reader__dashboard, #qr-reader__header_message, #qr-reader__status_span,
        #qr-reader > p, #qr-reader select, #qr-reader button { display: none !important; }
        #qr-reader__scan_region { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; border: none !important; line-height: 0 !important; }
        #qr-reader__scan_region video { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
        #qr-reader__scan_region canvas { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
      `}</style>
    </main>
  );
}
