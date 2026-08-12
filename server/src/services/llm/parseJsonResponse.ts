/**
 * Extracts and parses a JSON object from raw LLM output.
 *
 * Tolerates the ways models commonly wrap or precede their JSON answer:
 *  - markdown code fences (```json ... ```)
 *  - a reasoning/chain-of-thought preamble closed by a </think> tag
 *  - stray prose before/after the JSON object
 *
 * Throws a descriptive error (safe to surface to the pass-retry loop) if no
 * parseable JSON object can be found.
 */
export function extractJsonObject(raw: string): unknown {
  let stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const thinkEnd = stripped.lastIndexOf('</think>');
  if (thinkEnd !== -1) {
    stripped = stripped.slice(thinkEnd + '</think>'.length).trim();
  }

  const jsonStart = stripped.indexOf('{');
  const jsonEnd = stripped.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`LLM response contains no JSON object. First 400 chars: ${stripped.slice(0, 400)}`);
  }

  const cleaned = stripped.slice(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `LLM returned invalid JSON — ${(err as Error).message}. First 400 chars of output: ${stripped.slice(0, 400)}`
    );
  }
}
