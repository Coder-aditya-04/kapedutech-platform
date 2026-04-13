"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";

type Student = { id: string; name: string; enrollmentNo: string; batch: string; qrCode: string };

const BATCHES = ["All", "JEE", "NEET"];

function QRCard({ student }: { student: Student }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const qrValue = student.qrCode || `${student.id}:${student.enrollmentNo}`;
    QRCode.toDataURL(qrValue, { width: 200, margin: 2, color: { dark: "#1E1B4B", light: "#ffffff" } })
      .then(url => setDataUrl(url));
  }, [student]);

  function downloadQR() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR_${student.enrollmentNo}_${student.name.replace(/\s+/g, "_")}.png`;
    a.click();
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" }}>
      {/* Card header */}
      <div style={{ background: "#1C2B33", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{student.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, fontFamily: "monospace" }}>{student.enrollmentNo}</div>
        </div>
        <span style={{
          background: student.batch === "JEE" ? "#0064E0" : "#6441D2",
          color: "#fff", borderRadius: 100,
          padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
          display: "inline-block",
        }}>
          {student.batch || "—"}
        </span>
      </div>

      {/* QR */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: 1 }}>
        {dataUrl ? (
          <img src={dataUrl} alt={`QR for ${student.name}`} style={{ width: 160, height: 160, borderRadius: 8 }} />
        ) : (
          <div style={{ width: 160, height: 160, background: "#F3F4F6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12 }}>Generating...</div>
        )}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", fontFamily: "monospace" }}>{student.qrCode || `${student.id}:${student.enrollmentNo}`}</div>
        <button
          onClick={downloadQR}
          disabled={!dataUrl}
          style={{ width: "100%", padding: "9px", border: "1px solid #E5E7EB", borderRadius: 10, background: dataUrl ? "#F8FAFF" : "#F9FAFB", color: dataUrl ? "#4F46E5" : "#9CA3AF", fontSize: 13, fontWeight: 600, cursor: dataUrl ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PNG
        </button>
      </div>
    </div>
  );
}

export default function QRCodesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState("All");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/students");
      setStudents(res.ok ? await res.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = students
    .filter(s => batch === "All" || s.batch === batch)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.enrollmentNo.toLowerCase().includes(search.toLowerCase()));

  async function downloadAll() {
    for (const s of filtered) {
      const qrValue = s.qrCode || `${s.id}:${s.enrollmentNo}`;
      const url = await QRCode.toDataURL(qrValue, { width: 200, margin: 2, color: { dark: "#1E1B4B", light: "#ffffff" } });
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${s.enrollmentNo}_${s.name.replace(/\s+/g, "_")}.png`;
      a.click();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  function printAll() {
    window.print();
  }

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      {/* Header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0, letterSpacing: -0.3 }}>QR Codes</h1>
          <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>Download student QR codes for ID cards &amp; attendance</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={printAll} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1px solid #CED0D4", borderRadius: 100, background: "#fff", color: "#1C2B33", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.06)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print All
          </button>
          <button onClick={downloadAll} disabled={filtered.length === 0} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "none", borderRadius: 100, background: filtered.length === 0 ? "#DEE3E9" : "#0064E0", color: filtered.length === 0 ? "#8595A4" : "#fff", fontSize: 13, fontWeight: 500, cursor: filtered.length === 0 ? "not-allowed" : "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download All ({filtered.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #CED0D4", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", color: "#1C2B33", background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {BATCHES.map(b => (
            <button key={b} onClick={() => setBatch(b)} style={{
              padding: "6px 16px", borderRadius: 100, border: "none",
              background: batch === b ? "#0064E0" : "#F1F4F7",
              color: batch === b ? "#fff" : "#5D6C7B",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}>{b}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#BCC0C4" }}>{filtered.length} student{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF" }}>Loading students...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF" }}>No students found</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map(s => <QRCard key={s.id} student={s} />)}
        </div>
      )}
    </div>
  );
}
