---
description: Ensuring the repo is well-structured and follows AGENTS.md and agent-pack/02-execution/implementation-strategy.md
---

# Repo Mode Workflow

Use this mode when you need to maintain architectural integrity, refactor code, or update documentation.

## Steps

1. **Audit Structure**: Scan the repository structure against the [AGENTS.md](../../AGENTS.md) contract and modularity guidelines.
2. **Review Implementation Strategy**: Read `agent-pack/02-execution/implementation-strategy.md` to ensure file organization follows the blueprint.
3. **Draft Refactor Plan**: Identify monolithic modules or files (e.g., `server.js`, `App.jsx`, `agentService.js`) that require decomposition.
4. **Decomposition Execution**:
   - Move shared logic into `frontend/src/services/` or `backend/services/`.
   - Extract React sub-components into standalone files in `frontend/src/components/`.
   - Break down monolithic route files into resource-specific handlers.
5. **Standardize Documentation**: Ensure JSDoc, internal READMEs, and the `agent-pack` are in sync with any structural changes.
6. **Integrity Validation**: 
   - Dry-run all scripts (`cartograph-contribute.mjs`, `cartograph-closeout.mjs`) to ensure path resolution still works. 
   - Verify `../../.cartograph/workflow.json` remains the source of truth for workflow paths.
7. **Consistency and Quality Check**: Finalize changes by running `npm run lint` and `npm run build` to verify no regressions in the unified system.
