import { getDatabase } from "./db";
import type { SchedulePosition } from "../engine/domain/execution/types";

export interface PlanIdentity {
  title: string;
  version: string;
  sourceSha256: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  weekCount: number;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function utcDayDifference(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86_400_000,
  );
}

export async function getPlanIdentity(): Promise<PlanIdentity> {
  const db = await getDatabase();
  const rows = await db.select<PlanIdentity[]>(
    `SELECT
       title,
       version,
       source_sha256 AS sourceSha256,
       start_date AS startDate,
       end_date AS endDate,
       day_count AS dayCount,
       week_count AS weekCount
     FROM curriculum_versions
     LIMIT 1`,
  );
  const row = rows[0];
  if (!row) throw new Error("No imported plan was found.");
  return row;
}

export async function getSchedulePosition(now = new Date()): Promise<{
  position: SchedulePosition;
  developmentOverride: boolean;
}> {
  const identity = await getPlanIdentity();

  if (import.meta.env.DEV) {
    const raw = import.meta.env.VITE_CRACKED_DAY_OVERRIDE;
    if (typeof raw === "string" && raw.trim()) {
      const dayNumber = Number(raw);
      if (Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= identity.dayCount) {
        return {
          position: { kind: "ACTIVE", dayNumber },
          developmentOverride: true,
        };
      }
      throw new Error(
        `VITE_CRACKED_DAY_OVERRIDE must be a whole number from 1 to ${identity.dayCount}.`,
      );
    }
  }

  const today = localDateString(now);
  if (today < identity.startDate) {
    return {
      position: {
        kind: "PRE_START",
        daysUntilStart: utcDayDifference(today, identity.startDate),
      },
      developmentOverride: false,
    };
  }

  if (today > identity.endDate) {
    return {
      position: { kind: "COMPLETE" },
      developmentOverride: false,
    };
  }

  const db = await getDatabase();
  const rows = await db.select<Array<{ dayNumber: number }>>(
    "SELECT day_number AS dayNumber FROM curriculum_days WHERE date=$1 LIMIT 1",
    [today],
  );
  const dayNumber = rows[0]?.dayNumber;
  if (!dayNumber) {
    throw new Error(
      "The current date falls inside the plan range but no plan day exists for it.",
    );
  }

  return {
    position: { kind: "ACTIVE", dayNumber },
    developmentOverride: false,
  };
}
