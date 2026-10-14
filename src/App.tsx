import { useEffect, useRef, useState } from "react";
import chapter1 from "./data/chapter1.json";
import chapter2 from "./data/chapter2.json";
import chapter3 from "./data/chapter3.json";
import chapter4 from "./data/chapter4.json";
import chapter5 from "./data/chapter5.json";
import chapter6 from "./data/chapter6.json";
import wordBankData from "./data/word_bank.json";
import actorsData from "./data/actors.json";
import WordBankEditor from "./components/WordBankEditor";
import ContentLibraryEditor, { type LibraryEntry } from "./components/ContentLibraryEditor";
import BlockSceneScriptEditor from "./components/BlockSceneScriptEditor";
import type { Chapter, Scene } from "./types/content";
import { normalizeSceneTypes } from "./types/content";
import { resolveChapterWordReferences } from "./utils/wordReferences";
import Sidebar from "./components/Sidebar";
import SceneEditor from "./components/SceneEditor";

type WordEntry = typeof wordBankData.words[number];
type WordBank = { words: WordEntry[] };
type Chapters = Record<string, Chapter>;
type SelectedScene = { chapterId: string; sceneName: string } | null;
type Actor = Record<string, unknown>;

const bundledChapters: Chapters = {
  chapter1: chapter1 as Chapter,
  chapter2: chapter2 as Chapter,
  chapter3: chapter3 as Chapter,
  chapter4: chapter4 as Chapter,
  chapter5: chapter5 as Chapter,
  chapter6: chapter6 as Chapter,
};
const normalizedBundledChapters: Chapters = Object.fromEntries(
  Object.entries(bundledChapters).map(([chapterId, chapter]) => [
    chapterId,
    Object.fromEntries(Object.entries(chapter).map(([name, data]) => [name, Array.isArray(data) ? normalizeSceneTypes(data) : data])) as Chapter,
  ])
);
const bundledScripts = import.meta.glob("./data/scene_scripts/**/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const initialScripts: Record<string, unknown> = Object.fromEntries(
  Object.entries(bundledScripts).map(([path, data]) => [path.split("/scene_scripts/")[1].replace(/\.json$/, ""), data])
);

function App() {
  const [chapters, setChapters] = useState<Chapters>(() => resolveChapterWordReferences(normalizedBundledChapters, wordBankData.words));
  const [selectedChapterId, setSelectedChapterId] = useState("chapter1");
  const [selectedScene, setSelectedScene] = useState<SelectedScene>(null);
  const [activeTab, setActiveTab] = useState<"scenes" | "word-bank" | "scene-scripts" | "actors">("scenes");
  const [wordBank, setWordBank] = useState<WordBank>(() => wordBankData as WordBank);
  const [actors, setActors] = useState<Actor[]>(() => actorsData as Actor[]);
  const [sceneScripts, setSceneScripts] = useState<Record<string, unknown>>(initialScripts);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const previousChapters = useRef<Chapters | null>(null);
  const previousWordBank = useRef<WordBank | null>(null);
  const previousActors = useRef<Actor[] | null>(null);

  function queueAutosave(fileName: string, content: unknown) {
    const existing = saveTimers.current[fileName];
    if (existing) clearTimeout(existing);
    saveTimers.current[fileName] = setTimeout(async () => {
      try {
        const response = await fetch(`/__akeanquest/save/${fileName.split("/").map(encodeURIComponent).join("/")}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content, null, 2),
        });
        if (!response.ok) throw new Error(await response.text());
        console.info(`[AkeanQuest] Autosaved src/data/${fileName}`);
      } catch (error) {
        console.error(`[AkeanQuest] Autosave failed for ${fileName}:`, error);
      } finally { delete saveTimers.current[fileName]; }
    }, 700);
  }

  async function deleteContentFile(fileName: string) {
    const response = await fetch(`/__akeanquest/save/${fileName.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await response.text());
  }

  useEffect(() => {
    if (previousChapters.current) {
      for (const [chapterId, content] of Object.entries(chapters)) {
        if (previousChapters.current[chapterId] !== content) queueAutosave(`${chapterId}.json`, content);
      }
    }
    previousChapters.current = chapters;
  }, [chapters]);

  useEffect(() => {
    if (previousWordBank.current && previousWordBank.current !== wordBank) {
      queueAutosave("word_bank.json", wordBank);
      setChapters((current) => resolveChapterWordReferences(current, wordBank.words));
    }
    previousWordBank.current = wordBank;
  }, [wordBank]);

  useEffect(() => {
    if (previousActors.current && previousActors.current !== actors) queueAutosave("actors.json", actors);
    previousActors.current = actors;
  }, [actors]);

  function handleSave() {
    if (!selectedScene) return;
    const content = chapters[selectedScene.chapterId];
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = selectedScene.chapterId + ".json"; link.click(); URL.revokeObjectURL(url);
  }

  function handleAddScene() {
    const chapterId = selectedChapterId;
    const sceneName = prompt("Enter scene name:");
    if (!sceneName) return;
    const currentChapter = chapters[chapterId];
    if (currentChapter[sceneName]) { alert("A scene with that name already exists."); return; }
    const newScene: Scene = [
      { type: "start_router", start_index_if_flag: { default: 1 } },
      { type: "dialogue", speaker: "", text: "", next: null, word_ids: [] },
    ];
    setChapters({ ...chapters, [chapterId]: { ...currentChapter, [sceneName]: newScene } });
    setSelectedScene({ chapterId, sceneName });
  }

  function handleArchiveScene() {
    if (!selectedScene) return;
    const currentChapter = chapters[selectedScene.chapterId];
    if (!currentChapter[selectedScene.sceneName]) return;
    if (!confirm(`Archive "${selectedScene.sceneName}"?`)) return;
    const remaining = Object.fromEntries(Object.entries(currentChapter).filter(([name]) => name !== selectedScene.sceneName)) as Chapter;
    setChapters({ ...chapters, [selectedScene.chapterId]: remaining });
    setSelectedScene(null);
  }

  const selectedChapter = selectedScene ? chapters[selectedScene.chapterId] : null;
  const selectedData = selectedScene && selectedChapter ? selectedChapter[selectedScene.sceneName] : null;
  const actorEntries: LibraryEntry[] = actors.map((actor, index) => ({
    id: String(actor.id ?? actor.actor_id ?? `actor_${index + 1}`),
    label: String(actor.name ?? actor.display_name ?? actor.id ?? `Actor ${index + 1}`),
    data: actor,
  }));
  const scriptEntries: LibraryEntry[] = Object.entries(sceneScripts).map(([id, data]) => ({
    id,
    label: Array.isArray(data) ? id : String((data as { name?: unknown } | null)?.name ?? id),
    // Some existing scripts are raw action arrays instead of { name, actions } objects.
    // Normalize only for the block UI; onSave writes them back as arrays.
    data: Array.isArray(data) ? { name: id, actions: data } : data,
  }));

  return <div className="editor-app">
    <header className="file-toolbar">
      <div className="file-toolbar-brand">AkeanQuest <span>Content Editor</span></div>
      <nav className="editor-tabs" aria-label="Editor tabs">
        <button type="button" className={activeTab === "scenes" ? "active" : ""} onClick={() => setActiveTab("scenes")}>Scenes</button>
        <button type="button" className={activeTab === "word-bank" ? "active" : ""} onClick={() => setActiveTab("word-bank")}>Word Bank</button>
        <button type="button" className={activeTab === "scene-scripts" ? "active" : ""} onClick={() => setActiveTab("scene-scripts")}>Scene Scripts</button>
        <button type="button" className={activeTab === "actors" ? "active" : ""} onClick={() => setActiveTab("actors")}>Characters / Actors</button>
      </nav>
    </header>
    <div className="editor-workspace">
      {activeTab === "scenes" ? <>
        <Sidebar chapters={chapters} selectedChapterId={selectedChapterId} selectedScene={selectedScene} onChapterChange={(chapterId) => { setSelectedChapterId(chapterId); setSelectedScene(null); }} onSelect={setSelectedScene} onAddScene={handleAddScene} />
        <main className="editor-main"><SceneEditor key={selectedScene ? selectedScene.chapterId + ":" + selectedScene.sceneName : "no-scene"} name={selectedScene?.sceneName ?? "No scene selected"} data={selectedData ?? null} onChange={(updatedData) => { if (!selectedScene) return; setChapters({ ...chapters, [selectedScene.chapterId]: { ...chapters[selectedScene.chapterId], [selectedScene.sceneName]: updatedData } }); }} onSave={handleSave} onArchive={handleArchiveScene} wordBank={wordBank.words} /></main>
      </> : activeTab === "word-bank" ? <main className="editor-main"><WordBankEditor data={wordBank} onChange={setWordBank} /></main>
      : activeTab === "scene-scripts" ? <main className="editor-main"><BlockSceneScriptEditor entries={scriptEntries} createTemplate={(id) => ({ name: id, actions: [] })} onSave={(id, data) => { const savedData = Array.isArray(sceneScripts[id]) ? ((data as { actions?: unknown })?.actions ?? []) : data; setSceneScripts((current) => ({ ...current, [id]: savedData })); queueAutosave(`scene_scripts/${id}.json`, savedData); }} onCreate={(id, data) => { setSceneScripts((current) => ({ ...current, [id]: data })); queueAutosave(`scene_scripts/${id}.json`, data); }} onDelete={(id) => { const fileName = `scene_scripts/${id}.json`; if (saveTimers.current[fileName]) { clearTimeout(saveTimers.current[fileName]); delete saveTimers.current[fileName]; } setSceneScripts((current) => { const next = { ...current }; delete next[id]; return next; }); void deleteContentFile(fileName).catch((error) => alert(`Could not delete script file: ${error instanceof Error ? error.message : String(error)}`)); }} /></main>
      : <main className="editor-main"><ContentLibraryEditor title="Characters / Actors" noun="actor" description="Manage actor records in actors.json. Keep IDs stable when referenced by scene content." entries={actorEntries} createTemplate={(id) => ({ id, name: id, description: "" })} onSave={(id, data) => { const record = data as Actor; setActors((current) => current.map((actor, index) => String(actor.id ?? actor.actor_id ?? `actor_${index + 1}`) === id ? record : actor)); }} onCreate={(id, data) => setActors((current) => [...current, data as Actor])} onDelete={(id) => setActors((current) => current.filter((actor, index) => String(actor.id ?? actor.actor_id ?? `actor_${index + 1}`) !== id))} /></main>}
    </div>
  </div>;
}
export default App;
