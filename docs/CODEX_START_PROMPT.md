# First message to Codex

Read `AGENTS.md` and the whole `docs/` handoff. You are implementing a real repository, not writing another plan. Begin with **milestone M0 only** from `docs/IMPLEMENTATION_PLAN.md`: scaffold the workspaces, create all Dockerfiles, web reverse proxy and a responsive Plant Laboratory shell with a working API and Postgres migrations. Keep the requested `.env` values (`HOST_PORT=8155`, `PUBLIC_DOMAIN=http://localhost`). Do not add unnecessary frameworks. Execute the M0 acceptance commands, fix failures, update `docs/PROGRESS.md`, then report results and ask to proceed to M1. All later milestones must follow the exact order and contracts specified.

# Subsequent prompts

- `Implement M1 exactly as specified, validate it, update PROGRESS.md, and report.`
- `Implement M2 exactly as specified, validate it, update PROGRESS.md, and report.`
- `Implement M3 exactly as specified, validate it, update PROGRESS.md, and report.`
- `Implement M4 exactly as specified, validate it, update PROGRESS.md, and report.`

For more independent execution: `Implement M0 through M4 sequentially, checking each acceptance gate and recording verified results. Do not skip failed gates.`
