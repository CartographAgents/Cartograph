---
description: Knocking out tasks, bugs, and spikes through standard contribution bootstrap
---

# Work Mode Workflow (Default)

Use this mode when you are executing existing backlog items as the primary contributor.

## Steps

### Initialization
1. **Context Check**: Read [AGENTS.md](../../AGENTS.md) and identify the highest priority tasks (`P0` then `P1`).
2. **Mistake Check**: Read the latest 5 entries in `agent-pack/03-agent-ops/mistakes-framework.md` to avoid known pitfalls.
3. **Execution Safety**: Verify your environment (backend/frontend build status) and ensure you are not on `main` before starting implementation.

### Task Claiming
// turbo
1. **Claim Task**: Run `node scripts/cartograph-contribute.mjs --auto` to automatically claim the next eligible P0/P1 task.
2. **Review Context**: Once claimed, read the specific item description, acceptance criteria, and relevant architecture docs. 
   - Note: If the bootstrap returns a non-zero exit code, STOP and escalate or resolve the branch creation issue.

### Implementation
1. **Plan Implementation**: Create a local plan (e.g., in a scratch file) before coding.
2. **Write Code**: Implement only what is required by the task's `acceptance_criteria`.
3. **Local Validation**: 
   - Verify changes against quality gates: `npm run lint`, `npm run build`, and `npm run test` (for both frontend and backend).
   - Ensure you are adhering to `agent-pack/03-agent-ops/coding-standards.md`.

### Task Closeout
// turbo
1. **Pre-Closeout Validation**: Run `node scripts/validate-task-pr.mjs --self-check --task-id task-###` to ensure PR and metadata compliance.
2. **Log Progress**: Record your evidence and next steps in `agent-pack/05-state/progress-log.md`.
// turbo
3. **Automated Closeout**: Run `node scripts/cartograph-closeout.mjs --task task-### --create-pr` to finalize the work and open a pull request.
