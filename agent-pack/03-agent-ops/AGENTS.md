# AGENTS Operating Contract

## Mission
Build and maintain software according to this pack by executing the highest-priority atomic task while preserving security, compliance, data integrity, and traceable progress.

## Source-of-Truth Precedence
When instructions conflict, resolve in this order:
1. `../00-context/*`
2. `../01-architecture/*` and `../02-execution/*`
3. `../04-task-system/*`
4. `../05-state/*`

State files track what happened. They do not silently override context or architecture decisions unless the decision is explicitly logged in `../05-state/decisions-log.md`.

## Operating Mode: High Autonomy
Default behavior is assume-and-log.

### Assume-and-Log Rules
- Proceed on non-critical ambiguity using the safest reasonable assumption.
- Record each assumption in `../00-context/assumptions.md` and reference the affected task ID.
- If assumption changes architecture intent, create a decision entry before continuing.

### Mandatory Stop Rules (Critical Risk)
Stop execution and log a blocker when any of the following is true:
- Security control choice is unknown for a sensitive path.
- Compliance or legal requirement is ambiguous.
- Data integrity, migration safety, or irreversible deletion risk is present.
- Conflicting requirements prevent a safe implementation path.

When stopped:
1. Add blocker entry to `../05-state/blockers.md`.
2. Add open question to `../05-state/open-questions.md`.
3. Add escalation note to `./escalation-rules.md` workflow section.

## Work Sequencing Flow
1. Read current scope from `../00-context/*`.
2. Confirm architecture and execution constraints from `../01-architecture/*` and `../02-execution/*`.
3. Select one atomic task from `../04-task-system/tasks/` with dependencies satisfied.
4. Execute the task.
5. Validate against `../06-quality/*`.
6. Update state logs in `../05-state/*`.
7. Mark task status transition only with evidence.

## Task Metadata Contract
All task artifacts must include YAML frontmatter with:
- `id`
- `title`
- `type`
- `status`
- `priority`
- `owner`
- `depends_on`
- `acceptance_criteria`
- `last_updated`

### Enums
- `type`: `epic | feature | task | bug | spike`
- `status`: `backlog | todo | in_progress | blocked | done | cancelled`
- `priority`: `P0 | P1 | P2 | P3`

## State Log Schemas
### Progress Log Entry
- `timestamp`
- `task_id`
- `summary`
- `evidence`
- `next_step`

### Blocker Entry
- `blocker_id`
- `impact`
- `unblock_condition`
- `owner`
- `escalation_status`

### Decision Entry
- `decision_id`
- `context`
- `options`
- `chosen_option`
- `rationale`
- `date`

## Definition of Done Gates
A task can move to `done` only when:
1. Acceptance criteria are met and documented.
2. Required tests/validations passed per `../06-quality/testing-strategy.md`.
3. Security and reliability checks are satisfied for scope.
4. Progress log contains implementation evidence.
5. No unresolved blocker remains linked to the task.

## Guardrails: What Not To Do
- Do not guess through critical-risk ambiguity.
- Do not skip dependency order.
- Do not close tasks without evidence.
- Do not rewrite source-of-truth intent without a logged decision.
- Do not remove unresolved questions from state logs.

## Required Sections For This File
- Mission
- Source-of-Truth Precedence
- Operating Mode
- Work Sequencing Flow
- Metadata and State Schemas
- Definition of Done
- Guardrails
- Update Cadence

## Update Cadence
- Update whenever workflow rules, risk posture, or schema contracts change.
- Review before each major autonomous execution cycle.

## Source of Truth References
- `../00-context/vision.md`
- `./agent-rules.md`
- `./decision-making-framework.md`
- `../02-execution/definition-of-done.md`
- `../05-state/*`