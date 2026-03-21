---
id: task-027
title: Migrate LLM provider logic to backend proxy
type: task
status: in_progress
priority: P1
owner: Eric Lott
claim_owner: Eric Lott
claim_status: claimed
claim_expires_at: "2026-03-22T19:07:23.055Z"
sla_due_at: "2026-04-15T23:59:00Z"
depends_on:
  - task-011
  - task-012
acceptance_criteria:
  - "Frontend `agentService.js` no longer contains API keys or direct provider URLs in fetch calls."
  - "All LLM requests are routed through a new `/api/agent/complete` endpoint."
  - Backend securely retrieves keys from environment variables or a managed vault (overriding client keys if present).
last_updated: 2026-03-21
---


# Task: Migrate LLM provider logic to backend proxy

## Task Goal
Improve security and auditability by moving sensitive LLM communication logic from the browser to the server.

## Parent Feature
- feature-007 (Server-side LLM Proxy)

## Implementation Steps
- Create `POST /api/agent/complete` endpoint in the Express backend.
- Port provider logic (OpenAI, Anthropic, Gemini) from `frontend/src/services/agentService.js` to a new backend service.
- Update frontend to call the internal proxy instead of direct provider APIs.
- Implement basic rate limiting and request logging on the proxy.

## Dependencies
- task-011
- task-012

## Acceptance Criteria
- Frontend `agentService.js` no longer contains API keys or direct provider URLs in fetch calls.
- All LLM requests are routed through a new `/api/agent/complete` endpoint.
- Backend securely retrieves keys from environment variables or a managed vault.

## Evidence Plan
- Network tab inspection confirming no direct calls to `api.openai.com` etc.
- Backend logs showing request proxying and successful status codes.
