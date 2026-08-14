import { useCallback, useEffect, useState } from "react";
import type { ConfigSummary } from "../../engine/config/types";
import { CurriculumText } from "../../components/CurriculumText/CurriculumText";
import { getSchedulePosition } from "../../data/planMetaRepository";
import {
  getWeekMasteryByDay,
  proveWeek,
  startWeek,
  type WeekMasterySnapshot,
} from "../../data/weekMasteryRepository";
import {
  getWeekContractSections,
  type WeekContractSection,
} from "../../data/weekContractRepository";
import { TodayView } from "../today/TodayView";

type ViewState =
  | { status: "LOADING" }
  | { status: "PRE_START"; daysUntilStart: number }
  | { status: "COMPLETE" }
  | {
      status: "READY";
      dayNumber: number;
      week: WeekMasterySnapshot;
      contractSections: WeekContractSection[];
      developmentOverride: boolean;
    }
  | { status: "ERROR"; message: string };

function scoreLabel(week: WeekMasterySnapshot): string {
  if (week.passingAssessmentScore === null || week.passingAssessmentMaxScore === null) {
    return "No passing independent proof yet";
  }
  return `${week.passingAssessmentScore}/${week.passingAssessmentMaxScore} independent proof`;
}

function sectionKicker(type: string): string {
  return type.replace(/^WEEK_/, "").replaceAll("_", " ");
}

function proofGateMessage(week: WeekMasterySnapshot): string {
  const requirements: string[] = [];
  if (!week.passingAssessmentId) requirements.push("Record a passing independent assessment in Proof.");
  if (week.verifiedEvidenceCount < 1) requirements.push("Add and verify at least one evidence item linked to this week.");
  if (week.openRepairCount > 0) requirements.push(`Resolve ${week.openRepairCount} open repair item(s).`);
  return requirements.length > 0
    ? requirements.join(" ")
    : "Independent proof, verified evidence, and repair state all satisfy the gate.";
}

export function ThisWeekView({ planSummary }: { planSummary: ConfigSummary }) {
  const [state, setState] = useState<ViewState>({ status: "LOADING" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { position, developmentOverride } = await getSchedulePosition();
      if (position.kind === "PRE_START") {
        setState({ status: "PRE_START", daysUntilStart: position.daysUntilStart });
        return;
      }
      if (position.kind === "COMPLETE") {
        setState({ status: "COMPLETE" });
        return;
      }
      if (position.kind === "UNCONFIGURED") {
        setState({ status: "ERROR", message: "No imported plan is configured." });
        return;
      }

      const week = await getWeekMasteryByDay(position.dayNumber);
      const contractSections = await getWeekContractSections(week.weekId);
      setState({
        status: "READY",
        dayNumber: position.dayNumber,
        week,
        contractSections,
        developmentOverride,
      });
    } catch (error: unknown) {
      setState({
        status: "ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await load();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "LOADING") {
    return <div className="today-state"><p>Opening this week's driver...</p></div>;
  }

  if (state.status === "ERROR") {
    return <div className="today-state"><h1>This week could not open</h1><p>{state.message}</p></div>;
  }

  if (state.status === "PRE_START") {
    return (
      <div className="today-state">
        <p className="eyebrow">PRE-START</p>
        <h1>The curriculum starts {planSummary.startDate}.</h1>
        <p>{state.daysUntilStart === 1 ? "1 day remains." : `${state.daysUntilStart} days remain.`}</p>
        <div className="rest-rule"><strong>No early Learning Debt.</strong><span>Week 1 begins on the configured start date.</span></div>
      </div>
    );
  }

  if (state.status === "COMPLETE") {
    return <div className="today-state"><p className="eyebrow">COMPLETE</p><h1>Your configured year is complete.</h1></div>;
  }

  const week = state.week;

  return (
    <>
      <header className="today-header">
        <p className="eyebrow">WEEK {week.weekNumber} / {planSummary.weeks} / PHASE {week.phaseNumber}</p>
        <h1>{week.title}</h1>
        <p>{week.dateRangeLabel}</p>
        <div className="today-status-line">
          <span>{week.status.replaceAll("_", " ")}</span>
          <span>{scoreLabel(week)}</span>
          <span>{week.openRepairCount} open repairs</span>
          <span>{week.verifiedEvidenceCount} verified evidence</span>
        </div>
        {state.developmentOverride ? <p className="dev-note">Development day override is active. Canonical schedule has not moved.</p> : null}
      </header>

      {state.contractSections.length > 0 ? (
        <div className="mission-stack" aria-label="Weekly driver contract">
          {state.contractSections.map((section) => (
            <section className="mission-block" key={section.id} aria-labelledby={`week-contract-${section.id}`}>
              <p className="section-kicker">{sectionKicker(section.type)}</p>
              <h2 id={`week-contract-${section.id}`}>{section.label}</h2>
              <CurriculumText markdown={section.instructionsMarkdown} />
            </section>
          ))}
        </div>
      ) : (
        <section className="mission-block">
          <p className="section-kicker">WEEKLY DRIVER</p>
          <h2>Legacy week format</h2>
          <p>This imported plan has no WEEK_* contract blocks. Daily execution still works, but V3 plans should define the weekly outcome, prerequisite, learning, lab, retrieval, and mastery contract with reserved WEEK_* blocks.</p>
        </section>
      )}

      <section className="mission-block" aria-labelledby="weekly-mastery-title">
        <div className="mission-heading-row">
          <div>
            <p className="section-kicker">MASTERY GATE</p>
            <h2 id="weekly-mastery-title">Outcome over attendance</h2>
          </div>
          <div className="mission-meta">
            <span>{week.completedDays}/{week.activeDays} execution days closed</span>
            <span>{week.isConsolidation ? "Consolidation" : "Driver"}</span>
          </div>
        </div>

        <p>
          Daily work is execution context. It does not prove mastery. A week becomes PROVEN only after a passing independent assessment, at least one verified week-linked evidence item, and resolution of all repair work linked to the week.
        </p>

        <div className="rest-rule">
          <strong>{week.canProve ? "Proof gate is clear." : "Proof gate is not clear yet."}</strong>
          <span>{proofGateMessage(week)}</span>
        </div>

        {actionError ? <p role="alert">{actionError}</p> : null}

        <div className="block-actions">
          {week.status === "NOT_STARTED" ? (
            <button className="secondary-button" disabled={busy} onClick={() => void act(() => startWeek(week.weekId))} type="button">
              Start Week
            </button>
          ) : null}
          <button
            className="primary-button"
            disabled={busy || !week.canProve || week.status === "PROVEN"}
            onClick={() => void act(() => proveWeek(state.dayNumber))}
            type="button"
          >
            {week.status === "PROVEN" ? "Week Proven" : "Prove Week"}
          </button>
        </div>
      </section>

      <section aria-label="Current day execution">
        <TodayView planSummary={planSummary} />
      </section>
    </>
  );
}
