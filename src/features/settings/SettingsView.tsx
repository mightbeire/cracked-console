import { useEffect, useState } from "react";
import type { ConfigSummary } from "../../engine/config/types";
import type { AppSection } from "../../app/navigation";
import type {
  AppSettings,
  DataHealth,
} from "../../engine/domain/settings/types";
import {
  getAppSettings,
  runDataHealthCheck,
  setSetting,
} from "../../data/settingsRepository";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
  type BackupPreview,
} from "../../data/backupRepository";
import { resetImportedPlanForReplacement } from "../../data/planResetRepository";
import {
  chooseJsonOpenPath,
  chooseJsonSavePath,
} from "../../engine/platform/dialog";

export function SettingsView({ planSummary }: { planSummary: ConfigSummary }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [health, setHealth] = useState<DataHealth | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [confirm, setConfirm] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setSettings(await getAppSettings());
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeStartup(value: AppSection) {
    await setSetting("startup_section", value);
    await load();
  }

  async function createBackup() {
    const path = await chooseJsonSavePath(
      "Save Cracked Console backup",
      `cracked-console-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    if (!path) return;
    const document = await exportBackup(path);
    setMessage(`Backup created at ${document.createdAt}.`);
    await load();
  }

  async function chooseBackup() {
    const path = await chooseJsonOpenPath("Choose Cracked Console backup");
    if (!path) return;
    setPreview(await inspectBackup(path));
    setConfirm("");
  }

  async function restore() {
    if (!preview || confirm !== "RESTORE") return;
    await restoreBackup(preview.document);
    setMessage("Backup restored.");
    setPreview(null);
    setConfirm("");
    await load();
  }

  async function resetPlan() {
    if (resetConfirm !== "RESET PLAN") return;
    setResetBusy(true);
    setMessage("");
    try {
      await resetImportedPlanForReplacement();
      window.location.reload();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : String(error));
      setResetBusy(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <p className="eyebrow">LOCAL OPERATIONS</p>
        <h1>Settings</h1>
        <p className="page-summary">Startup, local backups, plan replacement, restore, and data health.</p>
      </header>

      <section className="settings-section">
        <div className="section-heading"><div><p className="section-kicker">STARTUP</p><h2>Application behavior</h2></div></div>
        <label>
          <span className="field-label">Startup screen</span>
          <select className="plain-input" value={settings?.startupSection ?? "today"} onChange={(event) => void changeStartup(event.target.value as AppSection)}>
            {["today","curriculum","proof","projects","skills","evidence","reading","practice","guide","progress","settings"].map((item) => <option key={item} value={item}>{item === "today" ? "This Week" : item[0]!.toUpperCase() + item.slice(1)}</option>)}
          </select>
        </label>

        <label>
          <span className="field-label">Backup reminder</span>
          <select className="plain-input" value={settings?.backupReminderDays ?? 14} onChange={(event) => void setSetting("backup_reminder_days", event.target.value).then(load)}>
            <option value="0">Off</option>
            <option value="7">Every 7 days</option>
            <option value="14">Every 14 days</option>
            <option value="30">Every 30 days</option>
          </select>
        </label>
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><p className="section-kicker">BACKUP</p><h2>Own your local records</h2></div></div>
        <div className="row-actions">
          <button className="primary-button" onClick={() => void createBackup()} type="button">Export backup</button>
          <button className="secondary-button" onClick={() => void chooseBackup()} type="button">Inspect backup for restore</button>
        </div>
        <p className="settings-copy">Last backup: {settings?.lastBackupAt ?? "None"}. Last restore: {settings?.lastRestoreAt ?? "None"}.</p>

        {preview ? (
          <div className="restore-preview">
            <strong>Restore preview</strong>
            <span>{preview.createdAt}</span>
            <span>{preview.rowCount} mutable rows</span>
            <span>Checksum: {preview.checksumValid ? "VALID" : "INVALID"}</span>
            <code>{preview.sourceSha256}</code>
            <label>
              <span className="field-label">Type RESTORE to replace mutable local state</span>
              <input className="plain-input" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </label>
            <button className="primary-button" disabled={!preview.checksumValid || confirm !== "RESTORE"} onClick={() => void restore()} type="button">Restore backup</button>
          </div>
        ) : null}
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><p className="section-kicker">PLAN REPLACEMENT</p><h2>Start a new curriculum safely</h2></div></div>
        <p className="settings-copy">
          Export a backup first. Resetting clears the imported plan and plan-owned execution/catalog state so a new plan can be imported. Historical proof and evidence remain local but are detached from old day and week numbers, so they cannot prove the replacement curriculum.
        </p>
        <div className="rest-rule">
          <strong>This is not a database wipe.</strong>
          <span>App settings, activity history, detached assessments/evidence, and standalone practice logs are retained.</span>
        </div>
        <label>
          <span className="field-label">Type RESET PLAN to continue</span>
          <input className="plain-input" value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} />
        </label>
        <button className="primary-button" disabled={resetBusy || resetConfirm !== "RESET PLAN"} onClick={() => void resetPlan()} type="button">
          {resetBusy ? "Resetting..." : "Reset imported plan"}
        </button>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <div><p className="section-kicker">DATA HEALTH</p><h2>Local database checks</h2></div>
          <button className="secondary-button" onClick={() => void runDataHealthCheck().then(setHealth)} type="button">Run check</button>
        </div>
        {health ? (
          <div className="health-grid">
            <span>SQLite integrity</span><strong>{health.integrity.toUpperCase()}</strong>
            <span>Foreign-key issues</span><strong>{health.foreignKeyIssues}</strong>
            <span>Plan identity</span><strong>{health.curriculumDays} days / {health.curriculumWeeks} weeks</strong>
            <span>Mutable rows</span><strong>{health.mutableRowCount}</strong>
            <span>Source SHA-256</span><code>{health.sourceSha256}</code>
          </div>
        ) : null}
      </section>

      <section className="settings-section">
        <div className="section-heading"><div><p className="section-kicker">ABOUT</p><h2>Cracked Console Community Edition</h2></div></div>
        <p className="settings-copy">
          Local first. {planSummary.weeks} configured weeks. {planSummary.days} calendar execution days. {planSummary.skills} configured skills. {planSummary.projects} configured projects. The user owns the plan and execution records.
        </p>
      </section>

      {message ? <p className="settings-copy">{message}</p> : null}
    </div>
  );
}
