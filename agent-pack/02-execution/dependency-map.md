# Dependency Map

## Purpose
Record execution order constraints so agents can plan work without unsafe parallelism.

## Inputs
- `./workstreams.md`
- Architecture integration points from `../01-architecture/*`

## Outputs
- Directed dependency list
- Critical path visibility

## Required Sections
- Dependency Nodes
- Dependency Edges
- Critical Path
- Parallel-Safe Segments
- Blocking Risks

## Update Cadence
Update whenever task graph, interfaces, or ownership changes.

## Source of Truth References
- `../04-task-system/tasks/README.md`
- `../05-state/blockers.md`
- `../05-state/open-questions.md`