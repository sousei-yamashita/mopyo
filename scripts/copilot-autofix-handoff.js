const HANDOFF_MARKER_RE = /^<!-- mopyo-copilot-autofix v1 review:(\d+) head:([0-9a-f]{40}) attempt:(\d+)\/(\d+) -->$/;
const STOP_MARKER_RE = /^<!-- mopyo-copilot-autofix-stop v2 pr attempt:(\d+)\/(\d+) -->$/;
const LEGACY_STOP_MARKER_RE = /^<!-- mopyo-copilot-autofix-stop v1 head:([0-9a-f]{40}) -->$/;
const HANDOFF_REQUEST_LINE = "@copilot Copilot Code Review の指摘対応をお願いします。";
const STOP_NOTICE_LINE = "自動修正の上限回数に達したため、このPRの自動中継を停止しました。";
const HANDOFF_STOP_LINE = "この自動中継は今回で停止します。";
const ACTIONABLE_SUMMARY_RE = /^#{1,6}\s*(?:\S+\s+)?Changes recommended\s*$/im;

export function isActionableReview(review, reviewSpecificComments) {
  if ((review?.state || "").toLowerCase() === "changes_requested") return true;
  if ((reviewSpecificComments || []).length > 0) return true;
  const body = String(review?.body || "");
  if (!body.trim()) return false;
  return ACTIONABLE_SUMMARY_RE.test(body);
}

export function buildHandoffMarker({ reviewId, headSha, attempt, maxAttempts }) {
  return `<!-- mopyo-copilot-autofix v1 review:${reviewId} head:${headSha} attempt:${attempt}/${maxAttempts} -->`;
}

export function buildStopMarker({ attempt, maxAttempts }) {
  return `<!-- mopyo-copilot-autofix-stop v2 pr attempt:${attempt}/${maxAttempts} -->`;
}

function splitCommentLines(body) {
  return String(body || "")
    .split("\n")
    .map(line => line.trim());
}

function parseTrustedHandoffComment(body) {
  const lines = splitCommentLines(body);
  const firstLine = lines[0] || "";
  const match = firstLine.match(HANDOFF_MARKER_RE);
  if (!match || lines[1] !== HANDOFF_REQUEST_LINE) return null;
  return {
    reviewId: Number(match[1]),
    headSha: match[2],
    attempt: Number(match[3]),
    maxAttempts: Number(match[4])
  };
}

function parseTrustedStopComment(body) {
  const lines = splitCommentLines(body);
  const markerLine = lines.find(line => STOP_MARKER_RE.test(line)) || "";
  const match = markerLine.match(STOP_MARKER_RE);
  const isTrustedStandaloneStop = lines[0] === markerLine && lines[1] === STOP_NOTICE_LINE;
  const isTrustedEmbeddedStop =
    lines[1] === HANDOFF_REQUEST_LINE &&
    lines.includes(HANDOFF_STOP_LINE);
  if (match && (isTrustedStandaloneStop || isTrustedEmbeddedStop)) {
    return {
      attempt: Number(match[1]),
      maxAttempts: Number(match[2])
    };
  }
  const legacyLine = lines.find(line => LEGACY_STOP_MARKER_RE.test(line)) || "";
  const legacyMatch = legacyLine.match(LEGACY_STOP_MARKER_RE);
  if (legacyMatch && lines[0] === legacyLine && lines[1] === STOP_NOTICE_LINE) {
    return { attempt: Number.NaN, maxAttempts: Number.NaN };
  }
  return null;
}

export function extractTrustedState({ comments, headSha, reviewId, trustedAuthorLogin }) {
  const trustedComments = (comments || []).filter(comment =>
    comment?.user?.login === trustedAuthorLogin && comment?.user?.type === "Bot"
  );
  const handoffs = trustedComments
    .map(comment => parseTrustedHandoffComment(comment.body))
    .filter(Boolean);
  const stops = trustedComments
    .map(comment => parseTrustedStopComment(comment.body))
    .filter(Boolean);

  const attemptCount = handoffs.length;
  const hasDedupeForReviewHead = handoffs.some(entry => entry.headSha === headSha && entry.reviewId === reviewId);
  const hasStopForPr = stops.length > 0;

  return { attemptCount, hasDedupeForReviewHead, hasStopForPr };
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
  if (state.hasStopForPr) {
    return { kind: "skip", reason: "pr-stopped" };
  }

  if (state.attemptCount >= maxAttempts) {
    return {
      kind: "limit-reached",
      shouldCreateStop: !state.hasStopForPr,
      attemptCount: state.attemptCount
    };
  }

  const nextAttempt = state.attemptCount + 1;
  return {
    kind: "handoff",
    nextAttempt,
    shouldCreateStop: nextAttempt >= maxAttempts,
    reviewId
  };
}
