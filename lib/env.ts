/**
 * @fileoverview Zod-validated server-side environment loader ensuring secrets like
 * `GEMINI_API_KEY` remain strictly isolated on the server.
 */

import { z } from 'zod';

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  APP_URL: z.string().trim().optional(),
  NODE_ENV: z.string().trim().default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

/**
 * Validates and returns server-side environment variables (cached outside tests).
 *
 * @returns Parsed `ServerEnv` object.
 * @throws {Error} When required environment validation fails.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv && process.env.NODE_ENV !== 'test') {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment configuration: ${parsed.error.issues[0]?.message ?? 'unknown error'}`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Checks whether a non-placeholder Gemini API key is configured on the server.
 *
 * @returns `true` if a live `GEMINI_API_KEY` value is present.
 */
export function hasGeminiApiKey(): boolean {
  const key = getServerEnv().GEMINI_API_KEY;
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}
