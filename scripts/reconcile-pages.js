export function previewDirectoryName(number) {
  return `pr-${number}`;
}

export function reviewablePullNumbers(pulls, repository) {
  return [...new Set(
    pulls
      .filter(pull => pull.state === "open" && pull.draft === false && pull.head?.repo?.full_name === repository)
      .map(pull => pull.number)
  )].sort((a, b) => a - b);
}

export function stalePreviewDirectories(existingEntries, openPullNumbers) {
  const desired = new Set(openPullNumbers.map(previewDirectoryName));
  return existingEntries.filter(entry => entry.startsWith("pr-") && !desired.has(entry));
}
