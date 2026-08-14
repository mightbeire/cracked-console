import { useCallback, useEffect, useState } from "react";
import {
  getSidePath,
  setSidePathItemState,
  type SidePathDetail,
  type SidePathItemStatus,
} from "../../data/sidePathRepository";
import { openCurriculumUrl } from "../../engine/platform/opener";

type ViewState =
  | { status: "LOADING" }
  | { status: "READY"; path: SidePathDetail }
  | { status: "ERROR"; message: string };

function statusLabel(status: SidePathItemStatus): string {
  return status.replaceAll("_", " ");
}

function nextStatus(status: SidePathItemStatus): SidePathItemStatus {
  if (status === "NOT_STARTED") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "COMPLETED";
  return "NOT_STARTED";
}

export function SidePathView({ pathId }: { pathId: number }) {
  const [state, setState] = useState<ViewState>({ status: "LOADING" });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const path = await getSidePath(pathId);
      if (!path) {
        setState({ status: "ERROR", message: "This self-paced path is not configured." });
        return;
      }
      setNotes(Object.fromEntries(path.stages.flatMap((stage) => stage.items.map((item) => [item.id, item.note]))));
      setState({ status: "READY", path });
    } catch (error: unknown) {
      setState({ status: "ERROR", message: error instanceof Error ? error.message : String(error) });
    }
  }, [pathId]);

  useEffect(() => {
    setState({ status: "LOADING" });
    setActionError(null);
    void load();
  }, [load]);

  async function updateItem(itemId: number, status: SidePathItemStatus) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      await setSidePathItemState(itemId, status, notes[itemId] ?? "");
      await load();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyItem(null);
    }
  }

  async function saveNote(itemId: number, status: SidePathItemStatus) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      await setSidePathItemState(itemId, status, notes[itemId] ?? "");
      await load();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyItem(null);
    }
  }

  async function openResource(url: string) {
    setActionError(null);
    try {
      await openCurriculumUrl(url);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  if (state.status === "LOADING") {
    return <div className="today-state"><p>Opening self-paced path...</p></div>;
  }

  if (state.status === "ERROR") {
    return <div className="today-state"><h1>Path unavailable</h1><p>{state.message}</p></div>;
  }

  const path = state.path;
  return (
    <div className="settings-page">
      <header className="page-header">
        <p className="eyebrow">SELF-PACED / NO DEADLINES</p>
        <h1>{path.title}</h1>
        <p className="page-summary">{path.description}</p>
        <div className="today-status-line">
          <span>{path.completedItems}/{path.totalItems} explored</span>
          <span>No streak</span>
          <span>No Learning Debt</span>
        </div>
      </header>

      <div className="rest-rule">
        <strong>Curiosity lane.</strong>
        <span>Use this whenever you want. Completion is optional and never affects the 52-week curriculum.</span>
      </div>

      {actionError ? <p role="alert">{actionError}</p> : null}

      {path.stages.map((stage) => (
        <section className="settings-section" key={stage.id}>
          <div className="section-heading">
            <div>
              <p className="section-kicker">STAGE {stage.sortOrder}</p>
              <h2>{stage.title}</h2>
              <p className="settings-copy">{stage.description}</p>
            </div>
          </div>

          <div className="mission-stack">
            {stage.items.map((item) => (
              <article className="mission-block" key={item.id}>
                <div className="mission-heading-row">
                  <div>
                    <p className="section-kicker">{item.type}{item.difficulty ? ` / ${item.difficulty}` : ""}</p>
                    <h3>{item.title}</h3>
                    {item.creator ? <p>{item.creator}</p> : null}
                  </div>
                  <div className="mission-meta"><span>{statusLabel(item.status)}</span></div>
                </div>
                <p>{item.description}</p>
                {item.resourceUrl ? (
                  <div className="block-actions">
                    <button className="secondary-button" onClick={() => void openResource(item.resourceUrl!)} type="button">
                      Open resource
                    </button>
                  </div>
                ) : null}
                <label>
                  <span className="field-label">Optional note</span>
                  <textarea
                    className="plain-input"
                    rows={3}
                    value={notes[item.id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                </label>
                <div className="block-actions">
                  <button
                    className="secondary-button"
                    disabled={busyItem === item.id}
                    onClick={() => void saveNote(item.id, item.status)}
                    type="button"
                  >
                    Save note
                  </button>
                  <button
                    className="primary-button"
                    disabled={busyItem === item.id}
                    onClick={() => void updateItem(item.id, nextStatus(item.status))}
                    type="button"
                  >
                    {item.status === "NOT_STARTED" ? "Start" : item.status === "IN_PROGRESS" ? "Mark complete" : "Reset item"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
