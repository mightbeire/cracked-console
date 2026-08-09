import { useEffect, useMemo, useState } from "react";
import { CurriculumText } from "../../components/CurriculumText/CurriculumText";
import {
  assessmentTypeLabel,
  assessmentRatio,
} from "../../engine/domain/assessment/rules";
import type {
  AssessmentDraft,
  AssessmentErrorCategory,
  RepairTask,
  ScheduledProof,
  AssessmentAttempt,
} from "../../engine/domain/assessment/types";
import {
  createAssessmentAttempt,
  getAssessmentHistory,
  getOpenRepairTasks,
  getProofSchedule,
  resolveRepairTaskManually,
} from "../../data/proofRepository";

const errorOptions: Array<{ value: AssessmentErrorCategory; label: string }> = [
  { value: "KNOWLEDGE", label: "Knowledge" },
  { value: "REASONING", label: "Reasoning" },
  { value: "MEMORY", label: "Memory" },
  { value: "CARELESS_EXECUTION", label: "Careless execution" },
  { value: "MISREAD", label: "Misread" },
  { value: "AI_OVERRELIANCE", label: "AI overreliance" },
];

type LoadState =
  | { status: "loading" }
  | { status: "ready"; schedule: ScheduledProof[]; attempts: AssessmentAttempt[]; repairs: RepairTask[] }
  | { status: "error"; message: string };

interface AttemptTarget {
  proof: ScheduledProof;
  parentAssessmentId: number | null;
  repairTaskId: number | null;
}

function AttemptForm({ target, onCancel, onSaved }: {
  target: AttemptTarget;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [score, setScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [independent, setIndependent] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<AssessmentErrorCategory[]>([]);
  const [busy, setBusy] = useState(false);

  const numericScore = Number(score);
  const numericMax = Number(maxScore);
  const valid = Number.isFinite(numericScore) && Number.isFinite(numericMax) && numericScore >= 0 && numericMax > 0 && numericScore <= numericMax;
  const ratio = valid ? assessmentRatio(numericScore, numericMax) : 0;

  function toggleError(category: AssessmentErrorCategory) {
    setErrors((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      const draft: AssessmentDraft = {
        sourceDayId: target.proof.dayId,
        sourceWeekNumber: target.proof.weekNumber,
        assessmentType: target.repairTaskId ? "REPAIR_RETEST" : target.proof.assessmentType,
        parentAssessmentId: target.parentAssessmentId,
        repairTaskId: target.repairTaskId,
        score: numericScore,
        maxScore: numericMax,
        independent,
        notes,
        errorCategories: errors,
      };
      await createAssessmentAttempt(draft);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="record-panel" aria-labelledby="record-attempt-title">
      <div className="record-panel-heading">
        <div>
          <p className="section-kicker">{target.repairTaskId ? "FRESH RETEST" : assessmentTypeLabel(target.proof.assessmentType)}</p>
          <h2 id="record-attempt-title">{target.proof.title}</h2>
          <p>{target.proof.dateLabel} · Day {String(target.proof.dayNumber).padStart(3, "0")}</p>
        </div>
        <button className="quiet-button" onClick={onCancel} type="button">Close</button>
      </div>

      <CurriculumText markdown={target.proof.instructionsMarkdown} />

      <div className="score-grid">
        <label>
          <span className="field-label">Score</span>
          <input className="plain-input" min="0" onChange={(event) => setScore(event.target.value)} type="number" value={score} />
        </label>
        <label>
          <span className="field-label">Maximum</span>
          <input className="plain-input" min="1" onChange={(event) => setMaxScore(event.target.value)} type="number" value={maxScore} />
        </label>
        <div className="score-readout">
          <span className="field-label">Result preview</span>
          <strong>{valid ? `${Math.round(ratio * 100)}% · ${ratio >= 0.7 ? "PASS" : "REPAIR"}` : "Enter a valid score"}</strong>
        </div>
      </div>

      <label className="check-line">
        <input checked={independent} onChange={(event) => setIndependent(event.target.checked)} type="checkbox" />
        <span>Independent first attempt / retest</span>
      </label>

      <fieldset className="error-fieldset">
        <legend>Error categories</legend>
        <div className="error-grid">
          {errorOptions.map((option) => (
            <label className="check-line" key={option.value}>
              <input checked={errors.includes(option.value)} onChange={() => toggleError(option.value)} type="checkbox" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        <span className="field-label">Examiner / repair notes</span>
        <textarea className="text-area" onChange={(event) => setNotes(event.target.value)} value={notes} />
      </label>

      <div className="record-actions">
        <button className="primary-button" disabled={busy || !valid} onClick={() => void save()} type="button">
          Record attempt
        </button>
      </div>
    </section>
  );
}

function RepairList({ repairs, attempts, schedule, onRetest, onResolved }: {
  repairs: RepairTask[];
  attempts: AssessmentAttempt[];
  schedule: ScheduledProof[];
  onRetest: (target: AttemptTarget) => void;
  onResolved: () => Promise<void>;
}) {
  if (repairs.length === 0) {
    return <p className="muted-copy">No open assessment repairs.</p>;
  }

  return (
    <div className="repair-list">
      {repairs.map((repair) => {
        const original = repair.assessmentId ? attempts.find((attempt) => attempt.id === repair.assessmentId) : undefined;
        const proof = repair.dayNumber ? schedule.find((item) => item.dayNumber === repair.dayNumber) : undefined;
        return (
          <article className="repair-row" key={repair.id}>
            <div>
              <div className="row-meta"><span>{repair.priority}</span><span>{repair.dependencyRisk} dependency risk</span></div>
              <strong>{repair.dayNumber ? `Day ${String(repair.dayNumber).padStart(3, "0")}` : "Assessment repair"}</strong>
              <p>{repair.reason}</p>
            </div>
            <div className="row-actions">
              <button
                className="secondary-button"
                disabled={!proof || !original}
                onClick={() => {
                  if (proof && original) onRetest({ proof, parentAssessmentId: original.id, repairTaskId: repair.id });
                }}
                type="button"
              >
                Fresh retest
              </button>
              <button className="quiet-button" onClick={() => void resolveRepairTaskManually(repair.id).then(onResolved)} type="button">
                Resolve via equivalent evidence
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ProofView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [target, setTarget] = useState<AttemptTarget | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    try {
      const [schedule, attempts, repairs] = await Promise.all([
        getProofSchedule(),
        getAssessmentHistory(),
        getOpenRepairTasks(),
      ]);
      setState({ status: "ready", schedule, attempts, repairs });
      setTarget(null);
    } catch (error: unknown) {
      setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  useEffect(() => { void load(); }, []);

  const visibleSchedule = useMemo(() => {
    if (state.status !== "ready") return [];
    const query = filter.trim().toLowerCase();
    if (!query) return state.schedule;
    return state.schedule.filter((proof) =>
      `${proof.title} ${proof.dayNumber} ${proof.weekNumber} ${assessmentTypeLabel(proof.assessmentType)}`.toLowerCase().includes(query),
    );
  }, [filter, state]);

  if (state.status === "loading") return <div className="proof-state"><p>Opening Proof...</p></div>;
  if (state.status === "error") return <div className="proof-state"><h1>Proof could not open</h1><p>{state.message}</p></div>;

  return (
    <div className="proof-page">
      <header className="page-header">
        <p className="eyebrow">ASSESSMENT + REPAIR</p>
        <h1>Proof</h1>
        <p className="page-summary">First attempts stay preserved. Failed work creates repair work. Retests are new attempts, never replacements.</p>
      </header>

      <section className="proof-section">
        <div className="section-heading">
          <div><p className="section-kicker">LEARNING DEBT</p><h2>Open assessment repairs</h2></div>
          <span>{state.repairs.length}</span>
        </div>
        <RepairList repairs={state.repairs} attempts={state.attempts} schedule={state.schedule} onRetest={setTarget} onResolved={load} />
      </section>

      {target ? <AttemptForm target={target} onCancel={() => setTarget(null)} onSaved={load} /> : null}

      <section className="proof-section">
        <div className="section-heading">
          <div><p className="section-kicker">SCHEDULED</p><h2>Assessment blocks in your plan</h2></div>
          <span>{state.schedule.length}</span>
        </div>
        <input
          className="plain-input proof-filter"
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by day, week, proof, exam, defence..."
          type="search"
          value={filter}
        />
        <div className="proof-list">
          {visibleSchedule.length === 0 ? <p className="muted-copy">No assessment blocks were detected. Add Proof, Exam, Defence, or Check to a block label or its instructions to schedule it here.</p> : null}
          {visibleSchedule.map((proof) => {
            const latest = state.attempts.find((attempt) => attempt.dayNumber === proof.dayNumber);
            return (
              <article className="proof-row" key={proof.key}>
                <div>
                  <div className="row-meta">
                    <span>DAY {String(proof.dayNumber).padStart(3, "0")}</span>
                    <span>W{proof.weekNumber}</span>
                    <span>{assessmentTypeLabel(proof.assessmentType)}</span>
                  </div>
                  <strong>{proof.title}</strong>
                  <p>{proof.dateLabel}</p>
                </div>
                <div className="proof-result">
                  {latest ? (
                    <>
                      <strong>{latest.score}/{latest.maxScore}</strong>
                      <span>{latest.status.replaceAll("_", " ")} · attempt {latest.attemptNumber}</span>
                    </>
                  ) : <span>Not attempted</span>}
                </div>
                <button className="secondary-button" onClick={() => setTarget({ proof, parentAssessmentId: null, repairTaskId: null })} type="button">
                  Record attempt
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="proof-section">
        <div className="section-heading">
          <div><p className="section-kicker">HISTORY</p><h2>Attempt history</h2></div>
          <span>{state.attempts.length}</span>
        </div>
        {state.attempts.length === 0 ? <p className="muted-copy">No assessment attempts recorded yet.</p> : (
          <div className="attempt-list">
            {state.attempts.map((attempt) => (
              <article className="attempt-row" key={attempt.id}>
                <div>
                  <div className="row-meta">
                    <span>{assessmentTypeLabel(attempt.assessmentType)}</span>
                    <span>Attempt {attempt.attemptNumber}</span>
                    <span>{attempt.independent ? "Independent" : "AI-assisted"}</span>
                  </div>
                  <strong>{attempt.dayNumber ? `Day ${String(attempt.dayNumber).padStart(3, "0")}` : "Unscheduled assessment"}</strong>
                  <p>{attempt.notes || "No notes."}</p>
                  {attempt.errorCategories.length ? <small>Errors: {attempt.errorCategories.map((item) => item.replaceAll("_", " ").toLowerCase()).join(", ")}</small> : null}
                </div>
                <div className="proof-result">
                  <strong>{attempt.score}/{attempt.maxScore}</strong>
                  <span>{attempt.status.replaceAll("_", " ")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
