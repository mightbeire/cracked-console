import { useEffect, useState } from "react";
import type { ConfigSummary } from "../engine/config/types";
import { initializeRuntime } from "../data/runtimeRepository";
import { getStartupSection } from "../data/settingsRepository";
import { Sidebar } from "./Sidebar";
import type { AppSection } from "./navigation";
import { ThisWeekView } from "../features/week/ThisWeekView";
import { CurriculumView } from "../features/curriculum/CurriculumView";
import { ProofView } from "../features/proof/ProofView";
import { ProjectsView } from "../features/projects/ProjectsView";
import { SkillsView } from "../features/skills/SkillsView";
import { EvidenceView } from "../features/evidence/EvidenceView";
import { ReadingView } from "../features/reading/ReadingView";
import { PracticeView } from "../features/practice/PracticeView";
import { GuideView } from "../features/guide/GuideView";
import { ProgressView } from "../features/progress/ProgressView";
import { SettingsView } from "../features/settings/SettingsView";

type BootState =
  | { status: "BOOTING" }
  | { status: "READY"; section: AppSection }
  | { status: "ERROR"; message: string };

export function AppShell({ planSummary }: { planSummary: ConfigSummary }) {
  const [boot, setBoot] = useState<BootState>({ status: "BOOTING" });

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        await initializeRuntime();
        const section = await getStartupSection();
        if (active) setBoot({ status: "READY", section });
      } catch (error: unknown) {
        if (active) {
          setBoot({
            status: "ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void start();
    return () => {
      active = false;
    };
  }, []);

  if (boot.status === "BOOTING") {
    return (
      <main className="boot-state">
        <p className="eyebrow">CRACKED CONSOLE</p>
        <h1>Verifying local system...</h1>
        <p>Checking plan identity, local state, and interrupted timers.</p>
      </main>
    );
  }

  if (boot.status === "ERROR") {
    return (
      <main className="boot-state">
        <p className="eyebrow">STARTUP CHECK FAILED</p>
        <h1>Cracked Console did not open the workspace.</h1>
        <p>{boot.message}</p>
        <div className="rest-rule">
          <strong>Keep the local database.</strong>
          <span>Repair the installation before you delete learning records.</span>
        </div>
      </main>
    );
  }

  return <ReadyShell initialSection={boot.section} planSummary={planSummary} />;
}

function ReadyShell({
  initialSection,
  planSummary,
}: {
  initialSection: AppSection;
  planSummary: ConfigSummary;
}) {
  const [section, setSection] = useState<AppSection>(initialSection);
  const contentClass =
    section === "today"
      ? "today-content"
      : section === "curriculum"
        ? "curriculum-content"
        : "workspace-content";

  return (
    <div className="app-shell">
      <Sidebar active={section} onNavigate={setSection} />
      <main className={`main-content ${contentClass}`}>
        {section === "today" ? <ThisWeekView planSummary={planSummary} /> : null}
        {section === "curriculum" ? <CurriculumView planSummary={planSummary} /> : null}
        {section === "proof" ? <ProofView /> : null}
        {section === "projects" ? <ProjectsView /> : null}
        {section === "skills" ? <SkillsView /> : null}
        {section === "evidence" ? <EvidenceView totalDays={planSummary.days} /> : null}
        {section === "reading" ? <ReadingView /> : null}
        {section === "practice" ? <PracticeView /> : null}
        {section === "guide" ? <GuideView planSummary={planSummary} /> : null}
        {section === "progress" ? <ProgressView planSummary={planSummary} /> : null}
        {section === "settings" ? <SettingsView planSummary={planSummary} /> : null}
      </main>
    </div>
  );
}
