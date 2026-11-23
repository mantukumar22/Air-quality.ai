# AirWise: Urban Air Quality Assistant

AirWise is a GenAI-powered urban air quality and winter-smog assistant built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Zod**, and the **Google GenAI SDK (`@google/genai`)**. It pairs live air-quality telemetry from the Open-Meteo Air Quality API with personalized low-emission routines, indoor air hacks, impact estimates, community actions, and streaming follow-up Q&A.

---

## Setup & Running Locally

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and set your server-side Gemini API key:

   ```bash
   GEMINI_API_KEY="your_actual_gemini_api_key"
   APP_URL="http://localhost:3000"
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

4. **Production build:**
   ```bash
   npm run build && npm run start
   ```

---

## Architecture

- **`/app`**:
  - `layout.tsx` & `globals.css`: Loads `Plus Jakarta Sans`, `DM Sans`, and `JetBrains Mono` via `next/font/google`, declares `@custom-variant dark`, reduced-motion rules, and the skip-to-content landmark.
  - `page.tsx`: Server Component shell assembling `Header`, `AirWiseApp`, and `Footer`.
  - `error.tsx` & `not-found.tsx`: Accessible App Router fallback screens with single-shot chunk-recovery using `STORAGE_KEYS.chunkReloadOnce`.
  - `api/aqi/route.ts`: Validates city or coordinate queries with Zod, enforces per-IP rate limiting, and fetches live US AQI, PM2.5, PM10, and NO2 from Open-Meteo (`revalidate: 900` seconds).
  - `api/recommend/route.ts`: Validates household profile & AQI snapshot with Zod, invokes `gemini-4-hydrogen` with structured `responseSchema`, validates the JSON output with Zod (with 1 automatic retry on malformed JSON), and serializes failures via `toErrorResponse`.
  - `api/chat/route.ts`: Multi-tier chat handler checking pre-stored FAQs, in-memory TTL cache, resilient Gemini generation, and an HTTP 200 offline AQI/profile fallback guide so upstream 503 spikes never break the chat UI.
- **`/lib`**:
  - `constants.ts`: Centralized model fallback chain (`GEMINI_MODEL_CHAIN`), retry/backoff/circuit-breaker config, cache TTLs, rate-limit thresholds, AQI breakpoints/thresholds, impact lookup tables, FAQ scoring weights, and storage keys.
  - `errors.ts`, `apiResponse.ts`, & `apiClient.ts`: Runtime-agnostic `AppError` / `formatUpstreamAiError`, server-only Next.js `toErrorResponse` serializer, and browser-safe `extractErrorMessage` / `toAqiContextInput` so client bundles never import `next/server`.
  - `env.ts`: Zod startup/server environment validation.
  - `sanitize.ts`: Control-character stripping, whitespace normalization, length clamping, and XML delimiter sanitization for prompt-injection defense.
  - `schemas.ts`: Single source of truth Zod validation schemas and `z.infer` domain types.
  - `rateLimit.ts`: Sliding/fixed-window in-memory per-IP rate limiter with `getRetryAfterSeconds`.
  - `aqi.ts`: US EPA PM2.5-to-AQI helper, Open-Meteo geocoding & air-quality fetchers, and fallback baseline builder.
  - `impact.ts`: Pure "Before vs After" exposure and emission reduction calculator using declarative lookup maps and diminishing-returns compounding.
  - `fallbackPlan.ts`: Deterministic winter-smog action plan built from cohesive per-section generators.
  - `faq.ts` & `faqMatcher.ts`: 22 curated winter-smog FAQ entries with keyword/token similarity matching, AQI/profile personalization, offline fallback synthesis, and bounded TTL caching.
  - `prompts.ts` & `circuitBreaker.ts`: Pure Gemini prompt builders + structured response schema isolated from stateful circuit-breaker transitions.
  - `gemini.ts`: Server-only `@google/genai` wrapper featuring `callGeminiWithRetry` (exponential backoff + jitter, 10s `AbortController` timeout, model fallback chain).
  - `index.ts`: Browser-safe barrel export reducing import noise across components and hooks.
- **`/hooks`**: `useAqi`, `useRecommendations`, `useChecklist` (`localStorage`), `useChat`, `useTypingReveal`, and `useTheme` (re-exported via `/hooks/index.ts`).
- **`/components`**: Thin accessible UI containers (`AqiHero`, `ProfileForm`, `ImpactDashboard`, `RecommendationList`, `CommunitySection`, `SuggestedQuestions`, `ChatPanel`, `MedicalDisclaimer`, `Header`, `Footer`) composed with presentational sub-components under `/components/hero`, `/components/impact`, `/components/profile`, and `/components/chat`, using `next/dynamic` for below-the-fold panels.

---

## Code Quality & Architecture

AirWise follows strict engineering standards to keep domain logic verifiable, components focused, and runtime errors predictable:

- **Folder & Module Boundaries**:
  - Pure, side-effect-free domain math and prompt formatting live in `/lib` (`impact.ts`, `aqi.ts`, `faqMatcher.ts`, `prompts.ts`, `sanitize.ts`) and never import React or browser APIs.
  - Server-only secrets and HTTP utilities (`env.ts`, `gemini.ts`, `errors.ts`) are isolated from browser-safe helpers (`apiClient.ts`, `lib/index.ts`).
  - React state, caching, storage sync, and `fetch` lifecycles live in `/hooks`, while `/components` focus on accessible markup and presentational composition.
- **Single Responsibility & Lookup Maps**:
  - Large containers are decomposed into small sub-components (`AqiTelemetryGrid`, `AqiSearchForm`, `ActionTileGrid`, `ImpactBarChart`, `ImpactComparisonTable`, `ProfileSelectField`, `ChatMessageBubble`).
  - Multi-branch `if/else` or `switch` chains for AQI bands, pollutant multipliers, emission scores, icons, and source badges are replaced by typed lookup tables and `as const` thresholds in `/lib/constants.ts`.
  - Functions favor early returns and explicit option objects (e.g., `{ format: 'detail' | 'summary' }`, `{ sourceStrategy: 'smart' | 'liveOnly' }`) instead of boolean-flag parameters.
- **Type Safety & Single Source of Truth**:
  - `tsconfig.json` enforces `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, and `exactOptionalPropertyTypes`.
  - Domain contracts derive from Zod (`z.infer`) in `lib/schemas.ts` and are re-exported alongside discriminated API unions (`ChatApiResponse`) in `types/airwise.ts`.
- **Uniform Error Handling**:
  - Every API route delegates failures to `AppError` and `toErrorResponse`, guaranteeing sanitized JSON errors without leaking upstream payloads or keys. No empty `catch` blocks exist without an explicit non-fatal rationale.
- **Naming, Formatting & Verification Gate**:
  - Every file includes a `@fileoverview` header and JSDoc (`@param`, `@returns`, `@throws`) on exports, formatted with Prettier + `.editorconfig`, and linted via ESLint 9 (`next/core-web-vitals`, `typescript-eslint` strict, `jsx-a11y` strict, `import/order`, `no-console`).
  - Run the complete quality gate in one command:
    ```bash
    npm run validate
    ```
    (`tsc --noEmit && eslint . && prettier --check . && jest`)

---

## Resilience & Performance

- **Instant Pre-Stored FAQ Answers (Zero API Calls)**: `lib/faq.ts` provides 22 actionable winter-smog Q&As complete with labeled impact estimates and non-medical-advice disclaimers. Both the `SuggestedQuestions` chip bar and typed questions run through `lib/faqMatcher.ts` first to deliver personalized guidance instantaneously without touching Gemini.
- **Session & Server Caching**: Repeated custom questions share a normalized cache key (`normalizedQuestion + AQI band + household profile hash`) in both client `sessionStorage` and a bounded server TTL `ChatAnswerCache`.
- **Retries, Exponential Backoff + Jitter & Timeout**: `callGeminiWithRetry` in `lib/gemini.ts` wraps requests in a 10-second `AbortController` timeout and retries transient `429`, `500`, `502`, `503`, and `504` errors up to 3 times (`500ms`, `1s`, `2s` + random jitter).
- **Model Fallback Chain & Circuit Breaker**: Requests automatically fail over from the primary `gemini-4-hydrogen` model to `gemini-3.1-flash-lite` on repeated overload, and after 3 consecutive failures a 60-second circuit breaker pauses Gemini calls while serving FAQ and offline AQI/profile fallback guidance.
- **Graceful Degradation**: Upstream error JSON and secrets are logged server-side only. When AI is unavailable, `/api/chat` returns HTTP 200 `{ source: 'fallback' }` and `ChatPanel` surfaces a non-blocking `aria-live="polite"` notice alongside a **"Try again"** button.

---

## Security Notes

- **Server-Side Secret Isolation**: `GEMINI_API_KEY` is read exclusively in server modules (`lib/env.ts`, `lib/gemini.ts`) and never exposed via `NEXT_PUBLIC_*` variables or client bundles.
- **Input Validation & Prompt-Injection Defense**: Every API route validates payloads via Zod, clamps string lengths, strips control characters, and isolates untrusted user text inside `<user_data>` blocks with explicit system instructions treating user input strictly as data.
- **No `dangerouslySetInnerHTML`**: All AI recommendations and chat outputs are rendered as escaped React text nodes and paragraphs.
- **Rate Limiting & Security Headers**: Per-IP rate limiting protects `/api/aqi`, `/api/recommend`, and `/api/chat`. `next.config.ts` sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- **Zero Server-Side PII Storage**: Profile, coordinates, and checklist progress stay in the browser (`localStorage`/`sessionStorage`) and are never persisted in a server database.

---

## Testing

The test suite uses **Jest** (`next/jest`) and **React Testing Library**:

```bash
npm test
```

Coverage includes:

- **Unit tests** (`__tests__/aqi.test.ts`, `sanitize.test.ts`, `schemas.test.ts`, `rateLimit.test.ts`, `impact.test.ts`, `faqMatcher.test.ts`, `geminiRetry.test.ts`, `errors.test.ts`, `prompts.test.ts`): AQI mapping, input sanitization, Zod schemas, rate limiter, impact math, FAQ keyword/similarity matching + caching, `AppError`/`toErrorResponse` normalization, `<user_data>` prompt builders, and fake-timer verification of `callGeminiWithRetry` + circuit breaker.
- **Hook & component tests** (`__tests__/useChat.test.tsx`, `components.test.tsx`, `suggestedQuestions.test.tsx`): `useChat` hook FAQ/cache/retry behavior, profile form validation, tab filtering, `localStorage` checklist persistence, accessible `SuggestedQuestions` chips (zero API calls, keyboard support), and `ChatPanel` 503 fallback + "Try again" UI.
- **API route tests** (`__tests__/api-routes.test.ts`): `/api/aqi`, `/api/recommend`, and `/api/chat` covering FAQ zero-API hits, TTL caching, mocked Gemini responses, and 503 fallback responses.

---

## Accessibility (WCAG 2.2 AA)

- **Semantic Landmarks & Navigation**: `header`, `nav`, `main`, `aside`, `footer`, proper `h1`–`h4` hierarchy, and a keyboard-accessible "Skip to main content" link.
- **Non-Color Signaling**: AQI levels always pair color with explicit text labels, numeric ranges, and Lucide icons.
- **Forms & Live Regions**: All inputs have explicit `<label>` or `<fieldset>/<legend>` bindings, validation errors linked via `aria-describedby` + `aria-invalid`, and `aria-live="polite"` regions for AQI loading, plan generation, clipboard copy feedback, and streaming chat.
- **Charts & Tables**: The Before-vs-After impact SVG bar charts include `role="img"`, descriptive `aria-label` text, screen-reader prose summaries, and a full HTML `<table>` data fallback.
- **Touch & Motion**: Interactive controls target `>= 44px` touch size, support light/dark mode (`>= 4.5:1` contrast), and respect `prefers-reduced-motion`.

---

## Assumptions

- Open-Meteo Air Quality API provides hourly/current regional modeled pollutant readings (`us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`) without an API key; hyper-local street sensors may differ.
- Impact percentages (`pm25ReductionPct`, `emissionReductionPct`) are modeled estimates for household decision support and are explicitly labeled as estimates throughout the UI.
- Guidance is informational and does not constitute medical advice.
