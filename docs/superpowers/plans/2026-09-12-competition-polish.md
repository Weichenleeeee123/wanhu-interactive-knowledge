# 知玩参赛打磨 Implementation Plan

> Use bounded asset/research subagents and read-only reviews. Only the root Site owner edits application source, calls Sites, commits or publishes. Never delete files.

**Goal:** Make the approved two-experiment workshop compelling, operable and ready for competition handoff.

**Architecture:** Preserve Lesson v1 and the verified engines. Add ephemeral reader-session progress independently of shared Lesson snapshots. Reuse the app in a compatible hosted runtime with shared request quotas and search cache.

**Tech Stack:** React, TypeScript, Zod, Next.js local runtime, Worker-compatible public entry, Vitest, Playwright, PDF tooling.

## 1. Learning experience

- [ ] Add browser regressions: lock a prediction, complete a real experiment, answer the challenge, verify the session recap. Selecting another answer after locking must be impossible; a different lesson must not inherit progress.
- [ ] Add pure session contract and UI in `src/lib/learning.ts`, `src/components/LearningProgress.tsx`; lesson config changes reset session. Keep progress out of saved/shared lesson.
- [ ] Wire experiment callbacks for actual play/simulation and latest challenge result. Add gradient scenario buttons using existing reset logic and a standard Monty enumeration explanation.
- [ ] Add material topic starters and truthful generation elapsed time. Tighten prompt to avoid unsupported claims and accidental default zero gradient start.
- [ ] Integrate styles, usable typography, favicon and immediate demo entry in the existing layout.

## 2. Submission and hosted runtime

- [ ] Root integrates independent submission asset drafts after checking each claim against implemented behavior.
- [ ] Complete existing `2026-09-12-submission-release.md` runtime plan; preserve local CLI and do not log input materials or secrets.
- [ ] Generate polished PDF, shareable source/material archives and judge Q&A. All outputs use fresh destinations and remain on disk.

## 3. Review and release

- [ ] Run meaningful unit/browser regressions, typecheck and production builds; inspect desktop/mobile and fix concrete issues.
- [ ] Independent read-only review of learning state correctness and hosted quota/secret boundaries. Resolve blocking findings.
- [ ] Save and deploy verified source using existing Site; separate required public audience confirmation from private preview. Record exact reachable URL only after deployment succeeds.
- [ ] Update submission links, evidence and handoff checklist. Report remaining formal submit action truthfully; no invented team information or research results.
