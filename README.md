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
  - `api/aqi/route.ts`: Validates city or coordinate queries with Zod, enforces per-IP rate limiting, and fetches live US AQI, PM2.5, PM10, and NO2 from Open-Meteo (`revalidate: 900` seconds).
  - `api/recommend/route.ts`: Validates household profile & AQI snapshot with Zod, invokes `gemini-4-hydrogen` with structured `responseSchema`, validates the JSON output with Zod (with 1 automatic retry on malformed JSON), and surfaces structured errors cleanly.
  - `api/chat/route.ts`: Streams grounded follow-up answers (`text/plain; charset=utf-8` via `ReadableStream`) using the user's profile and live AQI.
- **`/lib`**:
  - `constants.ts`: Centralized model names, rate-limit thresholds, AQI category definitions, and fallback baselines.
  - `env.ts`: Zod startup/server environment validation.
  - `sanitize.ts`: Control-character stripping, whitespace normalization, length clamping, and XML delimiter sanitization for prompt-injection defense.
  - `schemas.ts`: Zod validation schemas for all API payloads and Gemini JSON outputs.
  - `rateLimit.ts`: Sliding/fixed-window in-memory per-IP rate limiter.
  - `aqi.ts`: US EPA PM2.5-to-AQI helper, Open-Meteo geocoding & air-quality fetchers, and fallback baseline builder.
  - `impact.ts`: Pure "Before vs After" exposure and emission reduction calculator with diminishing-returns compounding.
  - `fallbackPlan.ts`: Deterministic winter-smog action plan used gracefully in the client when offline or upstream APIs fail.
  - `gemini.ts`: Server-only `@google/genai` client wrapper.
- **`/hooks`**: `useAqi`, `useRecommendations`, `useChecklist` (`localStorage`), and `useTheme`.
- **`/components`**: Modular accessible UI components (`AqiHero`, `ProfileForm`, `ImpactDashboard`, `RecommendationList`, `CommunitySection`, `ChatPanel`, `MedicalDisclaimer`, `Header`, `Footer`), using `next/dynamic` for below-the-fold panels.

---

## Security Notes

- **Server-Side Secret Isolation**: `GEMINI_API_KEY` is read exclusively in server modules (`lib/env.ts`, `lib/gemini.ts`) and never exposed via `NEXT_PUBLIC_*` variables or client bundles.
- **Input Validation & Prompt-Injection Defense**: Every API route validates payloads via Zod, clamps string lengths, strips control characters, and isolates untrusted user text inside `<user_data>` blocks with explicit system instructions treating user input strictly as data.
- **No `dangerouslySetInnerHTML`**: All AI recommendations and streamed chat outputs are rendered as escaped React text nodes and paragraphs.
- **Rate Limiting & Security Headers**: Per-IP rate limiting protects `/api/aqi`, `/api/recommend`, and `/api/chat`. `next.config.ts` sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- **Zero Server-Side PII Storage**: Profile, coordinates, and checklist progress stay in the browser (`localStorage` for checklist/cache) and are never persisted in a server database.

---

## Testing

The test suite uses **Jest** (`next/jest`) and **React Testing Library**:

```bash
npm test
```

Coverage includes:
- **Unit tests** (`__tests__/aqi.test.ts`, `sanitize.test.ts`, `schemas.test.ts`, `rateLimit.test.ts`, `impact.test.ts`): AQI category mapping & PM2.5 breakpoints, input sanitization & prompt-injection stripping, Zod request/response schemas, per-IP rate limiter, and impact calculations.
- **Component tests** (`__tests__/components.test.tsx`): Profile form validation & submission, category tab filtering, and `localStorage` checklist persistence/reset.
- **API route tests** (`__tests__/api-routes.test.ts`): `/api/aqi`, `/api/recommend`, and `/api/chat` with mocked Open-Meteo `fetch` and mocked `@google/genai` covering success, invalid input, and upstream failures.

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
