export type Role = "collector" | "reviewer" | "both";

export type CleanupStatus = "draft" | "in_review" | "reviewed" | "exported";

export type User = {
  id: string;
  display_name: string;
  role: Role;
  created_at: string;
};

export type Cleanup = {
  id: string;
  external_id: string | null;
  public_slug: string;
  site: string;
  date: string;
  lead_id: string;
  conditions: string | null;
  public_note: string | null;
  consent_attested_by: string;
  consent_attested_at: string;
  consent_version: string;
  public_enabled: number;
  public_published_at: string | null;
  created_at: string;
};

export type CleanupWithLead = Cleanup & {
  lead_name: string;
  consent_name: string;
};

export type CleanupCounts = {
  pair_count: number;
  confirmed_count: number;
  pending_count: number;
  insufficient_count: number;
  rejected_count: number;
  export_count: number;
};

export type CleanupListItem = CleanupWithLead &
  CleanupCounts & { status: CleanupStatus };

export type Pair = {
  id: string;
  cleanup_id: string;
  label: string;
  comparability: "comparable" | "partial" | "not_comparable" | null;
  comparability_reason: string | null;
  comparability_by: string | null;
  comparability_at: string | null;
  framing_score: number | null;
  framing_detail: string | null;
  created_at: string;
};

export type PairWithCounts = Pair & {
  before_count: number;
  after_count: number;
  claim_count: number;
};

export type PairWithCleanup = Pair & {
  cleanup_site: string;
  cleanup_date: string;
};
