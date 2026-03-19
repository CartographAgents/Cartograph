---
id: task-023
title: Enhance closeout script with automated progress logging
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-05-30T23:59:00Z
depends_on:
  - task-018
acceptance_criteria:
  - `cartograph-closeout.mjs` identifies recently changed files and suggests them as evidence.
  - The script automatically appends a formatted entry to `progress-log.md` during the closeout flow.
  - Prevents closeout if no summary or evidence is provided for the progress log.
last_updated: 2026-03-19
---

# Task: Enhance closeout script with automated progress logging

## Task Goal
Reduce manual overhead and enforce high-quality audit logs by automating progress logging during task completion.

## Parent Feature
- feature-006

## Implementation Steps
- Modify `cartograph-closeout.mjs` to detect staged/modified files in the current branch.
- Add interactive prompt or CLI argument to capture the "Summary" of work.
- Append new entry to `agent-pack/05-state/progress-log.md` with correct task ID, status, and evidence links.
- Integrate with `validate-task-pr.mjs` to ensure log entry existence before allowing closeout.

## Dependencies
- task-018

## Acceptance Criteria
- `cartograph-closeout.mjs` identifies recently changed files and suggests them as evidence.
- The script automatically appends a formatted entry to `progress-log.md` during the closeout flow.
- Prevents closeout if no summary or evidence is provided for the progress log.

## Evidence Plan
- Successful closeout of a dummy task with automated logging verified.
- Progress log showing correctly formatted entries with auto-detected evidence.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
