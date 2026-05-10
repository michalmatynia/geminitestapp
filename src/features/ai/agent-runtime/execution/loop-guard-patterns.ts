import type { LoopSignal, PlanStep } from '@/shared/contracts/agent-runtime';

const detectRepeatSameStep = (titles: string[], urls: (string | null)[], statuses: PlanStep['status'][]): LoopSignal | null => {
  const sameTitle = new Set(titles.map((title: string) => title.toLowerCase())).size === 1;
  if (sameTitle) {
    return {
      reason: 'Repeated the same step multiple times.',
      pattern: 'repeat-same-step',
      titles,
      urls,
      statuses,
    };
  }
  return null;
};

const detectAlternateTwoSteps = (recent: Array<{ title: string; url: string | null; status: PlanStep['status'] }>): LoopSignal | null => {
  if (recent.length < 4) return null;
  const lastFour = recent.slice(-4);
  const [a, b, c, d] = lastFour.map((item: { title: string }) => item.title.toLowerCase());
  if (a === c && b === d && a !== b) {
    return {
      reason: 'Alternating between the same two steps.',
      pattern: 'alternate-two-steps',
      titles: lastFour.map((item: { title: string }) => item.title),
      urls: lastFour.map((item: { url: string | null }) => item.url),
      statuses: lastFour.map((item: { status: PlanStep['status'] }) => item.status),
    };
  }
  return null;
};

const detectSameUrlFailures = (titles: string[], urls: (string | null)[], statuses: PlanStep['status'][]): LoopSignal | null => {
  const stableUrl =
    urls[0] !== null &&
    urls.every((url: string | null) => url !== null && url.length > 0 && url === urls[0]) &&
    statuses.filter((status: PlanStep['status']) => status === 'failed').length >= 2;
  if (stableUrl) {
    return {
      reason: 'Repeated failures on the same URL.',
      pattern: 'same-url-failures',
      titles,
      urls,
      statuses,
    };
  }
  return null;
};

export const detectLoopPattern = (
  recent: Array<{
    title: string;
    status: PlanStep['status'];
    tool?: string | null;
    url: string | null;
  }>
): LoopSignal | null => {
  if (recent.length < 3) return null;
  const lastThree = recent.slice(-3);
  const titlesThree = lastThree.map((item: { title: string }) => item.title);
  const urlsThree = lastThree.map((item: { url: string | null }) => item.url);
  const statusesThree = lastThree.map((item: { status: PlanStep['status'] }) => item.status);

  return (
    detectRepeatSameStep(titlesThree, urlsThree, statusesThree) ??
    detectAlternateTwoSteps(recent) ??
    detectSameUrlFailures(titlesThree, urlsThree, statusesThree)
  );
};
