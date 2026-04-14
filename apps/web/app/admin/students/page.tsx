"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string; parent: { phone: string; name: string } };
type Batch = { id: string; name: string };
type ImportRow = { name: string; enrollmentNo: string; batch: string; parentName: string; parentPhone: string };

function exportCSV(students: Student[]) {
  const rows = [
    ["Name", "Enrollment No", "Batch", "Parent Name", "Parent Phone"],
    ...students.map(s => [s.name, s.enrollmentNo, s.batch || "", s.parent?.name || "", s.parent?.phone || ""]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseImportCSV(text: string): ImportRow[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    const get = (keys: string[]) => vals[headers.findIndex(h => keys.includes(h))] ?? "";
    return {
      name: get(["name", "studentname"]),
      enrollmentNo: get(["enrollmentno", "enrollment", "rollno", "roll"]),
      batch: get(["batch", "class"]),
      parentName: get(["parentname", "parent", "fathername"]),
      parentPhone: get(["parentphone", "phone", "mobile", "contact"]),
    };
  }).filter(r => r.name && r.parentPhone);
}

const BATCH_COLORS: Record<number, string> = { 0: "#0064E0", 1: "#6441D2", 2: "#059669", 3: "#D97706", 4: "#DC2626", 5: "#0891B2" };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", enrollmentNo: "", batch: "", parentName: "", parentPhone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ name: "", enrollmentNo: "", batch: "", parentName: "", parentPhone: "" });
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const [sRes, bRes] = await Promise.all([
        fetch(q ? `/api/admin/students/search?q=${encodeURIComponent(q)}` : "/api/admin/students"),
        fetch("/api/admin/batches"),
      ]);
      const s = sRes.ok ? await sRes.json() : [];
      const b: Batch[] = bRes.ok ? await bRes.json() : [];
      setStudents(s);
      setBatches(b);
      setForm(f => ({ ...f, batch: f.batch || b[0]?.name || "" }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(search || undefined), 300); return () => clearTimeout(t); }, [search, load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast("Student added!", true);
        setShowModal(false);
        setForm({ name: "", enrollmentNo: "", batch: batches[0]?.name || "", parentName: "", parentPhone: "" });
        load();
      } else { showToast((await res.json()).message ?? "Failed", false); }
    } catch { showToast("Network error", false); }
    setSubmitting(false);
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setEditForm({ name: s.name, enrollmentNo: s.enrollmentNo, batch: s.batch || batches[0]?.name || "", parentName: s.parent?.name ?? "", parentPhone: s.parent?.phone ?? "" });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
      });
      if (res.ok) { showToast("Student updated", true); setEditStudent(null); load(); }
      else { showToast((await res.json()).message ?? "Failed", false); }
    } catch { showToast("Network error", false); }
    setEditing(false);
  }

  async function handleDelete() {
    if (!deleteStudent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/students/${deleteStudent.id}`, { method: "DELETE" });
      if (res.ok) { showToast("Student deleted", false); setDeleteStudent(null); load(); }
      else { showToast((await res.json()).message ?? "Failed", false); }
    } catch { showToast("Network error", false); }
    setDeleting(false);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseImportCSV(ev.target?.result as string);
      setImportRows(rows);
      if (!rows.length) showToast("No valid rows found. Check CSV format.", false);
      else showToast(`${rows.length} students ready to import`, true);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: importRows }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast(`Imported ${d.created} students. Skipped ${d.skipped}.`, true);
        setShowImport(false); setImportRows([]); load();
      } else showToast(d.message ?? "Import failed", false);
    } catch { showToast("Network error", false); }
    setImporting(false);
  }

  const batchColor = (name: string) => {
    const i = batches.findIndex(b => b.name === name);
    return BATCH_COLORS[i % 6] ?? "#6B7280";
  };

  const fieldList = [
    { label: "Student Name", key: "name", type: "text", placeholder: "Full name" },
    { label: "Enrollment No", key: "enrollmentNo", type: "text", placeholder: "e.g. JEE2026-001" },
    { label: "Parent Name", key: "parentName", type: "text", placeholder: "Parent full name" },
    { label: "Parent Phone (for app login)", key: "parentPhone", type: "tel", placeholder: "10 digit mobile number" },
  ];

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box", outline: "none", color: "#111827", background: "#fff" };

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: toast.ok ? "#ECFDF5" : "#FEF2F2", color: toast.ok ? "#059669" : "#DC2626", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}` }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0 }}>Students</h1>
          <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>{loading ? "Loading..." : `${students.length} student${students.length !== 1 ? "s" : ""} enrolled`}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => exportCSV(students)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1px solid #CED0D4", borderRadius: 100, background: "#fff", color: "#1C2B33", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button onClick={() => setShowImport(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1px solid #059669", borderRadius: 100, background: "#ECFDF5", color: "#059669", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import CSV
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0064E0", color: "#fff", border: "none", borderRadius: 100, padding: "9px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input placeholder="Search by name or enrollment no..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px 10px 40px", border: "1px solid #CED0D4", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", color: "#1C2B33", background: "#fff" }} />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Name", "Enrollment No", "Batch", "Parent Name", "Parent Phone", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 18px", textAlign: "left", color: "#9CA3AF", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No students found</td></tr>
              ) : students.map(s => (
                <tr key={s.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "13px 18px", fontWeight: 600, color: "#111827" }}>{s.name}</td>
                  <td style={{ padding: "13px 18px", color: "#6B7280", fontFamily: "monospace", fontSize: 13 }}>{s.enrollmentNo}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ background: batchColor(s.batch), color: "#fff", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: "inline-block" }}>{s.batch || "—"}</span>
                  </td>
                  <td style={{ padding: "13px 18px", color: "#374151" }}>{s.parent?.name ?? "—"}</td>
                  <td style={{ padding: "13px 18px", color: "#0064E0", fontSize: 13, fontFamily: "monospace" }}>{s.parent?.phone ?? "—"}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(s)} style={{ width: 30, height: 30, border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", color: "#4F46E5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setDeleteStudent(s)} style={{ width: 30, height: 30, border: "1px solid #FCA5A5", borderRadius: 8, background: "#FFF5F5", color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>Add New Student</h2>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "#F3F4F6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#6B7280" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fieldList.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} required value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Batch</label>
                <select value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))} style={inp}>
                  {batches.length === 0 && <option value="">No batches — create one first</option>}
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", border: "1.5px solid #E5E7EB", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: "#0064E0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>Edit Student</h2>
              <button onClick={() => setEditStudent(null)} style={{ border: "none", background: "#F3F4F6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#6B7280" }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fieldList.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} required value={(editForm as Record<string, string>)[f.key]}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Batch</label>
                <select value={editForm.batch} onChange={e => setEditForm(p => ({ ...p, batch: e.target.value }))} style={inp}>
                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button type="button" onClick={() => setEditStudent(null)} style={{ flex: 1, padding: "10px", border: "1.5px solid #E5E7EB", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={editing} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: "#0064E0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: editing ? "not-allowed" : "pointer", opacity: editing ? 0.7 : 1 }}>
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>Import Students from CSV</h2>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ border: "none", background: "#F3F4F6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#6B7280" }}>✕</button>
            </div>
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#0369A1" }}>
              CSV must have headers: <strong>Name, EnrollmentNo, Batch, ParentName, ParentPhone</strong><br />
              Students with existing enrollment numbers are skipped automatically.
            </div>
            <input type="file" accept=".csv" onChange={handleImportFile}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box", background: "#FAFAFA", marginBottom: 14 }} />
            {importRows.length > 0 && (
              <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 14, maxHeight: 160, overflowY: "auto" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>{importRows.length} students to import:</p>
                {importRows.slice(0, 8).map((r, i) => (
                  <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#6B7280" }}>{r.name} · {r.batch} · {r.parentPhone}</p>
                ))}
                {importRows.length > 8 && <p style={{ fontSize: 12, color: "#9CA3AF", margin: "4px 0 0" }}>...and {importRows.length - 8} more</p>}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowImport(false); setImportRows([]); }} style={{ flex: 1, padding: "10px", border: "1.5px solid #E5E7EB", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleImport} disabled={importing || importRows.length === 0}
                style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: importing || !importRows.length ? "#9CA3AF" : "#059669", color: "#fff", fontSize: 14, fontWeight: 700, cursor: importing || !importRows.length ? "not-allowed" : "pointer" }}>
                {importing ? "Importing..." : `Import ${importRows.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteStudent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", margin: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>Delete Student</h2>
              <button onClick={() => setDeleteStudent(null)} style={{ border: "none", background: "#F3F4F6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#6B7280" }}>✕</button>
            </div>
            <p style={{ color: "#374151", fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.6 }}>Delete <strong>{deleteStudent.name}</strong>? This removes all their attendance records.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteStudent(null)} style={{ flex: 1, padding: "10px", border: "1.5px solid #E5E7EB", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: deleting ? "#FCA5A5" : "#DC2626", color: "#fff", fontSize: 14, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
