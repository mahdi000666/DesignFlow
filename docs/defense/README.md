# DesignFlow Technical Defense Kit

This folder turns the 7-day learning plan into concrete study material for the final technical defense.

## Assumptions

- You can study 6-8 focused hours per day.
- The app is already functional, so the goal is understanding and explanation, not new feature work.
- Defense fluency matters more than memorizing every line. You need to trace the main flows, explain tradeoffs, and recover when asked to point to code.

## Evidence Anchors

Use these repo facts as the base of your defense narrative:

- From `docs/context/PROJECT_CONTEXT.md`: "A web-based project management + BI system for a graphic design agency."
- From `docs/context/PROJECT_CONTEXT.md`: "Agencies lose money due to scope creep and no visibility into actual vs. budgeted hours."
- From `README.md`: the main features are project/task management, time logging, client feedback, BI dashboards, report export, and role-based access control.
- From `backend/core/urls.py`: the backend is split by API domain under `/api/auth`, `/api/users`, `/api/projects`, `/api/tasks`, `/api/timelogs`, `/api/feedback`, `/api/files`, `/api/messages`, `/api/analytics`, and `/api/reports`.

## How To Use This Folder

Read these files in order:

1. `DAY_BY_DAY.md` - the daily execution schedule with verification checks.
2. `CODE_TRACE_MAPS.md` - the exact files and flows you must be able to trace.
3. `MOCK_DEFENSE_QA.md` - practice answers using assumption, evidence, tradeoff, limitation.
4. `SCOPE_CREEP_REWRITE_DRILL.md` - one feature rewrite exercise to prove implementation skill.

## Daily Rhythm

Use the same structure every day:

1. Read the assigned docs and code for 60-90 minutes.
2. Trace one feature end-to-end from UI to database.
3. Explain it out loud without looking.
4. Reopen the code and correct your explanation.
5. Write a 5-10 bullet cheat sheet for that topic.
6. Answer mock questions using evidence from file paths.

## Completion Standard

By the end of the week, you should be able to:

- Give a 2-minute project overview.
- Draw the 3-tier architecture from memory.
- Explain the database model and why each major relation exists.
- Trace login, project creation, task creation, timer logging, feedback, files, messages, analytics, AI, and export.
- Explain RBAC at both backend and frontend levels.
- Rebuild the Scope Creep Index feature from memory.
- Answer limitations honestly without sounding lost.

## Core Rule

Never answer a technical question from memory alone. Use this pattern:

1. Assumption: what you think the examiner is asking.
2. Evidence: the exact model, view, serializer, hook, or route that supports the claim.
3. Tradeoff: why the implementation is acceptable for this project.
4. Limitation: what could be improved with more time.

