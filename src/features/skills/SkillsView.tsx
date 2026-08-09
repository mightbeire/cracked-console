import { useEffect, useMemo, useState } from "react";
import {
  assignSkillLevel,
  getSkillAssignmentHistory,
  getSkillEvidenceSignals,
  getSkills,
} from "../../data/skillRepository";
import { SKILL_LEVELS, validateSkillLevel } from "../../engine/domain/skills/rules";
import type {
  SkillEvidenceSignal,
  SkillFamily,
  SkillLevel,
  SkillRecord,
} from "../../engine/domain/skills/types";

const familyLabels: Record<SkillFamily, string> = {
  AI_SYSTEMS: "AI + Systems",
  PRODUCT_COMMUNICATION: "Product + Communication",
  DATA_QUANT: "Data + Quant",
  COGNITIVE: "Cognitive",
  LANGUAGE: "Language",
};

function SkillDetail({
  skill,
  evidence,
  onReload,
}: {
  skill: SkillRecord;
  evidence: SkillEvidenceSignal[];
  onReload: () => Promise<void>;
}) {
  const [level, setLevel] = useState<SkillLevel>(skill.level);
  const [rationale, setRationale] = useState(skill.rationale);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getSkillAssignmentHistory>>>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setLevel(skill.level);
    setRationale(skill.rationale);
    setSelectedEvidence([]);
    setSaveError("");
    void getSkillAssignmentHistory(skill.id).then(setHistory);
  }, [skill]);

  const selectedSignals = evidence.filter((item) => selectedEvidence.includes(item.id));
  const validation = validateSkillLevel(level, selectedSignals, rationale);

  function toggleEvidence(id: number) {
    setSelectedEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setSaveError("");
    if (!validation.valid) {
      setSaveError(validation.reasons.join(" "));
      return;
    }
    setBusy(true);
    try {
      await assignSkillLevel({
        skillId: skill.id,
        level,
        rationale,
        evidenceIds: selectedEvidence,
      });
      await onReload();
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="skill-detail">
      <header className="skill-detail-header">
        <div>
          <p className="section-kicker">{familyLabels[skill.family]}</p>
          <h2>{skill.name}</h2>
          <p>Current transcript level: L{skill.level}</p>
        </div>
        <div className="skill-level-badge">L{skill.level}</div>
      </header>

      <div className="level-definitions">
        {SKILL_LEVELS.map((item) => (
          <div className={`level-definition ${item.level === skill.level ? "level-definition-current" : ""}`} key={item.level}>
            <strong>{item.label}</strong>
            <span>{item.meaning}</span>
          </div>
        ))}
      </div>

      <div className="skill-review">
        <div className="section-heading">
          <div>
            <p className="section-kicker">MANUAL EVIDENCE REVIEW</p>
            <h3>Assign transcript level</h3>
          </div>
        </div>

        <label>
          <span className="field-label">Proposed level</span>
          <select className="plain-input" onChange={(event) => setLevel(Number(event.target.value) as SkillLevel)} value={level}>
            {SKILL_LEVELS.map((item) => <option key={item.level} value={item.level}>{item.label}</option>)}
          </select>
        </label>

        <label>
          <span className="field-label">Evidence-based rationale</span>
          <textarea className="text-area" onChange={(event) => setRationale(event.target.value)} value={rationale} />
        </label>

        <fieldset className="skill-evidence-fieldset">
          <legend>Link evidence to this level assignment</legend>
          {evidence.length === 0 ? <p className="muted-copy">No evidence exists yet. Add evidence before assigning L1-L4.</p> : null}
          <div className="skill-evidence-list">
            {evidence.map((item) => (
              <label className="skill-evidence-option" key={item.id}>
                <input checked={selectedEvidence.includes(item.id)} onChange={() => toggleEvidence(item.id)} type="checkbox" />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.verified ? "Verified" : "Unverified"}
                    {item.weekNumber ? ` / Week ${item.weekNumber}` : ""}
                    {item.hasPassingAssessment ? " / passing assessment" : ""}
                    {item.hasCompletedProject ? " / completed project" : ""}
                    {item.hasStrongAssessment ? " / defence/final/retention" : ""}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {!validation.valid && level > 0 ? (
          <div className="level-requirements">
            <strong>Not enough evidence for L{level}</strong>
            {validation.reasons.map((reason) => <span key={reason}>{reason}</span>)}
          </div>
        ) : null}

        {saveError ? <p className="form-error">{saveError}</p> : null}

        <div className="record-actions">
          <button className="primary-button" disabled={busy || !validation.valid} onClick={() => void save()} type="button">
            Record level assignment
          </button>
        </div>
      </div>

      <section className="skill-history">
        <div className="section-heading">
          <div>
            <p className="section-kicker">HISTORY</p>
            <h3>Level assignments</h3>
          </div>
          <span>{history.length}</span>
        </div>
        {history.length === 0 ? <p className="muted-copy">No level assignments yet. Default transcript state is L0.</p> : null}
        {history.map((item) => (
          <article className="skill-history-row" key={item.id}>
            <strong>L{item.level}</strong>
            <div>
              <p>{item.rationale || "No rationale."}</p>
              <small>{item.evidenceCount} linked evidence item(s) / {item.createdAt}</small>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

export function SkillsView() {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [evidence, setEvidence] = useState<SkillEvidenceSignal[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [nextSkills, nextEvidence] = await Promise.all([getSkills(), getSkillEvidenceSignals()]);
      setSkills(nextSkills);
      setEvidence(nextEvidence);
      setError("");
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${familyLabels[skill.family]} L${skill.level}`.toLowerCase().includes(normalized),
    );
  }, [query, skills]);

  const selected = skills.find((skill) => skill.id === selectedId) ?? skills[0];

  return (
    <div className="skills-page">
      <header className="page-header">
        <p className="eyebrow">SKILL TRANSCRIPT</p>
        <h1>Skills</h1>
        <p className="page-summary">
          Levels are manual evidence decisions, not streak rewards. L4 is never automatic.
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Opening skills...</p> : null}

      <div className="skills-layout">
        <aside className="skills-index">
          <input
            className="plain-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills..."
            type="search"
            value={query}
          />
          <div className="skills-index-list">
            {visible.map((skill) => (
              <button
                className={`skill-index-item ${selected?.id === skill.id ? "skill-index-item-active" : ""}`}
                key={skill.id}
                onClick={() => setSelectedId(skill.id)}
                type="button"
              >
                <span>
                  <strong>{String(skill.sortOrder).padStart(2, "0")}. {skill.name}</strong>
                  <small>{familyLabels[skill.family]}</small>
                </span>
                <b>L{skill.level}</b>
              </button>
            ))}
          </div>
        </aside>

        {selected ? <SkillDetail evidence={evidence} key={selected.id} onReload={load} skill={selected} /> : null}
      </div>
    </div>
  );
}
