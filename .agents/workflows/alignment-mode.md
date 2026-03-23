---
description: Strategic verification of vision-to-execution sync via agent-pack/03-agent-ops/REALIGNMENT.md
---

# Alignment Mode Workflow

Use this mode for strategic audits or when you suspect the codebase and backlog have drifted from the vision and business goals.

## Steps

1. **Strategic Context Check**: Read `agent-pack/00-context/vision.md`, `business-goals.md`, and `roadmap.md`.
2. **Realignment Prep**: Read the [REALIGNMENT.md](../../agent-pack/03-agent-ops/REALIGNMENT.md) manual.
3. **Audit Execution**:
   - Compare the current "Multi-View Interface" requirements against existing React components.
   - Verify that all active `P0/P1` tasks in `agent-pack/04-task-system/` directly support the "Multi-View Interface" strategic anchors.
4. **Identify Divergence**: Find architectural or functional divergence between the implementation and the source of truth.
5. **Log Realignment Decisions**: Record the rationale for any realignment in `agent-pack/05-state/decisions-log.md`.
6. **Task/Pillar Adjustments**:
   - Cancel or deprioritize tasks that do not align with the product mission.
   - Create new tasks or update pillar goals to bring the project back in sync.
7. **Actionable Findings**: Log the audit results and next steps in `agent-pack/05-state/progress-log.md`.
