"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPairById } from "@/lib/cleanups";
import {
  DecisionError,
  decideClaim as decideClaimRow,
  editAndConfirmClaim as editAndConfirmRow,
  reviseClaim as reviseClaimRow,
} from "@/lib/decisions";
import { getCurrentUser } from "@/lib/session";
import {
  decisionSchema,
  editConfirmSchema,
  fieldErrors,
  textOrEmpty,
  textOrNull,
  type ActionState,
} from "@/lib/validation";

function revalidateReview(claimId: string, pairId: string) {
  revalidatePath("/review");
  revalidatePath(`/review/${claimId}`);

  const pair = getPairById(pairId);
  if (pair) {
    revalidatePath(`/cleanups/${pair.cleanup_id}`);
    revalidatePath(`/cleanups/${pair.cleanup_id}/pairs/${pair.id}`);
  }
}

const DECISION_MESSAGES = {
  confirm: "Claim confirmed and locked. It is part of the record.",
  reject: "Claim rejected. It stays out of the public record.",
  insufficient: "Claim returned to the collector for more evidence.",
} as const;

export async function decideClaim(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const claimId = textOrNull(formData.get("claimId"));
  const parsed = decisionSchema.safeParse({
    decision: textOrEmpty(formData.get("decision")),
    note: textOrEmpty(formData.get("note")) ?? undefined,
  });

  if (!claimId || !parsed.success) {
    return {
      errors: parsed.success ? undefined : fieldErrors(parsed.error),
      message: "Choose a decision for this claim.",
    };
  }

  try {
    const claim = decideClaimRow({
      claimId,
      actorId: user.id,
      decision: parsed.data.decision,
      note: parsed.data.note ?? null,
    });

    revalidateReview(claim.id, claim.pair_id);

    return {
      message:
        parsed.data.decision === "insufficient"
          ? `Claim returned to ${claim.collector_name} for more evidence.`
          : DECISION_MESSAGES[parsed.data.decision],
      claim,
    };
  } catch (error) {
    if (error instanceof DecisionError) {
      return { message: error.message };
    }
    throw error;
  }
}

export async function editAndConfirmClaim(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const claimId = textOrNull(formData.get("claimId"));
  const parsed = editConfirmSchema.safeParse({
    text: textOrEmpty(formData.get("text")),
    category: textOrEmpty(formData.get("category")),
    note: textOrEmpty(formData.get("note")) || undefined,
  });

  if (!claimId || !parsed.success) {
    return {
      errors: parsed.success ? undefined : fieldErrors(parsed.error),
      message: "Correct the observation and category before confirming.",
    };
  }

  try {
    const claim = editAndConfirmRow({
      claimId,
      actorId: user.id,
      text: parsed.data.text,
      category: parsed.data.category,
      note: parsed.data.note ?? null,
    });

    revalidateReview(claim.id, claim.pair_id);

    return {
      message:
        "Revision confirmed. The earlier version stays in the audit log.",
      claim,
    };
  } catch (error) {
    if (error instanceof DecisionError) {
      return { message: error.message };
    }
    throw error;
  }
}

export async function reviseClaim(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/setup");
  }

  const claimId = textOrNull(formData.get("claimId"));
  if (!claimId) {
    return { message: "Open the claim to revise." };
  }

  try {
    const claim = reviseClaimRow({ claimId, actorId: user.id });
    revalidateReview(claim.id, claim.pair_id);

    const pair = getPairById(claim.pair_id);
    if (pair) {
      revalidatePath(
        `/cleanups/${pair.cleanup_id}/pairs/${pair.id}`,
      );
    }

    return {
      message:
        "A new draft revision was created. The confirmed claim stays in the record until the revision is confirmed.",
      claim,
    };
  } catch (error) {
    if (error instanceof DecisionError) {
      return { message: error.message };
    }
    throw error;
  }
}
