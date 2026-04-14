"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type TestMeta = { testName: string; testDate: string; count: number };

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

export default function ResultsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<TestMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Upload form state
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{
    nameCol: string; rankCol: string; totalCol: string; percentageCol: string;
    subjects: { label: string; col: string }[];
  }>({ nameCol: "", rankCol: "", totalCol: "", percentageCol: "", subjects: [] });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ studentId: string; name: string; rank: number; total: number; scores: Record<string, number> }[]>([]);

  const load = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([fetch("/api/admin/students"), fetch("/api/admin/results/tests")]);
    if (sRes.ok) setStudents(await sRes.json());
    if (tRes.ok) setTests(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (!rows.length) { showToast("CSV is empty or invalid", false); return; }
      setCsvRows(rows);
      const headers = Object.keys(rows[0]);
      setCsvHeaders(headers);
      // Auto-detect common columns
      const find = (keys: string[]) => headers.find(h => keys.some(k => h.includes(k))) ?? "";
      setMappings({
        nameCol: find(["name"]),
        rankCol: find(["rank"]),
        totalCol: find(["total"]),
        percentageCol: find(["percent"]),
        subjects: [],
      });
    };
    reader.readAsText(file);
  }

  function addSubject() {
    setMappings(m => ({ ...m, subjects: [...m.subjects, { label: "", col: "" }] }));
  }

  function buildPreview() {
    if (!mappings.nameCol || !mappings.rankCol || !mappings.totalCol) {
      showToast("Map Name, Rank, and Total columns first", false); return;
    }
    const rows = csvRows.map((row, i) => {
      const name = row[mappings.nameCol] ?? "";
      const rank = parseInt(row[mappings.rankCol] ?? "0");
      const total = parseFloat(row[mappings.totalCol] ?? "0");
      // Match student by name (fuzzy) or enrollmentNo
      const student = students.find(s =>
        s.name.toLowerCase() === name.toLowerCase() ||
        s.enrollmentNo === (row["roll no"] ?? row["enrollment"] ?? row["enrollmentno"] ?? "")
      );
      const scores: Record<string, number> = {};
      for (const sub of mappings.subjects) {
        if (sub.label && sub.col) scores[sub.label] = parseFloat(row[sub.col] ?? "0");
      }
      return { rowIndex: i, name, rank, total, scores, student };
    }).filter(r => r.student);

    setPreview(rows.map(r => ({ studentId: r.student!.id, name: r.name, rank: r.rank, total: r.total, scores: r.scores })));
    if (rows.length === 0) showToast("No students matched. Check names match exactly.", false);
    else showToast(`${rows.length} of ${csvRows.length} rows matched to students`, true);
  }

  async function handleUpload() {
    if (!testName.trim() || !testDate || !preview.length) {
      showToast("Fill test name, date and preview first", false); return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testName: testName.trim(), testDate,
          results: preview.map(r => ({
            studentId: r.studentId, rank: r.rank,
            totalInBatch: csvRows.length, scores: r.scores,
            total: r.total,
            percentage: parseFloat(((r.total / (mappings.subjects.length > 0 ? mappings.subjects.length * 180 : 720)) * 100).toFixed(2)),
          })),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message, true);
        setTestName(""); setCsvRows([]); setCsvHeaders([]); setPreview([]);
        load();
      } else showToast(d.message ?? "Upload failed", false);
    } catch { showToast("Network error", false); }
    setUploading(false);
  }

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: toast.ok ? "#ECFDF5" : "#FEF2F2", color: toast.ok ? "#059669" : "#DC2626", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}` }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0 }}>Results</h1>
        <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>Upload test results — parents see only their child's percentile</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        {/* Upload panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>Upload New Result</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Test Name</label>
              <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Minor Test 6"
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Test Date</label>
              <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Upload Result CSV</label>
            <input type="file" accept=".csv" onChange={handleCSVFile}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box", background: "#FAFAFA" }} />
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>
              CSV must have columns like: Name, Rank, Total, Physics, Chemistry, etc.
            </p>
          </div>

          {csvHeaders.length > 0 && (
            <>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>Map Columns ({csvRows.length} rows loaded)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Student Name column", key: "nameCol" },
                    { label: "Rank column", key: "rankCol" },
                    { label: "Total Marks column", key: "totalCol" },
                    { label: "Percentage column (optional)", key: "percentageCol" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>{f.label}</label>
                      <select value={(mappings as Record<string, string>)[f.key]} onChange={e => setMappings(m => ({ ...m, [f.key]: e.target.value }))} style={{ ...inputStyle, fontSize: 13 }}>
                        <option value="">— select —</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Subject columns */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>Subject Columns</p>
                    <button onClick={addSubject} style={{ fontSize: 12, color: "#0064E0", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Subject</button>
                  </div>
                  {mappings.subjects.map((sub, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 24px", gap: 6, marginBottom: 6 }}>
                      <input placeholder="Label (e.g. Physics)" value={sub.label}
                        onChange={e => setMappings(m => { const s = [...m.subjects]; s[i] = { ...s[i], label: e.target.value }; return { ...m, subjects: s }; })}
                        style={{ ...inputStyle, fontSize: 13 }} />
                      <select value={sub.col}
                        onChange={e => setMappings(m => { const s = [...m.subjects]; s[i] = { ...s[i], col: e.target.value }; return { ...m, subjects: s }; })}
                        style={{ ...inputStyle, fontSize: 13 }}>
                        <option value="">— column —</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <button onClick={() => setMappings(m => ({ ...m, subjects: m.subjects.filter((_, j) => j !== i) }))}
                        style={{ border: "none", background: "#FEE2E2", color: "#DC2626", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={buildPreview} style={{ width: "100%", padding: "10px", border: "1.5px solid #0064E0", borderRadius: 10, background: "#EEF6FF", color: "#0064E0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
                Preview Matches
              </button>
            </>
          )}

          {preview.length > 0 && (
            <>
              <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#059669", fontWeight: 600 }}>✓ {preview.length} students matched and ready to upload</p>
                <div style={{ marginTop: 8, maxHeight: 120, overflowY: "auto" }}>
                  {preview.slice(0, 10).map((r, i) => (
                    <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#374151" }}>#{r.rank} {r.name} — {r.total} marks</p>
                  ))}
                  {preview.length > 10 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>...and {preview.length - 10} more</p>}
                </div>
              </div>
              <button onClick={handleUpload} disabled={uploading}
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: uploading ? "#9CA3AF" : "#0064E0", color: "#fff", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer" }}>
                {uploading ? "Uploading..." : `Upload Results for ${preview.length} Students`}
              </button>
            </>
          )}
        </div>

        {/* Past tests */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Uploaded Tests</h2>
          {loading ? <p style={{ color: "#9CA3AF", fontSize: 14 }}>Loading...</p> :
            tests.length === 0 ? <p style={{ color: "#9CA3AF", fontSize: 14 }}>No tests uploaded yet</p> :
              tests.map((t, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: i < tests.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <p style={{ margin: 0, fontWeight: 600, color: "#111827", fontSize: 14 }}>{t.testName}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>{t.testDate} · {t.count} students</p>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none", color: "#111827", background: "#fff" };
