# TM2.0 Pipeline Implementation Plan and Status Tracker

## Purpose
This document tracks the implementation of the multi-pass orchestration backend, all-in-one pipeline API, and Human-in-Review approval workflow for ServiceNow TM2.0 test asset generation.

## Execution Rule
No phase starts until approved by the user.

## Status Legend
- `Not Started`
- `In Progress`
- `Blocked`
- `In Review`
- `Completed`
- `Approved`

## Phase Board
| Phase | Scope | Status | Approval Required | Approval State | Notes |
|---|---|---|---|---|---|
| Phase 1 | Foundations: contracts, data model, orchestration skeleton | Approved | Yes | Approved | Completed and approved by user |
| Phase 2 | Core passes (1,2,3,6) + artifact persistence | Approved | Yes | Approved | Completed and approved by user |
| Phase 3 | Human-in-Review workflow (queue, approve/reject, audit) | Approved | Yes | Approved | Completed and approved by user |
| Phase 4 | All-in-one pipeline API (`run-all`) + pause/resume | Approved | Yes | Approved | Completed and approved by user |
| Phase 5 | Remaining passes (4,5,7,8,9,10,11) + coverage/self-QA | Approved | Yes | Approved | Completed and approved by user |
| Phase 6 | ServiceNow export hardening + end-to-end validation | Approved | Yes | Approved | Completed and approved by user |

## Phase Details

### Phase 1: Foundations
#### Goals
- Define v2 request/response contracts for pipeline APIs.
- Introduce pipeline run state model and pass state model.
- Add orchestration service skeleton with phase execution hooks.
- Add storage abstraction for runs, passes, reviews, and artifacts.

#### Planned Deliverables
- New route stubs for pipeline/review/artifact endpoints.
- Type definitions for pipeline entities.
- Validation schemas for pipeline create requests.
- Initial status endpoints returning deterministic run metadata.

#### Exit Criteria
- Can create a pipeline run and fetch status.
- Run state transitions are valid and tested for basic flow.
- No impact to existing `/api/generate-test-cases` behavior.

#### Approval Checkpoint
User must explicitly approve Phase 1 completion before Phase 2 starts.

### Phase 2: Core Passes and Artifacts
#### Goals
- Implement multi-pass flow for passes 1, 2, 3, and 6.
- Persist normalized artifacts per pass.
- Add per-pass schema validation and retry logic.

#### Exit Criteria
- Core pass chain executes in sequence.
- Failed pass does not corrupt run; retry works.
- Artifacts retrievable by API.

#### Approval Checkpoint
User must explicitly approve Phase 2 completion before Phase 3 starts.

### Phase 3: Human-in-Review
#### Goals
- Add review queue endpoints.
- Add approve/reject decision endpoints.
- Add pause/resume behavior at review gates.
- Add review audit trail.

#### Exit Criteria
- Pipeline can pause in `waiting_review`.
- Approve resumes execution; reject triggers targeted regeneration.
- Review history is queryable.

#### Approval Checkpoint
User must explicitly approve Phase 3 completion before Phase 4 starts.

### Phase 4: All-in-One Pipeline
#### Goals
- Implement `run-all` endpoint for full orchestration.
- Support `sync` and `async` run modes.
- Return full artifact bundle on completion.

#### Exit Criteria
- One request can start and complete full pipeline when no review gate blocks.
- Review-enabled runs pause and return waiting status cleanly.

#### Approval Checkpoint
User must explicitly approve Phase 4 completion before Phase 5 starts.

### Phase 5: Full Enterprise Coverage
#### Goals
- Implement remaining passes: 4, 5, 7, 8, 9, 10, 11.
- Add coverage analysis and self-QA validation outputs.
- Add consistency checks across artifacts.

#### Exit Criteria
- Full prompt.md intent supported through structured APIs.
- Coverage and RTM artifacts generated and validated.

#### Approval Checkpoint
User must explicitly approve Phase 5 completion before Phase 6 starts.

### Phase 6: ServiceNow Export Hardening and Validation
#### Goals
- Ensure TM2.0 export maps exactly to instance expectations.
- Validate choice mappings and linking behavior.
- Final end-to-end verification on export pipeline.

#### Exit Criteria
- Export payload quality checks pass.
- Story linking and metadata mapping verified.
- Final deployment-ready sign-off package prepared.

#### Approval Checkpoint
User must explicitly approve Phase 6 completion for project closeout.

## Approval Log
| Date | Phase | Decision | By | Notes |
|---|---|---|---|---|
| 2026-08-04 | Phase 1 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 1 Completion | Approved | User | Completion approved by user |
| 2026-08-04 | Phase 2 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 2 Completion | Approved | User | Completion approved by user |
| 2026-08-04 | Phase 3 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 3 Completion | Approved | User | Completion approved by user |
| 2026-08-04 | Phase 4 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 4 Completion | Approved | User | Completion approved by user |
| 2026-08-04 | Phase 5 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 5 Completion | Approved | User | Completion approved by user |
| 2026-08-04 | Phase 6 Start | Approved | User | Start approved by user |
| 2026-08-04 | Phase 6 Completion | Approved | User | Completion approved by user |

## Implementation Log
| Date | Phase | Update | Status |
|---|---|---|---|
| 2026-08-04 | Setup | Tracker file created | Completed |
| 2026-08-04 | Phase 1 | Added v2 pipeline contracts, validator, in-memory store, orchestrator skeleton, and v2 routes | In Review |
| 2026-08-04 | Phase 1 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |
| 2026-08-04 | Phase 2 | Implemented core pass orchestration (P1, P2, P3, P6), artifact persistence, execute and retry APIs | In Review |
| 2026-08-04 | Phase 2 | Implemented artifact retrieval APIs and core pass artifact validation | In Review |
| 2026-08-04 | Phase 2 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |
| 2026-08-04 | Phase 3 | Implemented review queue/detail/decision/history APIs | In Review |
| 2026-08-04 | Phase 3 | Added pause/resume at review checkpoints and approve/reject run-state transitions | In Review |
| 2026-08-04 | Phase 3 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |
| 2026-08-04 | Phase 4 | Added all-in-one API (`POST /api/v2/pipelines/run-all`) with `sync` and `async` run modes | In Review |
| 2026-08-04 | Phase 4 | Added explicit resume API (`POST /api/v2/pipelines/:pipelineId/resume`) for paused/rejected runs | In Review |
| 2026-08-04 | Phase 4 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |
| 2026-08-04 | Phase 5 | Implemented remaining pass executors (P4, P5, P7, P8, P9, P10, P11) with typed artifacts | In Review |
| 2026-08-04 | Phase 5 | Expanded orchestrator execution scope from core passes to full 11-pass pipeline | In Review |
| 2026-08-04 | Phase 5 | Added coverage summary and self-QA validation artifact generation | In Review |
| 2026-08-04 | Phase 5 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |
| 2026-08-04 | Phase 6 | Added TM2.0 preflight API (`GET /api/servicenow/tm20/preflight`) for table/access validation | In Review |
| 2026-08-04 | Phase 6 | Added export payload validation API (`POST /api/servicenow/tm20/validate-export-payload`) with story `sys_id` verification and mapping checks | In Review |
| 2026-08-04 | Phase 6 | Hardened ServiceNow mapping helpers for TM2.0 priority/test type mappings | In Review |
| 2026-08-04 | Phase 6 | Server typecheck passed (`npm --prefix server run typecheck`) | Completed |

## Working Protocol
1. I implement only the approved phase.
2. I provide a phase completion report with changed files, validation results, and known risks.
3. I request your `Approve` or `Reject` decision.
4. On `Approve`, I advance to next phase and update this tracker.
5. On `Reject`, I apply requested changes within the same phase and resubmit for approval.

## Current Request for Approval
All approved phases are complete.

Workflow status: Closed.

## Handover

### 1. Implemented API Index

#### Pipeline APIs
- `POST /api/v2/pipelines` - Create pipeline run
- `POST /api/v2/pipelines/run-all` - Create + run all-in-one pipeline (`sync` or `async`)
- `GET /api/v2/pipelines/:pipelineId` - Get pipeline summary/status
- `GET /api/v2/pipelines/:pipelineId/passes` - List pass statuses
- `GET /api/v2/pipelines/:pipelineId/passes/:passId` - Get pass detail
- `POST /api/v2/pipelines/:pipelineId/execute` - Execute pipeline run
- `POST /api/v2/pipelines/:pipelineId/resume` - Resume paused/rejected pipeline
- `POST /api/v2/pipelines/:pipelineId/passes/:passId/retry` - Retry pass and downstream chain

#### Artifact APIs
- `GET /api/v2/pipelines/:pipelineId/artifacts` - List generated artifacts
- `GET /api/v2/pipelines/:pipelineId/artifacts/:passId` - Fetch artifact by pass

#### Human-in-Review APIs
- `GET /api/v2/reviews/queue` - List pending reviews
- `GET /api/v2/reviews/:reviewId` - Get review detail
- `POST /api/v2/reviews/:reviewId/decision` - Approve/reject review
- `GET /api/v2/pipelines/:pipelineId/review-history` - Get review audit history

#### ServiceNow Hardening APIs
- `GET /api/servicenow/stories` - Fetch stories from `rm_story`
- `GET /api/servicenow/tm20/preflight` - Validate TM2.0 table connectivity/access
- `POST /api/servicenow/tm20/validate-export-payload` - Validate export readiness and mapping quality

### 2. Known Gaps / Future Enhancements
- Replace deterministic pass artifact generators with real LLM-driven per-pass prompts and strict schema re-tries.
- Add durable persistence (PostgreSQL) for runs, passes, reviews, and artifacts instead of in-memory storage.
- Implement actual ServiceNow TM2.0 write/export endpoint (create test/test_version/steps/link records) with rollback strategy.
- Add authenticated reviewer roles and authorization boundaries for review endpoints.
- Add idempotency keys for create/run APIs to avoid duplicate runs on client retries.
- Add integration tests for end-to-end paths: create -> execute -> review -> resume -> artifact retrieval.
- Add observability: structured logs, metrics, and traces for pass latency/failure/retry rates.

### 3. Production Readiness Checklist
- [x] Multi-phase orchestration APIs implemented
- [x] Human-in-Review checkpoint workflow implemented
- [x] All-in-one `run-all` API with `sync`/`async` modes implemented
- [x] ServiceNow preflight and export payload validation APIs implemented
- [x] TypeScript typecheck passing (`npm --prefix server run typecheck`)
- [ ] Persistent database backing configured
- [ ] Authentication and RBAC enforced for pipeline/review endpoints
- [ ] Rate limits tuned per endpoint profile in production environment
- [ ] End-to-end integration test suite automated in CI
- [ ] ServiceNow write/export endpoint implemented and validated in non-prod instance
