import { useEffect, useMemo, useState } from "react";
import type { LibraryEntry } from "./ContentLibraryEditor";

type Props = {
  entries: LibraryEntry[];
  createTemplate: (id: string) => unknown;
  onSave: (id: string, data: unknown) => void;
  onCreate: (id: string, data: unknown) => void;
  onDelete: (id: string) => void;
};

type JsonObject = Record<string, unknown>;
const colors: Record<string, string> = {
  dialogue: "#8b5cf6", say: "#8b5cf6", narration: "#8b5cf6",
  wait: "#e5a229", delay: "#e5a229", pause: "#e5a229",
  sound: "#0f9f9a", audio: "#0f9f9a", music: "#0f9f9a",
  background: "#2878c7", scene: "#2878c7", camera: "#2878c7",
  choice: "#d977b5", branch: "#d977b5", condition: "#d977b5",
  default: "#4c9a68",
};
const base: React.CSSProperties = { color: "var(--ui-text)", minWidth: 0 };
const button: React.CSSProperties = { background: "var(--ui-surface-soft)", color: "var(--ui-text)", border: "1px solid var(--ui-border)", borderRadius: 7, padding: "7px 10px", cursor: "pointer", font: "inherit", fontSize: 12 };
const input: React.CSSProperties = { background: "#202831", color: "var(--ui-text)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 5, padding: "6px 8px", font: "inherit", fontSize: 12, minWidth: 0, boxSizing: "border-box", width: "100%" };

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}
function actionType(action: unknown): string {
  const object = asObject(action);
  return String(object?.type ?? object?.action ?? object?.command ?? "action");
}
function labelFor(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function parseEditedValue(previous: unknown, raw: string): unknown {
  if (typeof previous === "number") {
    if (raw.trim() === "") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : previous;
  }
  if (typeof previous === "boolean") return raw === "true";
  if (previous === null) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  if (typeof previous === "object") {
    try { return JSON.parse(raw); } catch { return previous; }
  }
  return raw;
}

export default function BlockSceneScriptEditor({ entries, createTemplate, onSave, onCreate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [newId, setNewId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const data = asObject(selected?.data);
  const isCurrentScene = selected?.id.startsWith("__scene__/") ?? false;
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  const filtered = useMemo(() => entries.filter((entry) => (entry.id + " " + entry.label).toLowerCase().includes(search.toLowerCase())), [entries, search]);

  useEffect(() => { setStatus(""); setError(""); setDragIndex(null); }, [selectedId]);

  function commit(nextData: JsonObject, message = "Autosaving…") {
    if (!selected) return;
    onSave(selected.id, nextData);
    setStatus(message);
    setError("");
  }
  function updateAction(index: number, nextAction: unknown) {
    if (!data) return;
    const nextActions = [...actions];
    nextActions[index] = nextAction;
    commit({ ...data, actions: nextActions });
  }
  function updateActionField(index: number, key: string, value: unknown) {
    const action = asObject(actions[index]);
    if (!action) return;
    updateAction(index, { ...action, [key]: value });
  }
  function addAction(type: string) {
    if (!data || !selected) return;
    const nextActions = [...actions, { type }];
    commit({ ...data, actions: nextActions }, "Action added · autosaving…");
  }
  function removeAction(index: number) {
    if (!data) return;
    commit({ ...data, actions: actions.filter((_, i) => i !== index) }, "Action removed · autosaving…");
  }
  function moveAction(from: number, to: number) {
    if (!data || to < 0 || to >= actions.length || from === to) return;
    const next = [...actions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit({ ...data, actions: next }, "Order changed · autosaving…");
  }
  function createScript() {
    const id = newId.trim().replace(/\\/g, "/").replace(/\.json$/i, "");
    if (!id) return setError("Enter a script filename first.");
    if (id.includes("..") || id.startsWith("/") || /[^a-zA-Z0-9_./-]/.test(id) || id.endsWith("/")) return setError("Use letters, numbers, underscores, hyphens, and folders only.");
    if (entries.some((entry) => entry.id.toLowerCase() === id.toLowerCase())) return setError("That script already exists.");
    onCreate(id, createTemplate(id));
    setSelectedId(id);
    setNewId("");
    setError("");
  }
  function updateScriptField(key: string, raw: string) {
    if (!data) return;
    const previous = data[key];
    commit({ ...data, [key]: parseEditedValue(previous, raw) });
  }
  function addScriptField() {
    if (!data) return;
    const key = prompt("New script field name:");
    if (!key?.trim()) return;
    if (key === "actions" || key in data) return setError("That field already exists or is reserved.");
    commit({ ...data, [key]: "" });
  }
  function duplicate() {
    if (!selected) return;
    const baseId = selected.id + "_copy";
    let id = baseId, n = 2;
    while (entries.some((entry) => entry.id === id)) id = baseId + n++;
    onCreate(id, selected.data);
    setSelectedId(id);
  }

  return <div style={{ ...base, display: "flex", flexDirection: "column", height: "100%", padding: 20, gap: 14, boxSizing: "border-box" }}>
    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingBottom: 14, borderBottom: "1px solid var(--ui-border)" }}>
      <div><h1 style={{ margin: 0, fontSize: 22 }}>Scene Scripts</h1><p style={{ margin: "6px 0 0", color: "var(--ui-text-muted)", fontSize: 13 }}>Build cutscenes by snapping action blocks together. Changes autosave to individual JSON files.</p></div>
      <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{entries.length} script{entries.length === 1 ? "" : "s"}</span>
    </header>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(205px, 260px) minmax(0, 1fr)", gap: 16, flex: 1, minHeight: 0 }}>
      <aside style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 0 }}>
        <input aria-label="Search scripts" style={{ ...input, padding: 9 }} placeholder="Search scripts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6 }}>
          <input aria-label="New script filename" style={{ ...input, flex: 1 }} placeholder="script_filename" value={newId} onChange={(e) => setNewId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createScript(); }} />
          <button style={button} onClick={createScript}>+ Add</button>
        </div>
        {error && <div role="alert" style={{ color: "var(--ui-red)", fontSize: 12 }}>{error}</div>}
        <div style={{ overflow: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((entry) => <button key={entry.id} onClick={() => setSelectedId(entry.id)} style={{ ...button, textAlign: "left", padding: "10px 9px", background: selectedId === entry.id ? "var(--ui-surface-hover)" : "transparent", borderColor: selectedId === entry.id ? "var(--ui-blue)" : "transparent", display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontSize: 12, overflowWrap: "anywhere" }}>{entry.label || entry.id}</strong><span style={{ color: "var(--ui-text-muted)", fontSize: 10, overflowWrap: "anywhere" }}>{entry.id}</span>
          </button>)}
          {!filtered.length && <p style={{ color: "var(--ui-text-muted)", fontSize: 12, padding: 8 }}>No scripts found.</p>}
        </div>
      </aside>
      <section style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, gap: 12 }}>
        {selected && data ? <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div><strong style={{ fontSize: 15 }}>{String(data.name ?? selected.label ?? selected.id)}</strong><div style={{ color: "var(--ui-text-muted)", fontSize: 11, marginTop: 3 }}>{selected.id}.json · {actions.length} action{actions.length === 1 ? "" : "s"}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span aria-live="polite" style={{ fontSize: 11, color: "var(--ui-text-muted)", marginRight: 4 }}>{status}</span>
              {!isCurrentScene && <button style={button} onClick={duplicate}>Duplicate</button>}
              {!isCurrentScene && <button style={{ ...button, color: "var(--ui-red)" }} onClick={() => { if (window.confirm("Delete " + selected.id + "? This cannot be undone.")) { onDelete(selected.id); setSelectedId(""); } }}>Delete</button>
            </div>
          </div>
          {!isCurrentScene && <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", background: "var(--ui-surface-soft)", border: "1px solid var(--ui-border)", borderRadius: 9 }}>
            <label style={{ fontSize: 11, color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>Script name</label>
            <input aria-label="Script name" style={{ ...input, width: 220 }} value={String(data.name ?? "")} onChange={(e) => commit({ ...data, name: e.target.value })} />
            <button style={button} onClick={addScriptField}>+ Metadata field</button>
            <span style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>Other top-level JSON fields are retained.</span>
          </div>}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", borderRadius: 10, border: "1px solid var(--ui-border)", background: "radial-gradient(circle at 1px 1px, rgba(150,165,180,.14) 1px, transparent 0) 0 0 / 18px 18px, var(--ui-bg, #171e26)", padding: 18 }}>
            <div style={{ maxWidth: 850, margin: "0 auto" }}>
              <div style={{ color: "var(--ui-text-muted)", fontSize: 11, marginBottom: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>When this cutscene runs</div>
              {actions.map((action, index) => {
                const object = asObject(action);
                const type = actionType(action);
                const color = colors[type.toLowerCase()] ?? colors.default;
                return <div key={index} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) moveAction(dragIndex, index); setDragIndex(null); }} onDragEnd={() => setDragIndex(null)} style={{ position: "relative", marginBottom: 12, opacity: dragIndex === index ? .48 : 1, filter: dragIndex === index ? "saturate(.7)" : "none" }}>
                  <div style={{ position: "absolute", left: 22, top: -7, width: 26, height: 14, borderRadius: "0 0 8px 8px", background: color, zIndex: 0 }} />
                  <div style={{ position: "relative", zIndex: 1, borderRadius: "10px 10px 8px 8px", overflow: "visible", background: color, boxShadow: "0 3px 0 rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px 9px", color: "white", borderBottom: "1px solid rgba(0,0,0,.14)" }}>
                      <span aria-hidden="true" style={{ cursor: "grab", fontSize: 16 }}>⠿</span><strong style={{ fontSize: 13, textTransform: "capitalize" }}>{labelFor(type)}</strong><span style={{ fontSize: 10, opacity: .8 }}>BLOCK {index + 1}</span><span style={{ flex: 1 }} />
                      {!isCurrentScene && <>
                        <button title="Move block up" aria-label={"Move action " + (index + 1) + " up"} disabled={index === 0} onClick={() => moveAction(index, index - 1)} style={{ ...button, padding: "3px 7px", color: "white", background: "rgba(0,0,0,.14)", borderColor: "rgba(255,255,255,.25)" }}>↑</button>
                        <button title="Move block down" aria-label={"Move action " + (index + 1) + " down"} disabled={index === actions.length - 1} onClick={() => moveAction(index, index + 1)} style={{ ...button, padding: "3px 7px", color: "white", background: "rgba(0,0,0,.14)", borderColor: "rgba(255,255,255,.25)" }}>↓</button>
                        <button title="Delete action" aria-label={"Delete action " + (index + 1)} onClick={() => removeAction(index)} style={{ ...button, padding: "3px 7px", color: "white", background: "rgba(0,0,0,.14)", borderColor: "rgba(255,255,255,.25)" }}>×</button>
                      </>}
                    </div>
                    {object ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 12, color: "white" }}>
                      {Object.entries(object).map(([key, value]) => <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: key === "text" || key === "dialogue" ? "min(100%, 320px)" : 120, flex: key === "text" || key === "dialogue" ? "1 1 320px" : "0 1 190px" }}>
                        <label style={{ fontSize: 10, opacity: .82 }}>{labelFor(key)}{key === "type" || key === "action" || key === "command" ? " · action kind" : ""}</label>
                        {typeof value === "boolean" ? <select aria-label={key} value={String(value)} onChange={(e) => updateActionField(index, key, e.target.value === "true")} style={input}><option value="true">true</option><option value="false">false</option></select>
                        : value !== null && typeof value === "object" ? <textarea aria-label={key} defaultValue={JSON.stringify(value)} spellCheck={false} onBlur={(e) => { try { updateActionField(index, key, JSON.parse(e.target.value)); } catch { setError("Invalid JSON in action field: " + key); } }} style={{ ...input, minHeight: 54, resize: "vertical", fontFamily: "ui-monospace, monospace" }} />
                        : <input aria-label={key} value={value === null ? "null" : String(value)} onChange={(e) => updateActionField(index, key, parseEditedValue(value, e.target.value))} style={{ ...input, background: "rgba(0,0,0,.15)", borderColor: "rgba(255,255,255,.24)", color: "white" }} />}
                      </div>)}
                      <button onClick={() => { const key = prompt("New action field name:"); if (!key?.trim()) return; if (key in object) return setError("That field already exists."); updateAction(index, { ...object, [key]: "" }); }} style={{ ...button, color: "white", background: "rgba(0,0,0,.14)", borderColor: "rgba(255,255,255,.25)" }}>+ Field</button>
                    </div> : <textarea aria-label={"Raw action JSON " + (index + 1)} defaultValue={JSON.stringify(action, null, 2)} onBlur={(e) => { try { updateAction(index, JSON.parse(e.target.value)); } catch { setError("Invalid JSON for action " + (index + 1)); } }} spellCheck={false} style={{ ...input, minHeight: 80, borderRadius: 7, margin: 10, width: "calc(100% - 20px)", fontFamily: "ui-monospace, monospace" }} />}
                  </div>
                  <div style={{ position: "absolute", left: 28, bottom: -8, width: 22, height: 12, borderRadius: "0 0 7px 7px", background: color, zIndex: 2 }} />
                </div>;
              })}
              {!isCurrentScene && <div style={{ marginTop: 22, padding: 14, border: "2px dashed var(--ui-border)", borderRadius: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ui-text-muted)", marginRight: 4 }}>Snap on another action:</span>
                {["dialogue", "wait", "sound", "background", "choice"].map((type) => <button key={type} onClick={() => addAction(type)} style={{ ...button, color: "white", background: colors[type], borderColor: "rgba(255,255,255,.2)", borderRadius: "7px 7px 4px 4px" }}>+ {labelFor(type)}</button>)}
                <button onClick={() => { const type = prompt("Action type name:"); if (type?.trim()) addAction(type.trim()); }} style={button}>+ Custom action</button>
              </div>}
              {isCurrentScene && <p style={{ color: "var(--ui-text-muted)", fontSize: 11 }}>Editing an existing scene: node fields save to the original chapter JSON. Reordering, adding, and deleting nodes are disabled here to preserve node-index links.</p>}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, color: "var(--ui-text-muted)", fontSize: 11 }}>
            <span>{error || "Drag blocks or use ↑ ↓ to reorder. Existing action fields are preserved."}</span><span>{status || "Autosaves as you edit"}</span>
          </div>
        </> : <div style={{ border: "1px dashed var(--ui-border)", borderRadius: 10, padding: 24, color: "var(--ui-text-muted)", margin: "auto", textAlign: "center" }}>Select a script or create one to start snapping actions together.</div>}
      </section>
    </div>
  </div>;
}
