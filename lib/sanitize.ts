/**
 * Input sanitization and prompt-injection defense utilities.
 */

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/**
 * Strips ASCII/Unicode control characters (preserving tabs and newlines when allowed).
 */
export function stripControlChars(input: string, allowNewlines = false): string {
  const cleaned = input.replace(CONTROL_CHAR_REGEX, '');
  if (!allowNewlines) {
    return cleaned.replace(/[\r\n\t]+/g, ' ');
  }
  return cleaned;
}

/**
 * Normalizes whitespace, removes control characters, and enforces a maximum length.
 */
export function sanitizeText(input: string, maxLength: number, allowNewlines = false): string {
  const withoutControls = stripControlChars(input, allowNewlines);
  const collapsed = allowNewlines
    ? withoutControls.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    : withoutControls.replace(/\s+/g, ' ').trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  return collapsed.slice(0, maxLength).trim();
}

/**
 * Neutralizes XML-like delimiter tags and common prompt-injection phrasing markers
 * before embedding untrusted user text inside structured prompt blocks.
 */
export function sanitizeForPrompt(input: string, maxLength: number): string {
  const cleaned = sanitizeText(input, maxLength, false);
  return cleaned
    .replace(/<\/?[a-zA-Z0-9_-]+>/g, '')
    .replace(/[<>`]/g, '');
}

/**
 * Escapes HTML special characters for safe plain-text contexts.
 */
export function escapeHtmlChars(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
