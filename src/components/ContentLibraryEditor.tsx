import { useEffect, useMemo, useState } from "react";

export type LibraryEntry = { id: string; label: string; data: unknown };
type Props = {
  title: string;
  description: string;
  noun: string;
  entries: LibraryEntry[];
  createTemplate: (id: string) => unknown;
  onSave: (id: string, data: unknown) => void;
  onCreate: (id: string, data: unknown) => void;
  onDelete: (id: string) => void;
};

const panel: React.CSSProperties = { display: "flex", flexDirection: "column", minWidth: 0, color: "var(--ui-text)", gap: 16, padding: 20, height: "100%", boxSizing: "border-box" };
const field: React.CSSProperties = { background: "#202831", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 7, padding: "9px 10px", font: "inherit", width: "100%", boxSizing: "border-box" };
const button: React.CSSProperties = { background: "var(--ui-surface-soft)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 7, padding: "8px 11px", cursor: "pointer" };

export default function ContentLibraryEditor({ title, description, noun, entries, createTemplate, onSave, onCreate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(() => entries.filter((entry) => (entry.id + " " + entry.label).toLowerCase().includes(search.toLowerCase())), [entries, search]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraft("");
      setError("");
      return;
    }
    setDraft(JSON.stringify(selected.data, null, 2));
    setError("");
    setStatus("");
  }, [selectedId, selected?.data]);

  function save() {
    if (!selected) return;
    try {
      const parsed: unknown = JSON.parse(draft);
      if (parsed === null || typeof parsed !== "object") throw new Error("The record must be a JSON object or array.");
      onSave(selected.id, parsed);
      setError("");
      setStatus("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setStatus("");
    }
  }

  function create() {
    const id = newId.trim().replace(/\\/g, "/");
    if (!id) return setError("Enter an ID or filename first.");
    if (id.includes("..") || id.startsWith("/") || /[^a-zA-Z0-9_./-]/.test(id) || id.endsWith("/")) return setError("Use letters, numbers, underscores, hyphens, and folders only.");
    if (entries.some((entry) => entry.id.toLowerCase() === id.toLowerCase())) return setError("That ID already exists.");
    onCreate(id, createTemplate(id));
    setSelectedId(id);
    setNewId("");
    setError("");
    setStatus("Created");
  }

  function duplicate() {
    if (!selected) return;
    const base = selected.id + "_copy";
    let id = base, n = 2;
    while (entries.some((entry) => entry.id === id)) id = base + n++;
    onCreate(id, selected.data);
    setSelectedId(id);
  }

  return <div style={panel}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--ui-border)", paddingBottom: 16 }}>
      <div><h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1><p style={{ margin: "6px 0 0", color: "var(--ui-text-muted)", fontSize: 13 }}>{description}</p></div>
      <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{entries.length} {noun}{entries.length === 1 ? "" : "s"}</span>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 290px) minmax(0, 1fr)", gap: 16, flex: 1, minHeight: 0 }}>
      <aside style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        <input aria-label={"Search " + noun} style={field} placeholder={"Search " + noun + "…"} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6 }}>
          <input aria-label={"New " + noun + " ID"} style={{ ...field, minWidth: 0 }} placeholder={noun === "script" ? "script_filename" : "actor_id"} value={newId} onChange={(e) => setNewId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
          <button style={button} onClick={create}>+ Add</button>
        </div>
        <div style={{ color: "var(--ui-text-muted)", fontSize: 11 }}>{noun === "script" ? "Script filenames are saved as individual JSON files." : "Each actor is a record in actors.json."}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "auto", minHeight: 0 }}>
          {filtered.map((entry) => <button key={entry.id} onClick={() => setSelectedId(entry.id)} style={{ ...button, textAlign: "left", background: selectedId === entry.id ? "var(--ui-surface-hover)" : "transparent", borderColor: selectedId === entry.id ? "var(--ui-blue)" : "transparent", display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontSize: 12, overflowWrap: "anywhere" }}>{entry.label || entry.id}</strong><span style={{ color: "var(--ui-text-muted)", fontSize: 10, overflowWrap: "anywhere" }}>{entry.id}</span>
          </button>)}
          {!filtered.length && <p style={{ color: "var(--ui-text-muted)", fontSize: 12, padding: 8 }}>No {noun}s found.</p>}
        </div>
      </aside>
      <section style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, gap: 10 }}>
        {selected ? <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div><strong>{selected.label || selected.id}</strong><div style={{ color: "var(--ui-text-muted)", fontSize: 11, marginTop: 3 }}>{selected.id}</div></div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button style={button} onClick={duplicate}>Duplicate</button><button style={{ ...button, color: "var(--ui-red)" }} onClick={() => { if (window.confirm("Delete " + selected.id + "? This cannot be undone.")) { onDelete(selected.id); setSelectedId(""); } }}>Delete</button><button style={{ ...button, background: "var(--ui-blue)", color: "white" }} onClick={save}>Save JSON</button></div>
          </div>
          <textarea aria-label="JSON record editor" spellCheck={false} value={draft} onChange={(e) => { setDraft(e.target.value); setError(""); setStatus(""); }} style={{ ...field, flex: 1, minHeight: 280, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre", tabSize: 2 }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ color: error ? "var(--ui-red)" : "var(--ui-green)" }}>{error || status || "JSON editor"}</span>
            <span style={{ color: "var(--ui-text-muted)" }}>JSON is validated before saving. Unknown fields are preserved.</span>
          </div>
        </> : <div style={{ border: "1px dashed var(--ui-border)", borderRadius: 10, padding: 24, color: "var(--ui-text-muted)", margin: "auto", textAlign: "center" }}>Select a {noun} or create one to get started.</div>}
      </section>
    </div>
  </div>;
}
