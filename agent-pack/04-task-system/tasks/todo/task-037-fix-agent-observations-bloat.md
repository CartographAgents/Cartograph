---
title: Fix Agent Observations notification bloat
status: todo
category: frontend
priority: high
assignee: null
claim_status: released
created_at: 2026-03-21T15:58:00Z
updated_at: 2026-03-21T15:58:00Z
---

# Task 037: Fix Agent Observations notification bloat

## Problem Statement
The "Agent Observations" section in the frontend currently displays a flat, unfiltered list of all validation errors and warnings. In larger projects, this list grows extremely long, dominates the UI, and pushes the primary workspace content (Blueprint Details and Dependency Graph) out of the initial viewport.

## Acceptance Criteria
- [ ] Observations are grouped by type (Error/Warning) or by Pillar.
- [ ] Observations are filtered to show only those relevant to the *active* pillar in the `Details` view.
- [ ] Added a summary view at the top level when no pillar is selected.
- [ ] Implemented a collapsible/expandable UI for the observations list.
- [ ] Verified that the workspace header and core content are visible in the initial viewport.

## Technical Notes
- Modify `frontend/src/hooks/useAppLogic.js` to enhance the `agentFeedback` object with grouped/filtered data.
- Update `frontend/src/App.jsx` to use the new grouped data and implement the collapsible UI.
- Ensure `validationService.js` provides enough metadata in `metadataReport` to support filtering by pillar ID.

## Evidence of Done
- Screenshot showing the observations list collapsed or summarized.
- Screenshot showing observations filtered when a specific pillar is selected.
- Verification that "Architecture Blueprint" header is visible without scrolling.
