---
id: task-021
title: Organize exported tasks into workstream folders
type: task
status: todo
priority: P1
owner: unassigned
claim_owner: unassigned
claim_status: unclaimed
claim_expires_at: null
sla_due_at: 2026-05-20T23:59:00Z
depends_on:
  - task-019
acceptance_criteria:
  - Tasks in the export zip are grouped into sub-folders within `tasks/todo/` based on their parent workstream (pillar).
  - Exported pack includes a `workstreams.md` file summarizing major architecture areas.
last_updated: 2026-03-19
---

# Task: Organize exported tasks into workstream folders

## Task Goal
Provide better navigation and organization for agents in the exported task system.

## Parent Feature
- feature-004

## Implementation Steps
- Update `exportService.js` recursive logic to create sub-directories for each top-level pillar under `tasks/todo/`.
- Aggregate pillar summaries into a new `workstreams.md` artifact in the `02-execution/` folder.
- Ensure task file paths in `dependency-map.md` reflect the new directory structure.

## Dependencies
- task-019

## Acceptance Criteria
- Tasks in the export zip are grouped into sub-folders within `tasks/todo/` based on their parent workstream (pillar).
- Exported pack includes a `workstreams.md` file summarizing major architecture areas.

## Evidence Plan
- Export of a multi-pillar project showing nested task folders.
- Review of `workstreams.md` for accurate mapping of pillars to work paths.

## Claim and SLA
- Claim this task before coding by setting claim_owner, claim_status, and claim_expires_at.
- Default claim window is 24 hours and must never exceed sla_due_at.
- If claim expires, set claim_status: expired, return task to todo, and allow re-claim.
- Any PR implementing this task must include this task file.
