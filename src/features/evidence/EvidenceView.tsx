import { useEffect, useState } from "react";
import type { EvidenceConfidence, EvidenceDraft, EvidenceType } from "../../engine/domain/evidence/types";
import {
  createEvidence,
  getEvidenceAssessmentOptions,
  getEvidenceRecords,
} from "../../data/evidenceRepository";
import { chooseFile } from "../../engine/platform/dialog";
import { openCurriculumUrl } from "../../engine/platform/opener";

const evidenceTypes: Array<{ value: EvidenceType; label: string }> = [
  { value: "TEXT", label: "Text note" },
  { value: "URL", label: "URL" },
  { value: "REPOSITORY", label: "Repository / commit" },
  { value: "FILE_REFERENCE", label: "File reference" },
  { value: "SCORE", label: "Score" },
  { value: "REFLECTION", label: "Reflection" },
  { value: "VERIFIER", label: "Verifier result" },
];

export function EvidenceView({ totalDays }: { totalDays: number }) {
  const [records, setRecords] = useState<Awaited<ReturnType<typeof getEvidenceRecords>>>([]);
  const [assessmentOptions, setAssessmentOptions] = useState<Awaited<ReturnType<typeof getEvidenceAssessmentOptions>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EvidenceType>("TEXT");
  const [dayNumber, setDayNumber] = useState("");
  const [location, setLocation] = useState("");
  const [confidence, setConfidence] = useState<EvidenceConfidence>("MEDIUM");
  const [verified, setVerified] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");

  async function load() {
    try {
      const [nextRecords, nextAssessmentOptions] = await Promise.all([
        getEvidenceRecords(),
        getEvidenceAssessmentOptions(),
      ]);
      setRecords(nextRecords);
      setAssessmentOptions(nextAssessmentOptions);
      setError("");
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function pickFile() {
    const selected = await chooseFile("Choose evidence file");
    if (selected) {
      setType("FILE_REFERENCE");
      setLocation(selected);
    }
  }

  async function save() {
    const parsedDay = dayNumber.trim() ? Number(dayNumber) : null;
    if (!title.trim()) return;
    if (parsedDay !== null && (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > totalDays)) {
      setError(`Day number must be between 1 and ${totalDays}.`);
      return;
    }
    setBusy(true);
    try {
      const draft: EvidenceDraft = {
        title,
        description,
        evidenceType: type,
        dayNumber: parsedDay,
        locationOrUrl: location,
        confidence,
        verified,
        assessmentId: assessmentId ? Number(assessmentId) : null,
      };
      await createEvidence(draft);
      setTitle("");
      setDescription("");
      setType("TEXT");
      setDayNumber("");
      setLocation("");
      setConfidence("MEDIUM");
      setVerified(false);
      setAssessmentId("");
      await load();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="evidence-page">
      <header className="page-header">
        <p className="eyebrow">PROOF OF WORK</p>
        <h1>Evidence</h1>
        <p className="page-summary">Completion is not mastery. Save the artifact, score, explanation, repository reference, or verifier result that proves the work happened.</p>
      </header>

      <section className="evidence-form">
        <div className="section-heading">
          <div><p className="section-kicker">NEW EVIDENCE</p><h2>Record evidence</h2></div>
        </div>

        <div className="evidence-form-grid">
          <label className="wide-field">
            <span className="field-label">Title</span>
            <input className="plain-input" onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>

          <label>
            <span className="field-label">Type</span>
            <select className="plain-input" onChange={(event) => setType(event.target.value as EvidenceType)} value={type}>
              {evidenceTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label>
            <span className="field-label">Day (optional)</span>
            <input className="plain-input" max={totalDays} min="1" onChange={(event) => setDayNumber(event.target.value)} type="number" value={dayNumber} />
          </label>

          <label>
            <span className="field-label">Confidence</span>
            <select className="plain-input" onChange={(event) => setConfidence(event.target.value as EvidenceConfidence)} value={confidence}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>

          <label>
            <span className="field-label">Assessment link (optional)</span>
            <select className="plain-input" onChange={(event) => setAssessmentId(event.target.value)} value={assessmentId}>
              <option value="">None</option>
              {assessmentOptions.map((attempt) => (
                <option key={attempt.id} value={attempt.id}>
                  {attempt.dayNumber ? `Day ${String(attempt.dayNumber).padStart(3, "0")}` : "Unscheduled"} · attempt {attempt.attemptNumber} · {attempt.score}/{attempt.maxScore}
                </option>
              ))}
            </select>
          </label>

          <label className="wide-field">
            <span className="field-label">Location / URL / repository reference</span>
            <div className="input-with-action">
              <input className="plain-input" onChange={(event) => setLocation(event.target.value)} value={location} />
              <button className="secondary-button" onClick={() => void pickFile()} type="button">Choose file</button>
            </div>
          </label>

          <label className="wide-field">
            <span className="field-label">Description</span>
            <textarea className="text-area" onChange={(event) => setDescription(event.target.value)} value={description} />
          </label>

          <label className="check-line wide-field">
            <input checked={verified} onChange={(event) => setVerified(event.target.checked)} type="checkbox" />
            <span>Verified evidence</span>
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        <div className="record-actions">
          <button className="primary-button" disabled={busy || !title.trim()} onClick={() => void save()} type="button">Save evidence</button>
        </div>
      </section>

      <section className="evidence-list-section">
        <div className="section-heading">
          <div><p className="section-kicker">INDEX</p><h2>Saved evidence</h2></div>
          <span>{records.length}</span>
        </div>

        {loading ? <p>Opening evidence...</p> : null}
        {!loading && records.length === 0 ? <p className="muted-copy">No evidence logged yet.</p> : null}
        <div className="evidence-list">
          {records.map((record) => (
            <article className="evidence-row" key={record.id}>
              <div>
                <div className="row-meta">
                  <span>{record.evidenceType.replaceAll("_", " ")}</span>
                  <span>{record.confidence}</span>
                  <span>{record.verified ? "Verified" : "Unverified"}</span>
                  {record.dayNumber ? <span>Day {String(record.dayNumber).padStart(3, "0")}</span> : null}
                </div>
                <strong>{record.title}</strong>
                <p>{record.description || "No description."}</p>
                {record.locationOrUrl ? <small>{record.locationOrUrl}</small> : null}
              </div>
              {record.locationOrUrl?.startsWith("http://") || record.locationOrUrl?.startsWith("https://") ? (
                <button className="quiet-button" onClick={() => void openCurriculumUrl(record.locationOrUrl!)} type="button">Open</button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
