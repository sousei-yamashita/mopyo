const HANDOFF_MARKER_RE = /^<!-- mopyo-copilot-autofix v1 review:(\d+) head:([0-9a-f]{40}) attempt:(\d+)\/(\d+) -->$/;
const STOP_MARKER_RE = /^<!-- mopyo-copilot-autofix-stop v1 head:([0-9a-f]{40}) -->$/;
const NEGATED_NO_FINDINGS_RE = /\bno (actionable )?(findings?|issues?|changes (requested|recommended)|fix(?:es)? needed)\b/i;
const ACTIONABLE_SUMMARY_RE = /(^|\n)\s*#{1,6}\s*.*\bchanges recommended\b/i;

export function isActionableReview(review, reviewSpecificComments) {
  if ((review?.state || "").toLowerCase() === "changes_requested") return true;
  if ((reviewSpecificComments || []).length > 0) return true;
  const body = String(review?.body || "");
  if (!body.trim()) return false;
  if (NEGATED_NO_FINDINGS_RE.test(body)) return false;
  return ACTIONABLE_SUMMARY_RE.test(body);
}

export function buildHandoffMarker({ reviewId, headSha, attempt, maxAttempts }) {
  return `<!-- mopyo-copilot-autofix v1 review:${reviewId} head:${headSha} attempt:${attempt}/${maxAttempts} -->`;
}

export function buildStopMarker({ headSha }) {
  return `<!-- mopyo-copilot-autofix-stop v1 head:${headSha} -->`;
}

function parseHandoffMarker(body) {
  const firstLine = String(body || "").split("\n")[0].trim();
  const match = firstLine.match(HANDOFF_MARKER_RE);
  if (!match) return null;
  return {
    reviewId: Number(match[1]),
    headSha: match[2],
    attempt: Number(match[3]),
    maxAttempts: Number(match[4])
  };
}

function parseStopMarker(body) {
  const firstLine = String(body || "").split("\n")[0].trim();
  const match = firstLine.match(STOP_MARKER_RE);
  if (!match) return null;
  return { headSha: match[1] };
}

export function extractTrustedState({ comments, headSha, reviewId, trustedAuthorLogin }) {
  const trustedComments = (comments || []).filter(comment => comment?.user?.login === trustedAuthorLogin);
  const handoffs = trustedComments
    .map(comment => parseHandoffMarker(comment.body))
    .filter(Boolean);
  const stops = trustedComments
    .map(comment => parseStopMarker(comment.body))
    .filter(Boolean);

  const attemptCount = handoffs.filter(entry => entry.headSha === headSha).length;
  const hasDedupeForReviewHead = handoffs.some(entry => entry.headSha === headSha && entry.reviewId === reviewId);
  const hasStopForHead = stops.some(entry => entry.headSha === headSha);

  return { attemptCount, hasDedupeForReviewHead, hasStopForHead };
}

export function decideAutofixAction({
  review,
  reviewSpecificComments,
  issueComments,
  headSha,
  maxAttempts,
  trustedAuthorLogin
}) {
  if (!isActionableReview(review, reviewSpecificComments)) {
    return { kind: "skip", reason: "no-actionable-findings" };
  }

  const reviewId = Number(review.id);
  const state = extractTrustedState({
    comments: issueComments,
    headSha,
    reviewId,
    trustedAuthorLogin
  });

  if (state.hasDedupeForReviewHead) {
    return { kind: "skip", reason: "duplicate-review-head" };
  }
  if (state.hasStopForHead) {
    return { kind: "skip", reason: "head-stopped" };
  }

  if (state.attemptCount >= maxAttempts) {
    return { kind: "limit-reached", shouldCreateStop: true, attemptCount: state.attemptCount };
  }

  const nextAttempt = state.attemptCount + 1;
  return {
    kind: "handoff",
    nextAttempt,
    shouldCreateStop: nextAttempt >= maxAttempts,
    reviewId
  };
}
