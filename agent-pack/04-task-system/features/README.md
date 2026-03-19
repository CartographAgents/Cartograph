---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Features Contract

## Purpose
Translate epic outcomes into deployable feature slices.

## Inputs
- Parent epic definitions
- Architecture constraints and quality criteria

## Outputs
- Feature specs linked to atomic tasks

## Required Sections
- Problem Statement
- User/System Behavior
- Dependencies
- Acceptance Criteria
- Child Task IDs

## Metadata Schema
```yaml
id: feature-001
title: Example Feature
type: feature
status: backlog
priority: P1
owner: unassigned
depends_on:
  - epic-001
acceptance_criteria:
  - Observable feature outcome
last_updated: 2026-03-19
```

## Naming Rules
- File name: `feature-###-short-name.md`
- Features should decompose into atomic tasks wherever possible.

## Update Cadence
Update when feature scope, dependencies, or acceptance criteria change.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../tasks/README.md`
- `../../06-quality/acceptance-criteria.md`