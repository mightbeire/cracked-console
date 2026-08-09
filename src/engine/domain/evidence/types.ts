export type EvidenceType =
  | "TEXT"
  | "URL"
  | "REPOSITORY"
  | "FILE_REFERENCE"
  | "SCORE"
  | "REFLECTION"
  | "VERIFIER";

export type EvidenceConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface EvidenceRecord {
  id: number;
  title: string;
  description: string;
  evidenceType: EvidenceType;
  dayNumber: number | null;
  weekNumber: number | null;
  dateLabel: string | null;
  locationOrUrl: string | null;
  confidence: EvidenceConfidence;
  verified: boolean;
  createdAt: string;
  assessmentIds: number[];
}

export interface EvidenceDraft {
  title: string;
  description: string;
  evidenceType: EvidenceType;
  dayNumber: number | null;
  locationOrUrl: string;
  confidence: EvidenceConfidence;
  verified: boolean;
  assessmentId: number | null;
}
