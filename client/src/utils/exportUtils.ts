import type { TestCase } from '@shared/types';

/**
 * Exports test cases as a downloadable JSON file.
 */
export function exportAsJSON(testCases: TestCase[]): void {
  const payload = JSON.stringify({ testCases }, null, 2);
  triggerDownload(new Blob([payload], { type: 'application/json' }), `test-cases-${timestamp()}.json`);
}

/**
 * Exports test cases as a downloadable CSV file.
 * Multi-step arrays are joined with " | ".
 */
export function exportAsCSV(testCases: TestCase[]): void {
  const headers = ['id', 'category', 'title', 'preconditions', 'steps', 'expectedResult', 'priority'];
  const rows = testCases.map((tc) =>
    [
      tc.id,
      tc.category,
      tc.title,
      tc.preconditions,
      Array.isArray(tc.steps) ? tc.steps.join(' | ') : String(tc.steps ?? ''),
      tc.expectedResult,
      tc.priority,
    ].map(csvEscape)
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `test-cases-${timestamp()}.csv`);
}

/**
 * Copies text to the system clipboard with a textarea fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

/**
 * Formats a single test case as readable plain text for clipboard export.
 */
export function formatTestCaseAsText(tc: TestCase): string {
  return [
    `ID: ${tc.id}`,
    `Title: ${tc.title}`,
    `Category: ${tc.category}`,
    `Priority: ${tc.priority}`,
    `Preconditions: ${tc.preconditions}`,
    `Steps:`,
    ...(tc.steps || []).map((s: string, i: number) => `  ${i + 1}. ${s}`),
    `Expected Result: ${tc.expectedResult}`,
  ].join('\n');
}

// ── Helpers ──────────────────────────────────────────────

function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
