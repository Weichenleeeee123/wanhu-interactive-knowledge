# 可交互知识工坊 Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the bounded server task and its spec/quality reviews; integrate and verify in this session. Steps use checkboxes. Never delete files. Keep the worktree after completion.

**Goal:** Deliver a runnable Chinese web workshop with creator/self-study entry points, two correct experiments, real Zhihu search, editable source-linked lessons and portable sharing.

**Architecture:** A versioned, strictly validated Lesson is shared by the editor and reader. Pure experiment functions own mathematics; server routes own credentials and AI generation; browser storage owns drafts. AI writes structured teaching content, never executable code.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, SVG, Vitest, Playwright.

## Workspace and execution

- [ ] Create `.worktrees/workshop` on `feature/workshop`, with `.worktrees/` ignored. Baseline contains documents only, so no pre-existing application tests.
- [ ] Add package/config files directly, retaining existing documents; install dependencies once. Do not run scaffold cleanup or remove files.
- [ ] Use a fresh Next build output directory for production verification. Do not remove existing build artifacts.

## Task 1: Shared contract, mathematics and portable lessons

Files: `src/lib/lesson.ts`, `src/lib/experiments.ts`, `src/lib/examples.ts`, `src/lib/share.ts`, `tests/core.test.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`.

- [ ] Write tests first for gradient updates, exact oscillation, zero initial position, host legality, complementary stay/switch outcomes, seeded simulations, invalid URLs, out-of-range parameters, duplicate source IDs, dangling references, share round trips and decompression limits. Run `npm test` and confirm the missing implementation fails.

```ts
expect(gradientStep(10, .2)).toBe(6);
expect(gradientStep(gradientStep(10, 1), 1)).toBe(10);
for (let prize = 0; prize < 3; prize++) {
  for (let choice = 0; choice < 3; choice++) {
    const host = revealDoor(prize, choice, () => 0);
    expect([prize, choice]).not.toContain(host);
    const switched = switchDoor(choice, host);
    expect(switched === prize).toBe(choice !== prize);
  }
}
```

- [ ] Implement pure rules: `gradientStep(x, rate) = x - 2 * rate * x`; `gradientStatus` distinguishes running, zero, 100-step cap and absolute-x cap 1e6. Host chooses only an unselected goat. Seeded batches compare both strategies against the same trials.
- [ ] Define Lesson fields: `version:1`, `title`, `intro`, `goal`, `prediction`, `observation`, `explanation`, `challenge`, `sources`, `sourceIds`, `origin:example|ai|manual`, `experiment`. Sources have `id,title,author,url,excerpt`; at most five, unique IDs, excerpts at most 1200 characters. All text is rendered as text. Experiment is `{type:'gradient-descent',initialX,learningRate}` or `{type:'monty-hall',trials:100|1000}`.
- [ ] Implement Zod strict validation: title 80, goal 200, narrative fields 800, source URL HTTP(S) without credentials, version exact, finite numerical ranges, and source references resolve.
- [ ] Write original teaching text for both examples; retain original reference URLs. Mark the quadratic as a simplified teaching model, standard host rules explicitly, no invented author names.
- [ ] Encode validated Lesson as gzip/base64url prefixed `v1.`. Reject encoded length >12000, decoded bytes >65536 and invalid schema. Read decompression incrementally and cancel above cap. JSON export uses the same schema.
- [ ] Run `npm test`; all core tests pass before UI integration.

## Task 2: Server adapters (bounded subagent task)

Files: `src/lib/server/zhihu.ts`, `src/lib/server/generate.ts`, `src/lib/server/http.ts`, `src/app/api/search/route.ts`, `src/app/api/generate/route.ts`, `src/app/api/capabilities/route.ts`, `tests/server.test.ts`.

- [ ] Implement tests for search response mapping, upstream error handling, missing configuration, prompt/result validation, body limits and rate limiting before implementation. External I/O is injected or mocked at its boundary.
- [ ] `GET /api/search?q=...` validates a non-empty query <=200 chars, returns `{items:Source[]}`. Server uses official GET endpoint with server process credential; local development can use explicitly configured absolute `ZHIHU_CLI_PATH`, invoked via execFile with an argument array and no shell. Never return stderr, secret or raw upstream errors.
- [ ] `GET /api/capabilities` returns booleans `search`, `generation` and a safe provider label; never reports successful generation merely from a configured key.
- [ ] `POST /api/generate` input: `{mode:'teach'|'learn', material:string, question:string, sources:Source[], standardModel:boolean}`. Body <=128KiB, material <=20000 chars, question <=200, selected sources <=3. Success is `{lesson:Lesson,reason:string}`; unsupported material `{unsupported:true,reason:string}`; errors `{error:string}` with appropriate HTTP status.
- [ ] Prompt includes complete output shape and numerical limits, distinguishes supplied evidence from instructions, requires explicit standard-model consent, permits unsupported/insufficient outcomes, and forbids invented source IDs and source URLs. Server restores source metadata from selected inputs. `origin` is assigned server-side.
- [ ] AI uses configured compatible chat completions (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`). Investigate official Zhihu answer compatibility as an optional adapter; do not assume its free-form response satisfies JSON requirements. If no suitable configured model exists, generation returns 503 and examples remain usable.
- [ ] Enforce 45-second overall deadline, maximum one schema repair request within the deadline, bounded provider response and JSON validation. Use a 5-per-10-min generation limiter for a single Node instance; treat forwarding headers as untrusted unless operator opts into a trusted proxy. Search also gets a bounded limit. No material logging or persistence.
- [ ] Review spec compliance, then code quality; fix findings before merging the adapter with UI.

## Task 3: Reader and experiment UI

Files: `src/components/GradientExperiment.tsx`, `src/components/MontyExperiment.tsx`, `src/components/LessonView.tsx`, `src/components/Brand.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/view/page.tsx`, `src/components/Reader.tsx`, `tests/flows.spec.ts`.

- [ ] Add browser flow assertions before implementation; run against the initial app and confirm the experiment controls do not yet exist.

```ts
await page.goto('/view?example=gradient-descent');
await page.getByRole('button', {name:'单步前进'}).click();
await expect(page.getByTestId('gradient-step')).toHaveText('1');
await page.getByRole('button', {name:'重置实验'}).click();
await expect(page.getByTestId('gradient-step')).toHaveText('0');
```

- [ ] Gradient UI: SVG curve with trajectory, x/rate range and numeric inputs, step/play/pause/reset, numerical readout and stop reason. Changing parameters resets trajectory and challenge response. Follow reduced-motion preference.
- [ ] Monty UI: choice → reveal → stay/switch → result, reset preserves session tally, separate 100/1000-trial paired simulation and theoretical probability labels. Host cannot open a chosen/prize door. Challenge answer is fixed by standard rules.
- [ ] Reader renders prediction before interaction and observations/explanation after the experiment, a computed challenge, source-linked teaching notes, author/source cards and reference return links. No dangerouslySetInnerHTML.
- [ ] `/view` loads a built-in example from its type or a fragment payload. Invalid links show a recovery screen; JSON import rejects oversized files before reading. Reader state never overwrites a creator draft.

## Task 4: Landing and creator/self-study workspace

Files: `src/app/page.tsx`, `src/app/create/page.tsx`, `src/components/Workshop.tsx`, `src/components/MaterialInput.tsx`, `src/components/LessonEditor.tsx`, `src/components/SharePanel.tsx`, `src/lib/drafts.ts`.

- [ ] Homepage: editorial paper/ink layout, large two-line proposition, blue/orange graph, two mode entries, explicit supported experiments, live mini experiment and examples. Responsive layout supports 390px width without horizontal scrolling.
- [ ] Workshop mode is `teach` or `learn`; changes input phrasing and submitted generation goal while sharing editor and reader. Query parameters select mode/example. Editing an example is labelled manual/example rather than AI.
- [ ] Material input supports real search, selecting up to three sources, pasted material and optional source attribution. Show loading/empty/error separately. Selecting a summary preserves its URL with trace parameters. Consent to standard teaching rules is explicit.
- [ ] Editor exposes title, intro, goal, prediction, observation, explanation, challenge and experiment defaults. Source attribution stays visible; remove a source reference only through explicit editing logic without deleting any filesystem file. Preview uses the same LessonView.
- [ ] Save valid drafts to localStorage after hydration. Invalid edits remain in memory and visible; do not overwrite the last valid saved draft with invalid values. Show saved/failure state. Provide explicit restore so initial load never silently overwrites another draft.
- [ ] Share validates current edits and generates a snapshot URL; display manual copy fallback and stale status after edits. JSON download/import and text/Markdown export serve both interactive sharing and writing assistance. Browser clipboard failures do not discard the URL. No real secrets in payload.
- [ ] Browser tests cover edited title → snapshot → new browser context sees edit, creator draft restore, Monty play/batch/challenge, invalid fragment, unsupported AI state, and mobile layout.

## Task 5: Integration and handoff

Files: `README.md`, `.env.example`, `docs/demo-script.md`, `docs/validation.md`, `scripts/dev.mjs`.

- [ ] Document npm install/dev/test/typecheck/build commands, local CLI setup, compatible AI configuration names (placeholders only), supported scope, source limitations, and deployment server prerequisites.
- [ ] `npm test`, `npm run typecheck`, `npm run test:e2e`, production build; inspect desktop/mobile screenshots and browser console. Store artifacts under `.artifacts/`; never delete them.
- [ ] Exercise one live search through the application server using the configured official CLI; record only status/count and source metadata as needed, not secrets or complete responses.
- [ ] If model credentials are supplied, generate both supported types and one unsupported case through the real adapter. If unavailable, clearly report this remaining integration dependency rather than mark AI generation complete.
- [ ] Start preview locally and open it for the user. Update plan checks and validation evidence. Keep public deployment separate until a provider/environment is available; do not claim localhost is publicly shared.
- [ ] Review final changes, commit explicit project files, integrate the implementation branch into the original checkout without deleting the worktree or any files.

## Plan self-review

All design areas map to tasks 1–5. Interfaces are fixed above; first tests exercise rules and boundaries rather than static styling. Product scope stays at two experiments. External model availability and public hosting are explicit dependencies. File deletion and cleanup operations are excluded.
