import { useEffect, useMemo, useState } from "react";
import type { ConfigSummary } from "../../engine/config/types";
import { CurriculumText } from "../../components/CurriculumText/CurriculumText";
import {
  getCurriculumDayDetail,
  getCurriculumResources,
  getCurriculumWeek,
  getCurriculumWeeks,
  searchCurriculum,
  type CurriculumDayDetail,
  type CurriculumResource,
  type CurriculumSearchResult,
  type CurriculumWeekDetail,
  type CurriculumWeekSummary,
} from "../../data/curriculumRepository";
import { openCurriculumUrl } from "../../engine/platform/opener";

type Location =
  | { kind: "YEAR" }
  | { kind: "WEEK"; weekNumber: number }
  | { kind: "DAY"; dayNumber: number };

export function CurriculumView({ planSummary }: { planSummary: ConfigSummary }) {
  const [weeks, setWeeks] = useState<CurriculumWeekSummary[]>([]);
  const [week, setWeek] = useState<CurriculumWeekDetail | null>(null);
  const [day, setDay] = useState<CurriculumDayDetail | null>(null);
  const [resources, setResources] = useState<CurriculumResource[]>([]);
  const [location, setLocation] = useState<Location>({ kind: "YEAR" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CurriculumSearchResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getCurriculumWeeks(), getCurriculumResources()])
      .then(([weekRows, resourceRows]) => {
        setWeeks(weekRows);
        setResources(resourceRows);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  useEffect(() => {
    if (location.kind === "WEEK") {
      void getCurriculumWeek(location.weekNumber)
        .then((value) => {
          setWeek(value);
          setDay(null);
        })
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : String(cause)),
        );
    } else if (location.kind === "DAY") {
      void getCurriculumDayDetail(location.dayNumber)
        .then(setDay)
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : String(cause)),
        );
    }
  }, [location]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchCurriculum(query).then(setResults);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [query]);

  const completed = useMemo(
    () => weeks.reduce((sum, item) => sum + item.completedDays, 0),
    [weeks],
  );

  function openResult(result: CurriculumSearchResult) {
    if (result.kind === "DAY") {
      setLocation({ kind: "DAY", dayNumber: result.dayNumber });
    } else if (result.kind === "WEEK") {
      setLocation({ kind: "WEEK", weekNumber: result.weekNumber });
    } else {
      void openCurriculumUrl(result.url);
    }
  }

  if (error) {
    return <div className="curriculum-state"><h1>Curriculum could not open</h1><p>{error}</p></div>;
  }

  if (location.kind === "DAY" && day) {
    return (
      <div className="curriculum-page">
        <button className="text-back" onClick={() => setLocation({ kind: "WEEK", weekNumber: day.weekNumber })} type="button">
          ← Week {day.weekNumber}
        </button>
        <header className="page-header">
          <p className="eyebrow">DAY {String(day.dayNumber).padStart(3, "0")} / {planSummary.days} · WEEK {day.weekNumber} · PHASE {day.phaseNumber}</p>
          <h1>{day.dateLabel}</h1>
          <p className="page-summary">{day.isRestDay ? "Configured rest day." : day.status.replaceAll("_", " ")}</p>
        </header>

        {day.blocks.map((block) => (
          <section className="mission-block" key={block.id}>
            <div className="mission-heading-row">
              <div><p className="section-kicker">{block.type.replaceAll("_", " ")}</p><h2>{block.label}</h2></div>
              <div className="mission-meta"><span>{block.plannedMinutes} min</span><span>{block.required ? "Required" : "Optional"}</span></div>
            </div>
            <CurriculumText markdown={block.instructions} />
          </section>
        ))}

        {day.definitionOfDone.length > 0 ? (
          <section className="definition-panel">
            <p className="section-kicker">DEFINITION OF DONE</p>
            {day.definitionOfDone.map((item, index) => <p key={index}>{index + 1}. {item}</p>)}
          </section>
        ) : null}
      </div>
    );
  }

  if (location.kind === "WEEK" && week) {
    return (
      <div className="curriculum-page">
        <button className="text-back" onClick={() => setLocation({ kind: "YEAR" })} type="button">← All weeks</button>
        <header className="page-header">
          <p className="eyebrow">WEEK {week.weekNumber} / {planSummary.weeks} · PHASE {week.phaseNumber}</p>
          <h1>{week.title}</h1>
          <p className="page-summary">{week.dateRangeLabel}{week.isConsolidation ? " · Consolidation" : ""}</p>
        </header>
        <div className="week-day-grid">
          {week.days.map((item) => (
            <button className="day-card" key={item.dayNumber} onClick={() => setLocation({ kind: "DAY", dayNumber: item.dayNumber })} type="button">
              <span>DAY {String(item.dayNumber).padStart(3, "0")}</span>
              <strong>{item.dateLabel}</strong>
              <small>{item.status.replaceAll("_", " ")}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="curriculum-page">
      <header className="page-header">
        <p className="eyebrow">CONFIGURED SOURCE OF TRUTH</p>
        <h1>Curriculum</h1>
        <p className="page-summary">
          {planSummary.weeks} weeks. {planSummary.days} calendar days. {completed}/{planSummary.activeDays} active days complete.
        </p>
      </header>

      <section className="curriculum-search-panel">
        <label>
          <span className="field-label">Search the plan</span>
          <input className="plain-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Day, week, block, topic, or resource..." />
        </label>
        {query.trim().length >= 2 ? (
          <div className="curriculum-search-results">
            {results.length === 0 ? <p className="muted-copy">No matches.</p> : null}
            {results.map((result) => (
              <button className="search-result-row" key={result.key} onClick={() => openResult(result)} type="button">
                <span>{result.kind}</span><strong>{result.title}</strong><small>{result.meta}</small><p>{result.snippet}</p>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="curriculum-week-grid">
        {weeks.map((item) => (
          <button className="week-card" key={item.weekNumber} onClick={() => setLocation({ kind: "WEEK", weekNumber: item.weekNumber })} type="button">
            <div className="row-meta"><span>W{item.weekNumber}</span><span>PHASE {item.phaseNumber}</span>{item.isConsolidation ? <span>CONSOLIDATION</span> : null}</div>
            <strong>{item.title}</strong>
            <p>{item.dateRangeLabel}</p>
            <small>{item.completedDays}/{item.activeDays} active days complete</small>
          </button>
        ))}
      </div>

      {resources.length > 0 ? (
        <section className="resource-index">
          <div className="section-heading"><div><p className="section-kicker">RESOURCES</p><h2>Plan links</h2></div><span>{resources.length}</span></div>
          {resources.map((resource) => (
            <button className="resource-row" key={resource.id} onClick={() => void openCurriculumUrl(resource.url)} type="button">
              <strong>{resource.label}</strong><span>{resource.url}</span>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}
