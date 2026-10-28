# Architectural decisions (fixed for v1)

- First deliverable is Plant Laboratory, not the entire idle economy.
- React/Vite frontend; Fastify backend; PostgreSQL; npm workspaces; Docker Compose; TypeScript across code.
- Illustrated 2D original SVG primitives; pure deterministic renderer with optional PixiJS **later** only if performance demands.
- Diploid fixed-locus genetics; explicit seed and versions; no bio-realism claims.
- One demonstrator species (`velvetleaf`), other species supported by schema but not required before M4.
- Two-parent controlled breeding, server authoritative and idempotent.
- Single sandbox demo player, no auth or public release at MVP stage.
- English UI for v1, sensible localization-ready keys later.
- Simple focused tests over test-heavy process; acceptance gates must work.
- No cloud API dependencies for game operation.
