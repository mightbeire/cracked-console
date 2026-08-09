import { useMemo, useState } from "react";
import type { ConfigSummary } from "../../engine/config/types";

interface GuideEntry {
  title: string;
  summary: string;
  points: string[];
}

export function GuideView({ planSummary }: { planSummary: ConfigSummary }) {
  const entries = useMemo<GuideEntry[]>(() => [
    {
      title: "I am lost. What do I do?",
      summary: "Use Today for scheduled work. Use the other screens when you need detail, proof, or review.",
      points: [
        "Open Today.",
        "If the plan has not started, review Curriculum or Guide instead of forcing early work.",
        "Complete the required blocks for the active day.",
        "Use Proof when your plan contains an assessment block.",
        "Record useful work in Evidence.",
      ],
    },
    {
      title: "Today",
      summary: "Execute the current configured plan day.",
      points: [
        `This plan has ${planSummary.days} calendar days and ${planSummary.activeDays} active days.`,
        "Timers are local. If the application closes while a timer runs, the next boot recovers it as paused.",
        "A rest day does not create forced work.",
      ],
    },
    {
      title: "Curriculum",
      summary: "Read the complete imported plan without changing execution records.",
      points: [
        `The current plan contains ${planSummary.weeks} configured weeks.`,
        "Use search to find days, blocks, instructions, and resources.",
        "Edit the source JSON only when you intend to create a new plan version.",
      ],
    },
    {
      title: "Proof and Learning Debt",
      summary: "Keep attempts. Repair demonstrated gaps. Use fresh retests.",
      points: [
        "Cracked Console keeps earlier attempts.",
        "A score below the default pass floor creates repair work.",
        "A fresh retest creates another attempt. It does not overwrite the first attempt.",
      ],
    },
    {
      title: "Evidence",
      summary: "Record work that supports a claim about what you can do.",
      points: [
        "Evidence can be text, a URL, repository reference, file reference, score, reflection, or verifier result.",
        "Verified evidence carries more weight in higher skill-level decisions.",
        "Do not create evidence only to increase a count.",
      ],
    },
    {
      title: "Projects",
      summary: "Complete configured milestones and link evidence.",
      points: [
        `This plan defines ${planSummary.projects} project${planSummary.projects === 1 ? "" : "s"}.`,
        "A completed milestone requires linked evidence.",
        "A project completes only after its milestones and passing defence condition are satisfied.",
      ],
    },
    {
      title: "Skills",
      summary: "Assign levels from evidence, not elapsed time.",
      points: [
        `This plan defines ${planSummary.skills} skill${planSummary.skills === 1 ? "" : "s"}.`,
        "L0 through L4 are evidence levels.",
        "Higher levels require repeated, verified, and integrated evidence.",
      ],
    },
    {
      title: "Reading",
      summary: "Run the reading plan defined by the imported configuration.",
      points: [
        `${planSummary.readingBooks} reading item${planSummary.readingBooks === 1 ? "" : "s"} are configured.`,
        "A completed book requires the full reading report.",
        "Reading completion does not automatically change a skill level.",
      ],
    },
    {
      title: "Practice",
      summary: "Use a self-paced practical track when your plan defines one.",
      points: [
        `${planSummary.practiceStages} practice stage${planSummary.practiceStages === 1 ? "" : "s"} are configured.`,
        "Complete the learn, practice, review, and explain loop for each lesson.",
        "Use the log to record practical sessions and reflections.",
      ],
    },
    {
      title: "Progress",
      summary: "Review recorded facts without gamified scores.",
      points: [
        "Progress reports completion, tracked work, assessments, evidence, projects, reading, practice, and skill levels.",
        "It does not award XP or streaks.",
      ],
    },
    {
      title: "Backup and Restore",
      summary: "Keep portable copies of mutable local records.",
      points: [
        "The backup includes a checksum and imported plan identity.",
        "Restore rejects a backup from a different plan.",
        "Read the restore preview before you type RESTORE.",
      ],
    },
  ], [planSummary]);

  const [query, setQuery] = useState("");
  const visible = entries.filter((entry) =>
    `${entry.title} ${entry.summary} ${entry.points.join(" ")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="guide-page">
      <header className="page-header">
        <p className="eyebrow">LOCAL MANUAL</p>
        <h1>Guide</h1>
        <p className="page-summary">Search the manual when you do not know what a screen expects.</p>
      </header>
      <input className="plain-input guide-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the guide..." />
      <div className="guide-list">
        {visible.map((entry) => (
          <section className="guide-entry" key={entry.title}>
            <h2>{entry.title}</h2>
            <p>{entry.summary}</p>
            {entry.points.map((point, index) => <p key={index}>{index + 1}. {point}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
