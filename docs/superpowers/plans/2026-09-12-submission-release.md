# 知玩 Submission Release Plan

> **For agentic workers:** Use subagent-driven-development for independent submission assets and read-only release reviews. Only the root Site owner changes application source, calls Sites, or publishes. Never delete files; preserve every build/archive.

**Goal:** Deliver the existing approved product as a public, usable competition Demo, with a submit-ready product plan and a concise submission checklist.

**Architecture:** Keep the tested Next.js local app and its shared React workshop/reader. Add a portable Cloudflare Worker deployment entry that bundles the same components, serves its own static assets, and calls official Zhihu APIs using runtime secrets. A D1 store owns shared public quota counters and search cache; personal materials remain request-only. The public demo requires no account.

**Tech Stack:** Existing React/TypeScript/Zod, esbuild, Worker Fetch API, D1 prepared statements and generated Drizzle migrations, ReportLab PDF.

## Confirmed external requirements

Official developer handbook (9 September revision) requires a public operable Demo and product plan; repository and demonstration video are optional. Submission opens 13 September 10:00 and closes 15 September 10:00. Registration closes 13 September 00:00. Explain real Zhihu integration and learning value; no invented user metrics. Project preparation may proceed now; the final contest submission remains a user account action when the channel opens.

## 1. Public runtime

Files: `src/edge/client.tsx`, `src/edge/link.tsx`, `src/edge/worker.ts`, `src/edge/api.ts`, `src/edge/store.ts`, `scripts/build-public.mjs`, `scripts/package-public.mjs`, `db/schema.ts`, `drizzle.config.ts`, generated `drizzle/*`, `.openai/hosting.json`.

- [ ] Add regression tests for search cache hit/expiry, atomic quotas, unsupported input, safe public capabilities, provider errors and no unexpected routes. Run them failing before implementing.
- [ ] Reuse `Workshop`, `Reader`, homepage and CSS with a minimal browser link adapter; retain `/`, `/create`, `/view` behavior and real source return links.
- [ ] Bundle browser JS/CSS into Worker constants and serve exact asset paths with long-lived immutable cache headers. Only known app and API routes are accepted.
- [ ] Use D1 prepared statements for a 10-minute search cache, per-client request windows, and a shared ceiling of 80 official upstream calls per UTC+8 day. Every model repair call consumes a slot; missing D1 fails closed for API while examples remain usable.
- [ ] Accept secrets only from runtime env; preserve 30s search and 45s generation deadlines, bounded bodies, strict result validation and authored error messages. Keep local CLI integration unchanged.
- [ ] Add local search caching around the Next adapter to honor the official recommendation in both runtimes.

## 2. Submit-ready materials

Files: `submission/product-plan.md`, `submission/submission-copy.md`, `submission/README.md`, public PDF and screenshots. Generated intermediates stay in `.artifacts/`.

- [ ] Write a polished Chinese plan covering audience, concrete scenarios, creator/learner flows, Zhihu content loop, AI role, architecture, actual evidence, current scope, expansion, rights and limitations.
- [ ] Generate and visually inspect a PDF. No fabricated team names, user counts, claims of improving grades, or already-completed submission.
- [ ] Provide concise form-ready project name, one-line pitch, description, innovation, technical implementation and public entry. Add exact handoff items for registration/team identity/final submission.
- [ ] Prepare a short demonstration video if practical after mandatory deliverables; label it as a demonstration, not proof of research outcomes.

## 3. Publish and verify

- [ ] Build locally, test the Worker app plus existing tests, inspect desktop/mobile and source links. Use fresh output destinations without cleanup.
- [ ] Configure runtime secret securely, register public access for the requested contest audience, commit exact source, push via per-command credential, archive validated Worker output, save one version and deploy through native Sites tools.
- [ ] Confirm deployment success. Perform the required public functionality checks separately from the publishing handoff; verify no account needed, safe capabilities, cached real search, both examples and sharing. Keep live generation calls minimal because both real lesson types are already validated locally.
- [ ] Finalize links in plan and form copy, bundle source and materials, report what is ready and the specific remaining account/submission action. Do not claim the contest entry itself was submitted.

The Sites packager normally removes its staging directory. The user's explicit no-file-deletion instruction takes precedence: use a project-local equivalent that checks the same Worker/manifest/migration archive contract and retains its staging directory and output.
