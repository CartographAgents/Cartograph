---
description: Creating tasks and organizing the agent-pack/04-task-system folder
---

# Task Mode Workflow

Use this mode when the task backlog is missing, stale, or under-specified.

## Steps

1. **Strategic Context Check**: Read `agent-pack/00-context/vision.md` and `agent-pack/00-context/roadmap.md` to ensure any new tasks align with the product mission.
2. **Backlog Audit**: Inspect `agent-pack/04-task-system/tasks/todo/`, `claimed/`, and `in_progress/` folders to avoid creating duplicates.
3. **Decompose Strategy**: Break down prioritized features or roadmap milestones into atomic work items.
4. **Draft Tasks**: Create new task files in `agent-pack/04-task-system/tasks/todo/` using the proper task-###-slug.md naming convention.
5. **Enforce Metadata Contract**: Every task must include full YAML frontmatter as defined in [AGENTS.md](../../AGENTS.md):
   - id: task-###
   - title: Human-readable title
   - type: task | bug | spike
   - status: backlog | todo
   - priority: P0 | P1 | P2 | P3
   - owner: unclaimed
   - depends_on: [task IDs]
   - acceptance_criteria: 
     - specific, measurable criteria
   - last_updated: YYYY-MM-DD
   - claim_owner: null
   - claim_status: unclaimed
   - claim_expires_at: null
6. **Task Organization**: Move completed, cancelled, or miscategorized task files to their correct status buckets.
7. **Log Decisions**: If the decomposition strategy is non-obvious, record the rationale in `agent-pack/05-state/decisions-log.md`.
