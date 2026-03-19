---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Tasks Contract (Atomic Default)

## Purpose
Define the default unit of execution for autonomous agents.

## Inputs
- Parent feature
- Current dependency map and quality requirements

## Outputs
- Atomic implementation task with objective completion evidence

## Required Sections
- Task Goal
- Implementation Steps
- Dependencies
- Acceptance Criteria
- Evidence Plan

## Metadata Schema
```yaml
id: task-001
title: Example Atomic Task
type: task
status: todo
priority: P1
owner: unassigned
depends_on:
  - feature-001
acceptance_criteria:
  - Single verifiable deliverable
last_updated: 2026-03-19
```

## Atomicity Rules
- One task should represent one principal deliverable.
- Target effort is approximately 0.5 to 1 day.
- If a task needs multiple independent deliverables, split it.

## Status Lifecycle
`backlog -> todo -> in_progress -> blocked -> in_progress -> done`

## Naming Rules
- File name: `task-###-short-name.md`
- Task IDs remain stable even if title changes.

## Update Cadence
Update as state transitions or acceptance criteria change.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../../02-execution/dependency-map.md`
- `../../05-state/progress-log.md`