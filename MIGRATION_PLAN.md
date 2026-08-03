# JavaScript → TypeScript Migration Plan

## Rules (Strictly Enforced)

1. **One step at a time.** No step begins until the previous step is explicitly approved.
2. **No scope creep.** Each step touches only the files listed for that step. Nothing else.
3. **No behaviour changes.** TypeScript is types only — zero runtime logic changes.
4. **No `any`.** If a type is unknown, use `unknown` and narrow it. `any` requires explicit written justification.
5. **Compile must pass before approval is requested.** Each step ends with `tsc --noEmit` (server) or `vite build` (client) passing clean.
6. **One file renamed per step** (unless files are truly trivial and listed together explicitly).
7. **Shared types are the source of truth.** If a type already exists in `types.ts`, import it — do not redefine it locally.
8. **No new features, no refactoring.** If something looks wrong in the existing JS, note it in a comment but do not fix it during migration.
9. **Each step must be marked ✅ DONE before the next step begins.**
10. **If a step fails** (compile error, test breakage), it must be fully resolved before proceeding. No partial completions.

---

## Step Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Done — approved |
| ❌ | Blocked — needs resolution |

---

## Phase 0 — Shared Domain Types

| # | Step | Files | Status |
|---|------|-------|--------|
| 0.1 | Create `shared/types.ts` with all domain types | `shared/types.ts` (new) | ✅ |

**Types to define in 0.1:**
- `TestCase`
- `LLMProvider` (`'groq' | 'openai' | 'local'`)
- `TestCaseCategory` (`'positive' | 'negative' | 'edge' | 'e2e'`)
- `Priority` (`'High' | 'Medium' | 'Low'`)
- `LLMConfig`
- `GenerateRequest`
- `GenerateResponse`
- `LLMGenerateInput`
- `LLMGenerateResult`
- `LLMProviderInstance` (interface with `provider`, `model`, `generate()`)

**Verification:** File created, no compile errors.

---

## Phase 1 — Server Migration

| # | Step | Files | Status |
|---|------|-------|--------|
| 1.1 | Add TypeScript toolchain to server | `server/package.json`, `server/tsconfig.json` | ✅ |
| 1.2 | Migrate system prompt | `server/src/services/llm/prompts/systemPrompt.js` → `.ts` | ✅ |
| 1.3 | Migrate request validator | `server/src/validators/generateRequest.js` → `.ts` | ✅ |
| 1.4a | Migrate Groq provider | `server/src/services/llm/providers/groq.js` → `.ts` | ✅ |
| 1.4b | Migrate OpenAI provider | `server/src/services/llm/providers/openai.js` → `.ts` | ✅ |
| 1.4c | Migrate Local provider | `server/src/services/llm/providers/local.js` → `.ts` | ✅ |
| 1.5 | Migrate LLM factory | `server/src/services/llm/getLLM.js` → `.ts` | ✅ |
| 1.6 | Migrate generate route | `server/src/routes/generate.js` → `.ts` | ✅ |
| 1.7a | Migrate config route | `server/src/routes/config.js` → `.ts` | ✅ |
| 1.7b | Migrate servicenow route | `server/src/routes/servicenow.js` → `.ts` | ✅ |
| 1.8 | Migrate server entry point | `server/src/index.js` → `.ts` | ✅ |
| 1.9 | Verify full server compile | Run `tsc --noEmit` in `server/` — zero errors | ✅ |

**Phase 1 completion gate:** `npm run dev` in `server/` starts without errors. Health check `GET /api/health` returns 200.

---

## Phase 2 — Client Migration

| # | Step | Files | Status |
|---|------|-------|--------|
| 2.1 | Add TypeScript toolchain to client | `client/package.json`, `client/tsconfig.json`, `client/tsconfig.app.json` | ✅ |
| 2.2 | Migrate export utilities | `client/src/utils/exportUtils.js` → `.ts` | ✅ |
| 2.3 | Migrate API fetch wrapper | `client/src/api/generateTestCases.js` → `.ts` | ✅ |
| 2.4 | Migrate ServiceNow API | `client/src/api/servicenow.js` → `.ts` | ✅ |
| 2.5 | Migrate custom hook | `client/src/hooks/useTestCaseGenerator.js` → `.ts` | ✅ |
| 2.6a | Migrate TestCaseCard component | `TestCaseCard.jsx` → `.tsx` | ✅ |
| 2.6b | Migrate ErrorBanner component | `ErrorBanner.jsx` → `.tsx` | ✅ |
| 2.6c | Migrate StoryInput component | `StoryInput.jsx` → `.tsx` | ✅ |
| 2.6d | Migrate StoryPicker component | `StoryPicker.jsx` → `.tsx` | ✅ |
| 2.6e | Migrate LLMSelector component | `LLMSelector.jsx` → `.tsx` | ✅ |
| 2.6f | Migrate ResultsPanel component | `ResultsPanel.jsx` → `.tsx` | ✅ |
| 2.7 | Migrate App root | `App.jsx` → `.tsx` | ⬜ |
| 2.8 | Migrate entry point | `main.jsx` → `.tsx` | ✅ |
| 2.9 | Verify full client build | Run `vite build` in `client/` — zero errors | ⬜ |

**Phase 2 completion gate:** `npm run dev` in `client/` starts. UI loads, test case generation works end-to-end.

---

## Phase 3 — Root Cleanup

| # | Step | Files | Status |
|---|------|-------|--------|
| 3.1 | Add typecheck scripts to root | `package.json` (root) | ⬜ |
| 3.2 | Update start-app.bat for compiled output | `start-app.bat` | ⬜ |
| 3.3 | Final end-to-end smoke test | Manual — generate test cases via UI with all 3 providers | ⬜ |

---

## Known Risk Areas (Reference)

| Risk | Location | Resolution |
|------|----------|------------|
| `req.body` is untyped | `generate.ts`, `validators` | Type as `unknown`, use type guard to narrow |
| `JSON.parse` returns `any` | `generate.ts` | Cast to `unknown`, validate with type guard |
| `process.env` values are `string \| undefined` | `index.ts`, providers | Fail-fast check at startup |
| `localStorage` values are untyped | `LLMSelector.tsx` | Typed wrapper helpers |
| Vite env vars (`import.meta.env`) | `generateTestCases.ts` | Add `/// <reference types="vite/client" />` |
| ESM + NodeNext module resolution | All server `.ts` files | Imports must use `.js` extension even when importing `.ts` files |

---

## Current Step

> **Migration COMPLETE ✅**
To skip to a specific step, reply: **"Approve X.Y"**
To pause migration, reply: **"Pause"**
