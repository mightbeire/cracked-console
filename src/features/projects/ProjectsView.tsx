import { useEffect, useState } from "react";
import {
  getProjectEvidenceOptions,
  getProjects,
  saveProjectDetails,
  setProjectMilestone,
  startProject,
} from "../../data/projectRepository";
import type { EvidenceRecord } from "../../engine/domain/evidence/types";
import { projectStatus } from "../../engine/domain/projects/rules";
import type { ProjectRecord } from "../../engine/domain/projects/types";
import { getSchedulePosition } from "../../data/planMetaRepository";

type EvidenceOption = Pick<EvidenceRecord, "id" | "title" | "evidenceType" | "dayNumber" | "verified">;


function statusLabel(status: ReturnType<typeof projectStatus>): string {
  return status.replaceAll("_", " ");
}

function ProjectDetail({
  project,
  evidence,
  currentDay,
  onReload,
}: {
  project: ProjectRecord;
  evidence: EvidenceOption[];
  currentDay: number | null;
  onReload: () => Promise<void>;
}) {
  const [problem, setProblem] = useState(project.problemStatement);
  const [repository, setRepository] = useState(project.repositoryReference);
  const [notes, setNotes] = useState(project.workingNotes);
  const [busy, setBusy] = useState(false);
  const status = projectStatus(project, currentDay);
  const canStart = !project.startedAt && currentDay !== null && currentDay >= project.startDay;

  async function saveDetails() {
    setBusy(true);
    try {
      await saveProjectDetails(project.id, problem, repository, notes);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    if (!canStart) return;
    setBusy(true);
    try {
      await startProject(project.id);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="project-detail">
      <header className="project-detail-header">
        <div>
          <p className="section-kicker">{project.code} / {statusLabel(status)}</p>
          <h2>{project.name}</h2>
          <p>{project.coreIntegration}</p>
          <small>
            Day {String(project.startDay).padStart(3, "0")} to Day {String(project.endDay).padStart(3, "0")} / {project.startDateLabel} to {project.endDateLabel}
          </small>
        </div>
        {!project.startedAt ? (
          <button className="primary-button" disabled={!canStart || busy} onClick={() => void begin()} type="button">
            {canStart ? "Start project" : "Not scheduled yet"}
          </button>
        ) : null}
      </header>

      <div className="project-fields">
        <label>
          <span className="field-label">Problem statement</span>
          <textarea className="text-area" disabled={!project.startedAt} onChange={(event) => setProblem(event.target.value)} value={problem} />
        </label>
        <label>
          <span className="field-label">Repository / working reference</span>
          <input className="plain-input" disabled={!project.startedAt} onChange={(event) => setRepository(event.target.value)} value={repository} />
        </label>
        <label>
          <span className="field-label">Working notes</span>
          <textarea className="text-area" disabled={!project.startedAt} onChange={(event) => setNotes(event.target.value)} value={notes} />
        </label>
        <div className="record-actions">
          <button className="secondary-button" disabled={!project.startedAt || busy} onClick={() => void saveDetails()} type="button">
            Save project notes
          </button>
        </div>
      </div>

      <div className="project-milestones">
        <div className="section-heading">
          <div>
            <p className="section-kicker">EVIDENCE GATES</p>
            <h3>Milestones</h3>
          </div>
          <span>{project.milestones.filter((item) => item.completed).length}/{project.milestones.length}</span>
        </div>

        {project.milestones.map((milestone) => (
          <MilestoneRow
            disabled={!project.startedAt}
            evidence={evidence}
            key={milestone.id}
            milestone={milestone}
            onReload={onReload}
          />
        ))}

        <p className="project-completion-rule">
          Project completion is automatic only after every milestone has evidence and the matching curriculum defence has a passing assessment record.
        </p>
      </div>
    </section>
  );
}

function MilestoneRow({
  milestone,
  evidence,
  disabled,
  onReload,
}: {
  milestone: ProjectRecord["milestones"][number];
  evidence: EvidenceOption[];
  disabled: boolean;
  onReload: () => Promise<void>;
}) {
  const [evidenceId, setEvidenceId] = useState(milestone.evidenceId ? String(milestone.evidenceId) : "");
  const [note, setNote] = useState(milestone.note);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (milestone.completed) {
        await setProjectMilestone(milestone.id, false, null, "");
      } else {
        if (!evidenceId) return;
        await setProjectMilestone(milestone.id, true, Number(evidenceId), note);
      }
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="project-milestone-row">
      <div className="milestone-number">{String(milestone.sortOrder).padStart(2, "0")}</div>
      <div className="milestone-copy">
        <strong>{milestone.title}</strong>
        <p>{milestone.description}</p>
        {milestone.completed ? <small>Evidence: {milestone.evidenceTitle}</small> : null}
      </div>
      <div className="milestone-controls">
        {!milestone.completed ? (
          <>
            <select className="plain-input" disabled={disabled || busy} onChange={(event) => setEvidenceId(event.target.value)} value={evidenceId}>
              <option value="">Choose evidence...</option>
              {evidence.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.verified ? "Verified / " : ""}{item.title}{item.dayNumber ? ` / Day ${String(item.dayNumber).padStart(3, "0")}` : ""}
                </option>
              ))}
            </select>
            <input className="plain-input" disabled={disabled || busy} onChange={(event) => setNote(event.target.value)} placeholder="Milestone note (optional)" value={note} />
          </>
        ) : null}
        <button
          className={milestone.completed ? "quiet-button" : "secondary-button"}
          disabled={disabled || busy || (!milestone.completed && !evidenceId)}
          onClick={() => void toggle()}
          type="button"
        >
          {milestone.completed ? "Reopen" : "Complete gate"}
        </button>
      </div>
    </article>
  );
}

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceOption[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [day, setDay] = useState<number | null>(null);

  async function load() {
    try {
      const [nextProjects, nextEvidence] = await Promise.all([getProjects(), getProjectEvidenceOptions()]);
      setProjects(nextProjects);
      setEvidence(nextEvidence);
      setError("");
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void getSchedulePosition().then(({ position }) => {
      setDay(position.kind === "ACTIVE" ? position.dayNumber : null);
    });
  }, []);

  const selected = projects.find((project) => project.id === selectedId) ?? projects[0];

  return (
    <div className="projects-page">
      <header className="page-header">
        <p className="eyebrow">INTEGRATED WORK</p>
        <h1>Projects</h1>
        <p className="page-summary">
          Configured milestones need evidence. Final completion also needs a passing assessment that matches the project defence type.
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Opening projects...</p> : null}

      <div className="project-layout">
        <aside className="project-index" aria-label="Project index">
          {projects.map((project) => {
            const status = projectStatus(project, day);
            return (
              <button
                className={`project-index-item ${selected?.id === project.id ? "project-index-item-active" : ""}`}
                key={project.id}
                onClick={() => setSelectedId(project.id)}
                type="button"
              >
                <span className="row-meta">{project.code}</span>
                <strong>{project.name.replace(/^Project \d - /, "").replace(/^Final /, "")}</strong>
                <small>{statusLabel(status)} / {project.milestones.filter((item) => item.completed).length}/{project.milestones.length}</small>
              </button>
            );
          })}
        </aside>

        {selected ? <ProjectDetail currentDay={day} evidence={evidence} key={selected.id} onReload={load} project={selected} /> : null}
      </div>
    </div>
  );
}
