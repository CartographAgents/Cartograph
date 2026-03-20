# Cartograph Vision

## Purpose

Define the strategic contract for Cartograph so all architecture and execution artifacts remain aligned to a clear product mission and are directly consumable by autonomous coding agents without additional interpretation.

## Inputs

* User and team product intent (iterative, evolving, potentially incomplete)
* Architecture-to-execution operating goals
* Enterprise delivery, security, and governance expectations
* Explicit and implicit constraints (technical, regulatory, budgetary)
* Prior decisions, revisions, and state logs (if continuing an existing pack)

## Outputs

* Stable product mission and guiding principles
* Fully structured, execution-grade blueprint pack
* Explicit, dependency-aware task system
* Agent-operable instructions and guardrails
* Measurable success criteria for blueprint effectiveness
* Clearly defined scope boundaries and non-goals

---

## Product Contract

Cartograph is an open-source, agent-guided architecture platform that transforms evolving product ideas into execution-grade blueprint packs designed for long-running autonomous coding agents.

It is not a documentation tool. It is a **translation layer between architecture intent and autonomous execution**.

### Problem Statement

Most agent execution fails because inputs are:

* Fragmented across tools and formats
* Ambiguous or underspecified
* Missing dependency structure
* Lacking guardrails and validation criteria
* Stateless, with no memory of progress, blockers, or decisions

PRDs, chat logs, and informal notes are not shaped for implementation and cannot support multi-hour or multi-day autonomous execution.

### Core Promise

From idea to agent-ready blueprint.

Cartograph converts architecture intent into a durable, machine-consumable mission pack with:

* Clear scope and boundaries
* Explicit architectural decisions and tradeoffs
* Dependency-aware task decomposition
* Enforced execution order
* Quality gates and validation criteria
* Persistent operational state (progress, blockers, decisions)

### Key Differentiator

Cartograph outputs are:

* Structured for machines first, humans second
* Stateful across time
* Execution-shaped, not descriptive
* Capable of supporting **long-running, autonomous agent workflows**

---

## Target Users

* Product and engineering teams designing new systems or major platform changes
* Solution architects requiring enterprise-grade documentation and traceability
* Autonomous coding-agent operators running extended execution cycles
* Founders or teams leveraging AI agents for full-system implementation

---

## Enterprise-First Principles

1. **Decision-driven, not template-driven**
   All outputs must originate from explicit decisions, not pre-filled templates.

2. **Agent-consumable by default**
   Every artifact must be structured for deterministic machine interpretation.

3. **Stateful and iterative**
   The system must preserve and evolve decisions, logs, and execution state over time.

4. **Security and governance as first-class concerns**
   Identity, compliance, auditability, and risk are mandatory inputs, not optional add-ons.

5. **Execution-shaped output**
   All architecture must decompose into workstreams, tasks, dependencies, and validation steps.

6. **Dependency-first modeling**
   Nothing is “flat.” All work must explicitly define prerequisites and sequencing.

7. **No implicit assumptions**
   Unknowns must be surfaced, logged, and resolved or explicitly deferred.

---

## Non-Goals

* Not a visual diagram generator without execution semantics
* Not a static PRD or documentation export tool
* Not a stack-locked or opinionated framework tied to a single ecosystem
* Not a replacement for human decision-making in high-risk or ambiguous scenarios
* Not a code generator without architectural grounding

---

## Measurable Success Criteria

* ≥ 90% of generated tasks include:

  * Acceptance criteria
  * Dependency metadata
  * Clear inputs and outputs

* ≥ 95% of completed tasks include:

  * Evidence links (PRs, commits, logs)
  * Validation results

* ≤ 10% of blocked tasks are due to missing or ambiguous blueprint context

* Agents can execute autonomously for multi-day runs using only:

  * The blueprint pack
  * The target repository

* ≥ 90% of architectural decisions are traceable to:

  * Source requirements
  * Explicit tradeoff documentation

---

# Pack Intent

The Cartograph pack is a **self-contained execution system**, not just documentation.

It must provide everything required for an autonomous agent to:

* Understand the system
* Plan execution
* Execute incrementally
* Track progress
* Handle failures
* Resume work without human intervention

## Core Pack Characteristics

* Deterministic structure (predictable file locations and formats)
* Explicit dependency graph
* Atomic, independently executable tasks
* Persistent execution state
* Clear escalation and blocking paths
* Strict separation of:

  * context
  * architecture
  * execution
  * state

---

## Required Pack Structure

```text
/cartograph-output

  /00-context
    vision.md
    business-goals.md
    constraints.md
    assumptions.md

  /01-architecture
    system-overview.md
    domain-model.md
    api-strategy.md
    data-architecture.md
    security-architecture.md
    infrastructure-architecture.md
    integration-architecture.md
    non-functional-requirements.md

  /02-execution
    implementation-strategy.md
    workstreams.md
    dependency-map.md
    milestones.md
    definition-of-done.md

  /03-agent-ops
    AGENTS.md
    agent-rules.md
    coding-standards.md
    execution-loop.md
    escalation-rules.md

  /04-tasks
    /epics
    /features
    /tasks
    /spikes
    /bugs

  /05-state
    progress-log.md
    blockers.md
    decisions-log.md
    change-log.md
    open-questions.md

  /06-quality
    testing-strategy.md
    acceptance-criteria.md
    observability.md
    performance-budget.md
    security-checklist.md

  /07-artifacts
    diagrams.md
    prompts.md
    glossary.md
```

---

## Agent Execution Model (Critical)

Agents consuming this pack must operate under a defined loop:

1. Read `AGENTS.md` (entry point)
2. Identify next eligible task (dependency satisfied, not blocked)
3. Execute task
4. Validate against acceptance criteria
5. Log:

   * progress
   * decisions (if any)
   * blockers (if encountered)
6. Update task status
7. Repeat

### Hard Rules for Agents

* Never skip dependencies
* Never invent missing requirements
* Log uncertainty instead of guessing
* Stop execution when blocked and record context
* Treat markdown files as source of truth, not suggestions

---

## Task Design Requirements

Every task must include:

* Unique ID
* Clear description
* Inputs and prerequisites
* Explicit dependencies
* Step-by-step execution guidance
* Acceptance criteria
* Expected outputs/artifacts
* Failure conditions
* Logging requirements

Tasks must be:

* Atomic (completable in a bounded scope)
* Deterministic (no vague outcomes)
* Independently testable

---

## State Management Model

State is not optional. It is required for long-running execution.

### Required State Files

* `progress-log.md`
  Chronological record of completed work

* `blockers.md`
  All unresolved issues preventing execution

* `decisions-log.md`
  Any deviation or new decision made during execution

* `change-log.md`
  Changes to scope, architecture, or tasks

* `open-questions.md`
  Unresolved ambiguities requiring input

Agents must read and update these continuously.

---

## Failure Handling

Agents must:

* Detect missing inputs, invalid assumptions, or conflicting instructions
* Log issues to `blockers.md`
* Halt dependent tasks
* Continue with parallelizable work if possible

No silent failures.

---

## Update Cadence

* Update when:

  * Product strategy changes
  * Target persona changes
  * Architecture direction shifts
  * Execution model evolves

* Review:

  * At every major milestone
  * After any failed or degraded agent execution cycle

---

## Source of Truth References

* `../03-agent-ops/AGENTS.md` (primary execution contract)
* `../00-context/business-goals.md`
* `../00-context/constraints.md`
* `../00-context/assumptions.md`
* `../05-state/*` (live execution truth)
* `../02-execution/dependency-map.md`

---

## Final Constraint (Important)

If a coding agent cannot:

* determine what to do next,
* determine how to validate success,
* or determine what to do when blocked,

then the pack is incomplete.

Cartograph’s responsibility is to eliminate those gaps.