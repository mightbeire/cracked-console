import { useCallback, useEffect, useMemo, useState } from "react";
import { CurriculumText } from "../../components/CurriculumText/CurriculumText";
import { canCompleteDay, completionSummary, isLearningLogComplete } from "../../engine/domain/execution/completion";
import type { LearningLogDraft, TodayBlock, TodayDay } from "../../engine/domain/execution/types";
import {
  completeBlock,
  completeDay,
  getTodayDay,
  heartbeatRunningTimers,
  pauseBlockTimer,
  resetBlockTimer,
  saveLearningLog,
  setBlockNote,
  setDodComplete,
  startBlock,
} from "../../data/todayRepository";
import { formatElapsed } from "../../lib/time";
import { getSchedulePosition } from "../../data/planMetaRepository";
import type { ConfigSummary } from "../../engine/config/types";

type ViewState =
  | { status: "loading" }
  | { status: "prestart"; daysUntilStart: number }
  | { status: "complete" }
  | { status: "ready"; day: TodayDay; developmentOverride: boolean }
  | { status: "error"; message: string };

function elapsedSeconds(block: TodayBlock, clock: number): number {
  let total = block.timer.accumulatedSeconds;
  if (block.timer.state === "RUNNING" && block.timer.startedAt) {
    total += Math.max(0, Math.floor((clock - new Date(block.timer.startedAt).getTime()) / 1000));
  }
  return total;
}

function BlockCard({ dayId, block, clock, onChanged }: { dayId: number; block: TodayBlock; clock: number; onChanged: () => Promise<void> }) {
  const [note, setNote] = useState(block.note);
  const [busy, setBusy] = useState(false);
  const seconds = elapsedSeconds(block, clock);

  useEffect(() => setNote(block.note), [block.note]);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mission-block" aria-labelledby={`block-${block.id}`}>
      <div className="mission-heading-row">
        <div>
          <p className="section-kicker">{block.type.replace("_", " ")}</p>
          <h2 id={`block-${block.id}`}>{block.label}</h2>
        </div>
        <div className="mission-meta">
          <span>{block.plannedMinutes} min</span>
          <span>{block.status.replaceAll("_", " ")}</span>
        </div>
      </div>

      <CurriculumText markdown={block.instructionsMarkdown} />

      <div className="timer-row" aria-label={`${block.label} timer`}>
        <span className="timer-value">{formatElapsed(seconds)}</span>
        {block.status !== "COMPLETE" ? (
          <>
            {block.timer.state === "RUNNING" ? (
              <button className="secondary-button" disabled={busy} onClick={() => act(() => pauseBlockTimer(block.id))} type="button">Pause</button>
            ) : (
              <button className="secondary-button" disabled={busy} onClick={() => act(() => startBlock(dayId, block.id))} type="button">
                {block.status === "NOT_STARTED" ? "Start" : "Resume"}
              </button>
            )}
            <button className="quiet-button" disabled={busy || seconds === 0} onClick={() => act(() => resetBlockTimer(block.id))} type="button">Reset timer</button>
          </>
        ) : null}
      </div>

      <label className="field-label" htmlFor={`note-${block.id}`}>Block note</label>
      <textarea
        className="text-area compact-text-area"
        id={`note-${block.id}`}
        onBlur={() => void setBlockNote(block.id, note)}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note"
        value={note}
      />

      <div className="block-actions">
        <button
          className="primary-button"
          disabled={busy || block.status === "COMPLETE"}
          onClick={() => act(() => completeBlock(dayId, { ...block, note }))}
          type="button"
        >
          {block.status === "COMPLETE" ? "Complete" : "Mark block complete"}
        </button>
      </div>
    </section>
  );
}

function LearningLogPanel({ day, block, onChanged }: { day: TodayDay; block: TodayBlock; onChanged: () => Promise<void> }) {
  const [draft, setDraft] = useState<LearningLogDraft>(day.learningLog);
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(day.learningLog), [day.learningLog]);

  const fields: Array<{ key: keyof LearningLogDraft; label: string }> = [
    { key: "learned", label: "What did I learn?" },
    { key: "did", label: "What did I do?" },
    { key: "explainWithoutNotes", label: "Can I explain it without notes?" },
    { key: "confused", label: "What confused me?" },
    { key: "nextAction", label: "What is tomorrow's first action?" },
  ];

  async function save() {
    if (!isLearningLogComplete(draft)) return;
    setBusy(true);
    try {
      await saveLearningLog(day.id, block.id, draft);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mission-block" aria-labelledby="learning-log-title">
      <div className="mission-heading-row">
        <div>
          <p className="section-kicker">LEARNING LOG</p>
          <h2 id="learning-log-title">Close the loop</h2>
        </div>
        <div className="mission-meta"><span>15 min</span><span>{block.status.replaceAll("_", " ")}</span></div>
      </div>
      <CurriculumText markdown={block.instructionsMarkdown} />
      <div className="learning-log-grid">
        {fields.map((field) => (
          <label className="field-group" key={field.key}>
            <span className="field-label">{field.label}</span>
            <textarea
              className="text-area"
              onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
              value={draft[field.key]}
            />
          </label>
        ))}
      </div>
      <button className="primary-button" disabled={busy || !isLearningLogComplete(draft)} onClick={() => void save()} type="button">
        {block.status === "COMPLETE" ? "Save log again" : "Save learning log"}
      </button>
    </section>
  );
}

function RestDay({ day, totalDays }: { day: TodayDay; totalDays: number }) {
  return (
    <div className="rest-state">
      <p className="eyebrow">DAY {String(day.dayNumber).padStart(3, "0")} / {totalDays} / WEEK {day.weekNumber} / PHASE {day.phaseNumber}</p>
      <h1>Rest Day</h1>
      <p>{day.dateLabel}</p>
      <div className="rest-rule">
        <strong>0 scheduled learning hours.</strong>
        <span>No catch-up. No Learning Debt repayment.</span>
      </div>
    </div>
  );
}

function ActiveDay({ day, totalDays, developmentOverride, onReload }: { day: TodayDay; totalDays: number; developmentOverride: boolean; onReload: () => Promise<void> }) {
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const summary = completionSummary(day);
  const completeReady = canCompleteDay(day);
  const learningLogBlock = day.blocks.find((block) => ["LOG", "LEARNING_LOG"].includes(block.type.toUpperCase()));
  const executionBlocks = day.blocks.filter((block) => !["LOG", "LEARNING_LOG"].includes(block.type.toUpperCase()));

  const hasRunningTimer = useMemo(() => day.blocks.some((block) => block.timer.state === "RUNNING"), [day.blocks]);
  useEffect(() => {
    if (!hasRunningTimer) return undefined;

    const clockHandle = window.setInterval(() => setClock(Date.now()), 1000);
    const heartbeatHandle = window.setInterval(() => {
      void heartbeatRunningTimers();
    }, 5000);

    return () => {
      window.clearInterval(clockHandle);
      window.clearInterval(heartbeatHandle);
    };
  }, [hasRunningTimer]);

  async function finishDay() {
    if (!completeReady) return;
    setBusy(true);
    try {
      await completeDay(day);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="today-header">
        <p className="eyebrow">DAY {String(day.dayNumber).padStart(3, "0")} / {totalDays} / WEEK {day.weekNumber} / PHASE {day.phaseNumber}</p>
        <h1>{day.dateLabel}</h1>
        <div className="today-status-line">
          <span>{day.status.replaceAll("_", " ")}</span>
          <span>{summary.completeBlocks}/{summary.totalBlocks} blocks</span>
          <span>{summary.completeDod}/{summary.totalDod} DoD</span>
        </div>
        {developmentOverride ? <p className="dev-note">Development day override is active. Canonical schedule has not moved.</p> : null}
      </header>

      <div className="mission-stack">
        {executionBlocks.map((block) => (
          <BlockCard block={block} clock={clock} dayId={day.id} key={block.id} onChanged={onReload} />
        ))}
        {learningLogBlock ? <LearningLogPanel block={learningLogBlock} day={day} onChanged={onReload} /> : null}

        <section className="mission-block" aria-labelledby="dod-title">
          <div className="mission-heading-row">
            <div>
              <p className="section-kicker">DEFINITION OF DONE</p>
              <h2 id="dod-title">Today is complete when</h2>
            </div>
            <div className="mission-meta"><span>{summary.completeDod}/{summary.totalDod}</span></div>
          </div>
          <div className="dod-list">
            {day.dodItems.map((item) => (
              <label className="dod-item" key={item.id}>
                <input
                  checked={item.complete}
                  onChange={(event) => void setDodComplete(item.id, event.target.checked).then(onReload)}
                  type="checkbox"
                />
                <span>{item.text}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="day-closeout">
          <div>
            <p className="section-kicker">DAY STATUS</p>
            <h2>{day.status === "COMPLETED" ? "Day complete" : completeReady ? "Ready to complete" : "Requirements remain"}</h2>
            <p>{day.status === "COMPLETED" ? "Completion is saved locally." : "Required blocks, any configured learning log, and Definition of Done must all be complete."}</p>
          </div>
          <button className="primary-button" disabled={busy || !completeReady || day.status === "COMPLETED"} onClick={() => void finishDay()} type="button">
            {day.status === "COMPLETED" ? "Completed" : "Complete Day"}
          </button>
        </section>
      </div>
    </>
  );
}

export function TodayView({ planSummary }: { planSummary: ConfigSummary }) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const { position, developmentOverride } = await getSchedulePosition();
      if (position.kind === "PRE_START") {
        setState({ status: "prestart", daysUntilStart: position.daysUntilStart });
        return;
      }
      if (position.kind === "COMPLETE") {
        setState({ status: "complete" });
        return;
      }
      if (position.kind === "UNCONFIGURED") {
        setState({ status: "error", message: "No imported plan is configured." });
        return;
      }
      const day = await getTodayDay(position.dayNumber);
      setState({ status: "ready", day, developmentOverride });
    } catch (error: unknown) {
      setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state.status === "loading") return <div className="today-state"><p>Opening today's mission...</p></div>;
  if (state.status === "error") return <div className="today-state"><h1>Today could not open</h1><p>{state.message}</p></div>;
  if (state.status === "prestart") {
    return (
      <div className="today-state">
        <p className="eyebrow">PRE-START</p>
        <h1>The curriculum starts {planSummary.startDate}.</h1>
        <p>{state.daysUntilStart === 1 ? "1 day remains." : `${state.daysUntilStart} days remain.`}</p>
        <div className="rest-rule"><strong>No early Learning Debt.</strong><span>The schedule begins on the first configured day.</span></div>
      </div>
    );
  }
  if (state.status === "complete") return <div className="today-state"><p className="eyebrow">COMPLETE</p><h1>Your configured curriculum is complete.</h1></div>;
  if (state.day.isRestDay) return <RestDay day={state.day} totalDays={planSummary.days} />;
  return <ActiveDay day={state.day} totalDays={planSummary.days} developmentOverride={state.developmentOverride} onReload={load} />;
}
