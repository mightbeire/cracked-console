import { useEffect, useState } from "react";
import type {
  CommunityConfig,
  ConfigIssue,
  ConfigSummary,
} from "../../engine/config/types";
import { summarizeCommunityConfig } from "../../engine/config/validate";
import { parseCommunityConfigWithSidePaths } from "../../engine/config/parseConfig";
import {
  getImportedConfigSummary,
  importCommunityConfig,
} from "../../engine/data/configImportRepository";
import { chooseJsonOpenPath } from "../../engine/platform/dialog";
import { readTextFile } from "../../engine/platform/nativeFiles";

interface PendingConfig {
  path: string;
  fileName: string;
  raw: string;
  config: CommunityConfig;
  summary: ConfigSummary;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function withSidePathSummary(config: CommunityConfig): ConfigSummary {
  const base = summarizeCommunityConfig(config);
  return {
    ...base,
    sidePaths: config.sidePaths?.length ?? 0,
    sidePathItems: config.sidePaths?.reduce(
      (sum, path) => sum + path.stages.reduce((stageSum, stage) => stageSum + stage.items.length, 0),
      0,
    ) ?? 0,
  };
}

export function SetupView({ onConfigured }: { onConfigured?: () => void | Promise<void> }) {
  const [configured, setConfigured] = useState<ConfigSummary | null>(null);
  const [pending, setPending] = useState<PendingConfig | null>(null);
  const [issues, setIssues] = useState<ConfigIssue[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void getImportedConfigSummary()
      .then(setConfigured)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setBusy(false));
  }, []);

  async function chooseConfig() {
    const path = await chooseJsonOpenPath("Choose a Cracked Console plan");
    if (!path) return;

    setBusy(true);
    setMessage("");
    setIssues([]);
    setPending(null);

    try {
      const raw = await readTextFile(path);
      const parsed = parseCommunityConfigWithSidePaths(raw);
      if (!parsed.config) {
        setIssues(parsed.issues);
        return;
      }

      setPending({
        path,
        fileName: fileName(path),
        raw,
        config: parsed.config,
        summary: withSidePathSummary(parsed.config),
      });
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function importConfig() {
    if (!pending) return;
    setBusy(true);
    setMessage("");

    try {
      const summary = await importCommunityConfig(
        pending.config,
        pending.raw,
        pending.fileName,
      );
      setConfigured(summary);
      setPending(null);
      setIssues([]);
      setMessage("Plan imported. Your local database now owns this configuration.");
      await onConfigured?.();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (busy && !pending && !configured) {
    return (
      <main className="community-stage">
        <p className="eyebrow">CRACKED CONSOLE / COMMUNITY EDITION</p>
        <h1>Checking local configuration...</h1>
      </main>
    );
  }

  if (configured) {
    return (
      <main className="community-stage">
        <p className="eyebrow">CONFIGURATION READY</p>
        <h1>{configured.title}</h1>
        <p>The plan is stored in your local SQLite database.</p>
        <ConfigSummaryGrid summary={configured} />
        {message ? <p className="setup-message">{message}</p> : null}
      </main>
    );
  }

  return (
    <main className="community-stage">
      <p className="eyebrow">CRACKED CONSOLE / COMMUNITY EDITION</p>
      <h1>Set up your learning plan.</h1>
      <p>Cracked Console does not include a prescribed curriculum. Choose a plan JSON file that you own.</p>

      <div className="setup-actions">
        <button className="primary-button" disabled={busy} onClick={() => void chooseConfig()} type="button">
          Choose plan JSON
        </button>
      </div>

      {issues.length > 0 ? (
        <section className="setup-issues" aria-live="polite">
          <strong>Configuration needs changes.</strong>
          {issues.slice(0, 20).map((issue) => (
            <div key={`${issue.path}:${issue.message}`}>
              <code>{issue.path}</code>
              <span>{issue.message}</span>
            </div>
          ))}
          {issues.length > 20 ? <small>{issues.length - 20} more validation issues are not shown.</small> : null}
        </section>
      ) : null}

      {pending ? (
        <section className="setup-preview">
          <div>
            <p className="section-kicker">IMPORT PREVIEW</p>
            <h2>{pending.summary.title}</h2>
            <small>{pending.fileName}</small>
          </div>
          <ConfigSummaryGrid summary={pending.summary} />
          <div className="setup-note">
            <strong>This import creates the local plan.</strong>
            <span>Normal import does not replace an existing main plan. Self-paced side paths are independent and do not create calendar debt.</span>
          </div>
          <button className="primary-button" disabled={busy} onClick={() => void importConfig()} type="button">
            Import this plan
          </button>
        </section>
      ) : null}

      {message ? <p className="setup-message">{message}</p> : null}
    </main>
  );
}

function ConfigSummaryGrid({ summary }: { summary: ConfigSummary }) {
  const rows: Array<[string, string]> = [
    ["Version", summary.version],
    ["Dates", `${summary.startDate} to ${summary.endDate}`],
    ["Weeks", String(summary.weeks)],
    ["Days", `${summary.days} total / ${summary.activeDays} active / ${summary.restDays} rest`],
    ["Blocks", String(summary.blocks)],
    ["Skills", String(summary.skills)],
    ["Projects", String(summary.projects)],
    ["Reading books", String(summary.readingBooks)],
    ["Practice stages", `${summary.practiceStages} stages / ${summary.practiceLessons} lessons`],
    ["Self-paced paths", `${summary.sidePaths ?? 0} paths / ${summary.sidePathItems ?? 0} items`],
  ];

  return (
    <div className="setup-summary">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
