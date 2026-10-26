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
  before_photo_id: string | null;
  after_photo_id: string | null;
};

export type PairWithCleanup = Pair & {
  cleanup_site: string;
  cleanup_date: string;
};

export type Photo = {
  id: string;
  pair_id: string;
  side: "before" | "after";
  stored_path: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  original_sha256: string;
  dhash: string;
  blur_score: number;
  exposure_clipped: number;
  near_duplicate_of: string | null;
  near_duplicate_distance: number | null;
  people_visible: number;
  uploaded_by: string;
  superseded_at: string | null;
  created_at: string;
};

export type PhotoSummary = Omit<Photo, "stored_path" | "uploaded_by">;

export type KnownPhotoHash = {
  side: "before" | "after";
  dhash: string;
  sha256: string;
};

export type ClaimStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "rejected"
  | "insufficient"
  | "superseded";

export type Claim = {
  id: string;
  pair_id: string;
  photo_id: string;
  suggestion_id: string | null;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  text: string;
  category: string | null;
  status: ClaimStatus;
  revision: number;
  supersedes_id: string | null;
  collector_id: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimSummary = Claim & {
  collector_name: string;
};

export type SuggestionStatus = "open" | "accepted" | "rejected";

export type Suggestion = {
  id: string;
  photo_id: string;
  run_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  coco_id: number;
  coco_class: string;
  confidence: number;
  icc_category: string | null;
  mapping_uncertain: number;
  status: SuggestionStatus;
  edited: number;
  reject_reason: string | null;
  created_at: string;
};

export type SuggestionWithRun = Suggestion & {
  model: string;
  model_sha256: string;
  runtime_ms: number;
  input_width: number;
  input_height: number;
};

