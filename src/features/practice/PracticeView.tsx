import { useEffect, useMemo, useState } from "react";
import {
  createPracticeLog,
  getPracticeChallenges,
  getPracticeLogs,
  getPracticePreferences,
  getPracticeStages,
  savePracticeLessonState,
  savePracticePreference,
} from "../../data/practiceRepository";
import type {
  PracticeChallenge,
  PracticeLesson,
  PracticeLog,
  PracticePreference,
  PracticeRating,
  PracticeStage,
} from "../../engine/domain/practice/types";
import { openCurriculumUrl } from "../../engine/platform/opener";

type Tab = "PATH" | "LOG" | "PREFERENCES" | "CHALLENGES";

export function PracticeView() {
  const [tab, setTab] = useState<Tab>("PATH");
  const [stages, setStages] = useState<PracticeStage[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setStages(await getPracticeStages());
      setError("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="photography-page">
      <header className="page-header">
        <p className="eyebrow">SELF-PACED PRACTICE</p>
        <h1>Practice</h1>
        <p className="page-summary">Learn briefly. Practice deliberately. Review the result. Keep evidence of what changed.</p>
      </header>

      <div className="tab-row">
        {(["PATH", "LOG", "PREFERENCES", "CHALLENGES"] as const).map((item) => (
          <button className={tab === item ? "tab-button tab-button-active" : "tab-button"} key={item} onClick={() => setTab(item)} type="button">
            {item === "PATH" ? "Path" : item === "LOG" ? "Practice log" : item === "PREFERENCES" ? "My preferences" : "Challenges"}
          </button>
        ))}
      </div>

      {error ? <p className="error-copy">{error}</p> : null}
      {stages.length === 0 ? <p className="muted-copy">This plan does not define a practice track.</p> : null}
      {tab === "PATH" ? <PathTab stages={stages} onReload={load} /> : null}
      {tab === "LOG" ? <LogTab stages={stages} /> : null}
      {tab === "PREFERENCES" ? <PreferencesTab /> : null}
      {tab === "CHALLENGES" ? <ChallengesTab stages={stages} /> : null}
    </div>
  );
}

function PathTab({
  stages,
  onReload,
}: {
  stages: PracticeStage[];
  onReload: () => Promise<void>;
}) {
  const first = stages.find((stage) => stage.unlocked) ?? stages[0] ?? null;
  const [stageId, setStageId] = useState<number | null>(first?.id ?? null);
  const [lessonId, setLessonId] = useState<number | null>(first?.lessons[0]?.id ?? null);

  useEffect(() => {
    if (stageId === null && first) {
      setStageId(first.id);
      setLessonId(first.lessons[0]?.id ?? null);
    }
  }, [first, stageId]);

  const stage = stages.find((item) => item.id === stageId) ?? first;
  const lesson = stage?.lessons.find((item) => item.id === lessonId)
    ?? stage?.lessons[0]
    ?? null;

  if (!stage) return null;

  return (
    <div className="photo-path-layout">
      <aside className="photo-stage-index">
        {stages.map((item) => (
          <button
            className={`photo-stage-item ${item.id === stage.id ? "photo-stage-item-active" : ""}`}
            disabled={!item.unlocked}
            key={item.id}
            onClick={() => {
              setStageId(item.id);
              setLessonId(item.lessons[0]?.id ?? null);
            }}
            type="button"
          >
            <span>Stage {item.sortOrder}</span>
            <strong>{item.title}</strong>
            <small>{item.complete ? "Complete" : item.unlocked ? "Available" : "Locked"}</small>
          </button>
        ))}
      </aside>

      <div className="photo-stage-workspace">
        <header className="photo-stage-header">
          <p className="section-kicker">STAGE {stage.sortOrder}</p>
          <h2>{stage.title}</h2>
          <p>{stage.goal}</p>
        </header>

        <div className="photo-lesson-tabs">
          {stage.lessons.map((item) => (
            <button className={`photo-lesson-tab ${lesson?.id === item.id ? "photo-lesson-tab-active" : ""}`} key={item.id} onClick={() => setLessonId(item.id)} type="button">
              {item.sortOrder}. {item.title}
            </button>
          ))}
        </div>

        {lesson
          ? <LessonDetail lesson={lesson} onReload={onReload} />
          : <p className="muted-copy">No lessons in this stage.</p>}
      </div>
    </div>
  );
}

function LessonDetail({
  lesson,
  onReload,
}: {
  lesson: PracticeLesson;
  onReload: () => Promise<void>;
}) {
  const [learned, setLearned] = useState(lesson.learned);
  const [practiced, setPracticed] = useState(lesson.practiced);
  const [reviewed, setReviewed] = useState(lesson.reviewed);
  const [selected, setSelected] = useState(lesson.selectedExplained);
  const [notes, setNotes] = useState(lesson.notes);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLearned(lesson.learned);
    setPracticed(lesson.practiced);
    setReviewed(lesson.reviewed);
    setSelected(lesson.selectedExplained);
    setNotes(lesson.notes);
  }, [lesson]);

  async function save() {
    setBusy(true);
    try {
      await savePracticeLessonState(
        lesson.id,
        learned,
        practiced,
        reviewed,
        selected,
        notes,
      );
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="photo-lesson-detail">
      <header className="photo-lesson-header">
        <div><p className="section-kicker">LESSON {lesson.sortOrder}</p><h2>{lesson.title}</h2></div>
        <span>{lesson.completedAt ? "Complete" : "In progress"}</span>
      </header>

      <section className="photo-assignment"><strong>Concept</strong><p>{lesson.concept}</p></section>
      <section className="photo-assignment"><strong>Practice assignment</strong><p>{lesson.practiceAssignment}</p></section>
      <section className="photo-assignment"><strong>Review prompts</strong><p>{lesson.reviewPrompts}</p></section>

      {lesson.resources.length > 0 ? (
        <section className="photo-resources">
          <strong>Resources</strong>
          {lesson.resources.map((resource) => (
            <button className="photo-resource-row" key={resource.id} onClick={() => void openCurriculumUrl(resource.url)} type="button">
              <span>{resource.label}</span><small>{resource.url}</small>
            </button>
          ))}
        </section>
      ) : null}

      <section className="photo-proof">
        <strong>Completion proof</strong>
        <label className="check-line"><input checked={learned} onChange={(event) => setLearned(event.target.checked)} type="checkbox" /><span>Learned the concept</span></label>
        <label className="check-line"><input checked={practiced} onChange={(event) => setPracticed(event.target.checked)} type="checkbox" /><span>Completed the practice assignment</span></label>
        <label className="check-line"><input checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} type="checkbox" /><span>Reviewed the result</span></label>
        <label className="check-line"><input checked={selected} onChange={(event) => setSelected(event.target.checked)} type="checkbox" /><span>Selected and explained representative work</span></label>
        <textarea className="text-area" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Lesson notes" />
        <button className="primary-button" disabled={busy} onClick={() => void save()} type="button">Save lesson</button>
      </section>
    </section>
  );
}

function LogTab({ stages }: { stages: PracticeStage[] }) {
  const lessons = stages.flatMap((stage) => stage.lessons);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [practiceDate, setPracticeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goal, setGoal] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [file, setFile] = useState("");
  const [best, setBest] = useState("");
  const [worst, setWorst] = useState("");
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLogs(await getPracticeLogs());
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createPracticeLog({
        lessonId: lessonId ? Number(lessonId) : null,
        title,
        practiceDate,
        goal,
        quantity: Math.max(0, Number(quantity) || 0),
        representativeFile: file || null,
        bestNotes: best,
        worstNotes: worst,
        reflection,
      });
      setTitle("");
      setGoal("");
      setQuantity("0");
      setFile("");
      setBest("");
      setWorst("");
      setReflection("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shoot-log-layout">
      <section className="shoot-log-form">
        <div className="section-heading"><div><p className="section-kicker">PRACTICE RECORD</p><h2>Log a session</h2></div></div>
        <label><span className="field-label">Title</span><input className="plain-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label><span className="field-label">Date</span><input className="plain-input" type="date" value={practiceDate} onChange={(event) => setPracticeDate(event.target.value)} /></label>
        <label><span className="field-label">Lesson</span><select className="plain-input" value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">Not linked</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
        <label><span className="field-label">Goal</span><textarea className="text-area" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
        <label><span className="field-label">Quantity or repetitions</span><input className="plain-input" min="0" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        <label><span className="field-label">Representative file reference</span><input className="plain-input" value={file} onChange={(event) => setFile(event.target.value)} /></label>
        <label><span className="field-label">What worked best?</span><textarea className="text-area" value={best} onChange={(event) => setBest(event.target.value)} /></label>
        <label><span className="field-label">What worked least well?</span><textarea className="text-area" value={worst} onChange={(event) => setWorst(event.target.value)} /></label>
        <label><span className="field-label">Reflection</span><textarea className="text-area" value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
        <button className="primary-button" disabled={busy || !title.trim()} onClick={() => void save()} type="button">Save practice</button>
      </section>

      <section className="shoot-log-history">
        <div className="section-heading"><div><p className="section-kicker">HISTORY</p><h2>Practice sessions</h2></div><span>{logs.length}</span></div>
        {logs.length === 0 ? <p className="muted-copy">No practice sessions logged yet.</p> : null}
        {logs.map((log) => (
          <article className="shoot-log-row" key={log.id}>
            <div className="row-meta"><span>{log.practiceDate}</span><span>{log.quantity} units</span>{log.lessonTitle ? <span>{log.lessonTitle}</span> : null}</div>
            <strong>{log.title}</strong>
            <p>{log.reflection || log.goal || "No reflection."}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function PreferencesTab() {
  const [items, setItems] = useState<PracticePreference[]>([]);
  async function load() {
    setItems(await getPracticePreferences());
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="taste-panel">
      <div className="section-heading"><div><p className="section-kicker">PREFERENCES</p><h2>What fits you?</h2></div></div>
      <p>Rate a category after you have actually tried it. The rating is descriptive, not a score.</p>
      {items.length === 0 ? <p className="muted-copy">This plan does not define practice categories.</p> : null}
      {items.map((item) => <PreferenceRow item={item} key={item.categoryId} onSaved={load} />)}
    </section>
  );
}

function PreferenceRow({
  item,
  onSaved,
}: {
  item: PracticePreference;
  onSaved: () => Promise<void>;
}) {
  const [rating, setRating] = useState<PracticeRating>(item.rating);
  const [note, setNote] = useState(item.note);
  return (
    <div className="taste-row">
      <strong>{item.name}</strong>
      <select className="plain-input" value={rating ?? ""} onChange={(event) => setRating((event.target.value || null) as PracticeRating)}>
        <option value="">Not rated</option>
        <option value="LOVE">Love</option>
        <option value="LIKE">Like</option>
        <option value="NEUTRAL">Neutral</option>
        <option value="DISLIKE">Dislike</option>
      </select>
      <input className="plain-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
      <button className="quiet-button" onClick={() => void savePracticePreference(item.categoryId, rating, note).then(onSaved)} type="button">Save</button>
    </div>
  );
}

function ChallengesTab({ stages }: { stages: PracticeStage[] }) {
  const highest = useMemo(
    () => Math.max(0, ...stages.filter((stage) => stage.unlocked).map((stage) => stage.sortOrder)),
    [stages],
  );
  const [challenges, setChallenges] = useState<PracticeChallenge[]>([]);
  const [chosen, setChosen] = useState<PracticeChallenge | null>(null);

  useEffect(() => {
    void getPracticeChallenges(highest).then((rows) => {
      setChallenges(rows);
      setChosen(rows[0] ?? null);
    });
  }, [highest]);

  function choose() {
    if (challenges.length === 0) return;
    const currentIndex = chosen
      ? challenges.findIndex((item) => item.id === chosen.id)
      : -1;
    setChosen(challenges[(currentIndex + 1) % challenges.length] ?? null);
  }

  return (
    <section className="photo-challenge-panel">
      <div className="section-heading"><div><p className="section-kicker">CHALLENGE</p><h2>{chosen?.title ?? "No challenge available"}</h2></div></div>
      <p>{chosen?.prompt ?? "Complete an unlocked stage or add challenges to your configuration."}</p>
      <button className="primary-button" disabled={challenges.length === 0} onClick={choose} type="button">Give me another challenge</button>
    </section>
  );
}
