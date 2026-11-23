/**
 * @fileoverview Input sanitization, control-character stripping, HTML escaping,
 * and XML delimiter neutralization for prompt-injection defense.
 */

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/**
 * Strips ASCII/Unicode control characters while optionally preserving newlines.
 *
 * @param input - Untrusted raw input string.
 * @param allowNewlines - Whether to preserve `\n` line breaks (`false` collapses them).
 * @returns String stripped of unsafe control characters.
 */
export function stripControlChars(input: string, allowNewlines = false): string {
  const cleaned = input.replace(CONTROL_CHAR_REGEX, '');
  if (!allowNewlines) {
    return cleaned.replace(/[\r\n\t]+/g, ' ');
  }
  return cleaned;
}

/**
 * Normalizes whitespace, removes control characters, and clamps to `maxLength`.
 *
 * @param input - Untrusted user or upstream text string.
 * @param maxLength - Maximum output character count.
 * @param allowNewlines - Whether to retain paragraph line breaks.
 * @returns Trimmed, clamped, normalized text string.
 */
export function sanitizeText(input: string, maxLength: number, allowNewlines = false): string {
  const withoutControls = stripControlChars(input, allowNewlines);
  const collapsed = allowNewlines
    ? withoutControls
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : withoutControls.replace(/\s+/g, ' ').trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  return collapsed.slice(0, maxLength).trim();
}

/**
 * Neutralizes XML-like delimiter tags and backticks before embedding untrusted
 * user text inside structured `<user_data>` prompt blocks.
 *
 * @param input - Untrusted text supplied by the user.
 * @param maxLength - Maximum length allowed in the prompt field.
 * @returns Sanitized string safe for embedding inside prompt XML delimiters.
 */
export function sanitizeForPrompt(input: string, maxLength: number): string {
  const cleaned = sanitizeText(input, maxLength, false);
  return cleaned.replace(/<\/?[a-zA-Z0-9_-]+>/g, '').replace(/[<>`]/g, '');
}

/**
 * Escapes HTML special characters for safe plain-text contexts.
 *
 * @param input - Plain text string that may contain `<`, `>`, `&`, quotes.
 * @returns HTML-entity escaped string.
 */
export function escapeHtmlChars(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
