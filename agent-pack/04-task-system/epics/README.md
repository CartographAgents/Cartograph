---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Epics Contract

## Purpose
Capture large value streams decomposed into features and atomic tasks.

## Inputs
- Architecture and execution plans
- Business goals and constraints

## Outputs
- Epic definitions with measurable outcomes
- Feature decomposition map

## Required Sections
- Epic Summary
- Outcome Metrics
- In Scope and Out of Scope
- Child Feature IDs
- Risks

## Metadata Schema
```yaml
id: epic-001
title: Example Epic
type: epic
status: backlog
priority: P1
owner: unassigned
depends_on: []
acceptance_criteria:
  - Metric or behavior that proves epic completion
last_updated: 2026-03-19
```

## Naming Rules
- File name: `epic-###-short-name.md`
- IDs are immutable once published.

## Update Cadence
Update when epic scope or feature breakdown changes.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../features/README.md`
- `../../05-state/decisions-log.md`