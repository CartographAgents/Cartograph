---
doc_type: task_contract
schema_version: 1
last_updated: 2026-03-19
---

# Bugs Contract

## Purpose
Track defects with reproducible context, impact, and fix validation.

## Inputs
- Defect reports
- Observability and testing evidence

## Outputs
- Reproducible bug records and validated fixes

## Required Sections
- Defect Summary
- Reproduction Steps
- Impact Assessment
- Fix Strategy
- Validation Evidence

## Metadata Schema
```yaml
id: bug-001
title: Example Defect
type: bug
status: todo
priority: P1
owner: unassigned
depends_on: []
acceptance_criteria:
  - Repro no longer fails
  - Regression test added or updated
last_updated: 2026-03-19
```

## Naming Rules
- File name: `bug-###-short-name.md`
- Severity should align with `priority` and documented impact.

## Update Cadence
Update on every triage or fix-state change.

## Source of Truth References
- `../../03-agent-ops/AGENTS.md`
- `../../06-quality/testing-strategy.md`
- `../../05-state/change-log.md`