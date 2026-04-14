"use client";
import React, { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type TestMeta = { testName: string; testDate: string; count: number };
type ParsedRow = { rank: number; name: string; enrollmentNo: string; scores: Record<string, number>; total: number; percentage: number };

// Try multiple split strategies and pick the one most consistent across all lines
function parsePdfPaste(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const strategies: { name: string; fn: (l: string) => string[] }[] = [
    { name: "tab", fn: l => l.split("\t").map(v => v.trim()).filter((_, i, a) => a.length > 1 || i === 0) },
    { name: "2+spaces", fn: l => l.split(/\s{2,}/).map(v => v.trim()) },
    { name: "3+spaces", fn: l => l.split(/\s{3,}/).map(v => v.trim()) },
    { name: "4+spaces", fn: l => l.split(/\s{4,}/).map(v => v.trim()) },
  ];

  let bestFn = strategies[0].fn;
  let bestScore = 0;

  for (const s of strategies) {
    const counts = lines.map(l => s.fn(l).length);
    const headerCount = counts[0];
    if (headerCount <= 1) continue;
    // Score = (% of rows matching header column count) * number of columns
    const matching = counts.filter(c => c === headerCount).length;
    const score = (matching / counts.length) * headerCount;
    if (score > bestScore) { bestScore = score; bestFn = s.fn; }
  }

  const headers = bestFn(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = bestFn(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));

  return { headers, rows };
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none", color: "#111827", background: "#fff" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };

export default function ResultsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<TestMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<"paste" | "csv">("paste");

  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{
    nameCol: string; rankCol: string; enrollmentCol: string; totalCol: string;
    subjects: { label: string; col: string }[];
  }>({ nameCol: "", rankCol: "", enrollmentCol: "", totalCol: "", subjects: [] });
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<{ studentId: string; name: string; rank: number; total: number; percentage: number; scores: Record<string, number> }[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([fetch("/api/admin/students"), fetch("/api/admin/results/tests")]);
    if (sRes.ok) setStudents(await sRes.json());
    if (tRes.ok) setTests(await tRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); }

  function autoDetect(hdrs: string[]) {
    const find = (keys: string[]) => hdrs.find(h => keys.some(k => h.includes(k))) ?? "";
    const subjects: { label: string; col: string }[] = [];
    const subjectKeywords = ["physics", "chemistry", "botany", "zoology", "biology", "maths", "math", "english"];
    hdrs.forEach(h => {
      const match = subjectKeywords.find(k => h.includes(k));
      if (match) subjects.push({ label: match.charAt(0).toUpperCase() + match.slice(1), col: h });
    });
    setMappings({
      nameCol: find(["name"]),
      rankCol: find(["rank"]),
      enrollmentCol: find(["roll", "enrollment", "rollno"]),
      totalCol: find(["total"]),
      subjects,
    });
  }

  function handleParsePaste() {
    if (!pasteText.trim()) { showToast("Paste the table data first", false); return; }
    const { headers: hdrs, rows: r } = parsePdfPaste(pasteText);
    if (!hdrs.length) { showToast("Could not parse. Try copying the table again.", false); return; }
    setHeaders(hdrs); setRows(r);
    autoDetect(hdrs);
    showToast(`Parsed ${r.length} rows. Now map the columns below.`, true);
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers: hdrs, rows: r } = parseCSV(ev.target?.result as string);
      if (!r.length) { showToast("CSV empty or invalid", false); return; }
      setHeaders(hdrs); setRows(r);
      autoDetect(hdrs);
      showToast(`Parsed ${r.length} rows. Map the columns below.`, true);
    };
    reader.readAsText(file);
  }

  function buildPreview() {
    if (!mappings.nameCol || !mappings.rankCol || !mappings.totalCol) {
      showToast("Map Name, Rank, and Total columns first", false); return;
    }
    const parsedRows: ParsedRow[] = rows.map(row => {
      const scores: Record<string, number> = {};
      for (const sub of mappings.subjects) {
        if (sub.label && sub.col) scores[sub.label] = parseFloat(row[sub.col] ?? "0") || 0;
      }
      const total = parseFloat(row[mappings.totalCol] ?? "0") || 0;
      const maxMarks = mappings.subjects.length > 0 ? mappings.subjects.length * 180 : 720;
      const percentage = parseFloat(((total / maxMarks) * 100).toFixed(2));
      return {
        rank: parseInt(row[mappings.rankCol] ?? "0") || 0,
        name: row[mappings.nameCol] ?? "",
        enrollmentNo: mappings.enrollmentCol ? (row[mappings.enrollmentCol] ?? "") : "",
        scores, total, percentage,
      };
    }).filter(r => r.name && r.rank > 0);

    setParsed(parsedRows);

    // Match to students
    const matched = parsedRows.map(r => {
      const student = students.find(s =>
        s.name.toLowerCase().trim() === r.name.toLowerCase().trim() ||
        (r.enrollmentNo && s.enrollmentNo === r.enrollmentNo)
      );
      return student ? { studentId: student.id, name: r.name, rank: r.rank, total: r.total, percentage: r.percentage, scores: r.scores } : null;
    }).filter(Boolean) as typeof preview;

    setPreview(matched);
    if (matched.length === 0) showToast(`0 matched. Names must match exactly what's in admin → Students.`, false);
    else showToast(`${matched.length} of ${parsedRows.length} students matched.`, matched.length > 0);
  }

  async function handleUpload() {
    if (!testName.trim() || !preview.length) { showToast("Fill test name and preview first", false); return; }
    setUploading(true);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testName: testName.trim(), testDate,
          results: preview.map(r => ({
            studentId: r.studentId, rank: r.rank,
            totalInBatch: parsed.length,
            scores: r.scores, total: r.total, percentage: r.percentage,
          })),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(d.message, true);
        setTestName(""); setPasteText(""); setRows([]); setHeaders([]); setPreview([]); setParsed([]);
        load();
      } else showToast(d.message ?? "Upload failed", false);
    } catch { showToast("Network error", false); }
    setUploading(false);
  }

  return (
    <div className="admin-page">
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: toast.ok ? "#ECFDF5" : "#FEF2F2", color: toast.ok ? "#059669" : "#DC2626", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}` }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0 }}>Results</h1>
        <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>Upload test results — parents see only their child&apos;s percentile</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        {/* Upload panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>Upload New Result</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Test Name</label>
              <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Minor Test 6" style={inp} />
            </div>
            <div>
              <label style={labelStyle}>Test Date</label>
              <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16, border: "1.5px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
            {(["paste", "csv"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "9px", border: "none", background: tab === t ? "#0064E0" : "#fff", color: tab === t ? "#fff" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {t === "paste" ? "Paste from PDF" : "Upload CSV"}
              </button>
            ))}
          </div>

          {tab === "paste" ? (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Paste result table from PDF</label>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 8px" }}>
                Open your PDF → select the whole table → Ctrl+C → paste below
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"Rank\tRoll No\tName\tPhysics\tChemistry\tTotal\n1\t808716513\tPRANAY JAGTAP\t86\t116\t512..."}
                rows={6}
                style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              />
              <button onClick={handleParsePaste}
                style={{ marginTop: 8, padding: "9px 20px", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                Parse Table
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Upload CSV file</label>
              <input type="file" accept=".csv" onChange={handleCSVFile}
                style={{ ...inp, background: "#FAFAFA" }} />
            </div>
          )}

          {/* Column mapping */}
          {headers.length > 0 && (
            <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>
                Map Columns <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({rows.length} rows)</span>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  { label: "Student Name column *", key: "nameCol" },
                  { label: "Rank column *", key: "rankCol" },
                  { label: "Roll No / Enrollment column", key: "enrollmentCol" },
                  { label: "Total Marks column *", key: "totalCol" },
                ] as { label: string; key: keyof typeof mappings }[]).map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <select value={mappings[f.key] as string}
                      onChange={e => setMappings(m => ({ ...m, [f.key]: e.target.value }))}
                      style={{ ...inp, fontSize: 13 }}>
                      <option value="">— select —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>Subjects (for score breakdown)</p>
                  <button onClick={() => setMappings(m => ({ ...m, subjects: [...m.subjects, { label: "", col: "" }] }))}
                    style={{ fontSize: 12, color: "#0064E0", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add</button>
                </div>
                {mappings.subjects.map((sub, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 24px", gap: 6, marginBottom: 6 }}>
                    <input placeholder="Label (e.g. Physics)" value={sub.label}
                      onChange={e => setMappings(m => { const s = [...m.subjects]; s[i] = { ...s[i], label: e.target.value }; return { ...m, subjects: s }; })}
                      style={{ ...inp, fontSize: 13 }} />
                    <select value={sub.col}
                      onChange={e => setMappings(m => { const s = [...m.subjects]; s[i] = { ...s[i], col: e.target.value }; return { ...m, subjects: s }; })}
                      style={{ ...inp, fontSize: 13 }}>
                      <option value="">— column —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button onClick={() => setMappings(m => ({ ...m, subjects: m.subjects.filter((_, j) => j !== i) }))}
                      style={{ border: "none", background: "#FEE2E2", color: "#DC2626", borderRadius: 6, cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {headers.length > 0 && (
            <button onClick={buildPreview}
              style={{ width: "100%", padding: "10px", border: "1.5px solid #0064E0", borderRadius: 10, background: "#EEF6FF", color: "#0064E0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
              Match Students & Preview
            </button>
          )}

          {preview.length > 0 && (
            <>
              <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "#059669", fontWeight: 600 }}>
                  ✓ {preview.length} students matched ({parsed.length - preview.length} unmatched — add those students first)
                </p>
                <div style={{ maxHeight: 120, overflowY: "auto" }}>
                  {preview.slice(0, 8).map((r, i) => (
                    <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#374151" }}>
                      #{r.rank} {r.name} — {r.total} marks
                    </p>
                  ))}
                  {preview.length > 8 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>...and {preview.length - 8} more</p>}
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
