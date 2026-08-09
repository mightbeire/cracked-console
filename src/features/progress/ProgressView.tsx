import { useEffect, useState } from "react";
import type { ConfigSummary } from "../../engine/config/types";
import type { ProgressSnapshot } from "../../engine/domain/progress/types";
import { getProgressSnapshot } from "../../data/progressRepository";
import { getSchedulePosition } from "../../data/planMetaRepository";

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0
    ? Math.min(100, Math.max(0, (value / max) * 100))
    : 0;
  return <div className="progress-bar" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>;
}

export function ProgressView({ planSummary }: { planSummary: ConfigSummary }) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const { position } = await getSchedulePosition();
        const dayNumber = position.kind === "ACTIVE"
          ? position.dayNumber
          : position.kind === "COMPLETE"
            ? planSummary.days
            : null;
        setSnapshot(await getProgressSnapshot(dayNumber));
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
  }, [planSummary.days]);

  if (error) {
    return <div className="progress-state"><h1>Progress could not open</h1><p>{error}</p></div>;
  }
  if (!snapshot) {
    return <div className="progress-state"><p>Loading progress...</p></div>;
  }

  const hours = Math.floor(snapshot.trackedMinutes / 60);
  const minutes = snapshot.trackedMinutes % 60;

  return (
    <div className="progress-page">
      <header className="page-header">
        <p className="eyebrow">FACTUAL PROGRESS</p>
        <h1>Progress</h1>
        <p className="page-summary">Recorded work only. No XP, streaks, or automatic mastery.</p>
      </header>

      <div className="progress-grid">
        <article className="progress-metric"><span>ACTIVE DAYS</span><strong>{snapshot.completedActiveDays}/{snapshot.totalActiveDays}</strong><small>{snapshot.elapsedActiveDays} active days elapsed</small><Bar value={snapshot.completedActiveDays} max={snapshot.totalActiveDays} /></article>
        <article className="progress-metric"><span>REQUIRED BLOCKS</span><strong>{snapshot.completedRequiredBlocks}/{snapshot.elapsedRequiredBlocks}</strong><small>complete among elapsed required blocks</small><Bar value={snapshot.completedRequiredBlocks} max={snapshot.elapsedRequiredBlocks} /></article>
        <article className="progress-metric"><span>TRACKED WORK</span><strong>{hours}h {minutes}m</strong><small>completed block time</small></article>
        <article className="progress-metric"><span>PROOF</span><strong>{snapshot.passingAttempts}/{snapshot.assessmentAttempts}</strong><small>passing / all attempts · {snapshot.openRepairs} open repairs</small><Bar value={snapshot.passingAttempts} max={snapshot.assessmentAttempts} /></article>
        <article className="progress-metric"><span>EVIDENCE</span><strong>{snapshot.verifiedEvidenceCount}/{snapshot.evidenceCount}</strong><small>verified / total</small><Bar value={snapshot.verifiedEvidenceCount} max={snapshot.evidenceCount} /></article>
        <article className="progress-metric"><span>PROJECTS</span><strong>{snapshot.projectsCompleted}/{snapshot.totalProjects}</strong><small>complete</small><Bar value={snapshot.projectsCompleted} max={snapshot.totalProjects} /></article>
        <article className="progress-metric"><span>READING</span><strong>{snapshot.readingComplete}/{snapshot.readingTotal}</strong><small>required books complete</small><Bar value={snapshot.readingComplete} max={snapshot.readingTotal} /></article>
        <article className="progress-metric"><span>PRACTICE</span><strong>{snapshot.practiceLessonsComplete}/{snapshot.practiceLessonsTotal}</strong><small>lessons complete</small><Bar value={snapshot.practiceLessonsComplete} max={snapshot.practiceLessonsTotal} /></article>
      </div>

      <section className="progress-section">
        <div className="section-heading"><div><p className="section-kicker">SKILL TRANSCRIPT</p><h2>Current levels</h2></div><span>{snapshot.totalSkills}</span></div>
        <div className="skill-level-distribution">
          {snapshot.skillLevels.map((item) => (
            <div key={item.level}><strong>L{item.level}</strong><span>{item.count} skill{item.count === 1 ? "" : "s"}</span><Bar value={item.count} max={snapshot.totalSkills} /></div>
          ))}
        </div>
      </section>

      <section className="progress-section">
        <div className="section-heading"><div><p className="section-kicker">RECENT ACTIVITY</p><h2>Recorded events</h2></div></div>
        {snapshot.recentActivity.length === 0 ? <p className="muted-copy">No activity recorded yet.</p> : null}
        {snapshot.recentActivity.map((item) => (
          <div className="activity-row" key={item.id}><span>{item.eventType.replaceAll("_", " ")}</span><strong>{item.summary}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div>
        ))}
      </section>
    </div>
  );
}
