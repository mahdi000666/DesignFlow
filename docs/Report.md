**Higher Institute of Management of Sousse**

Department of Information Technology - Business Intelligence Track

**FINAL YEAR PROJECT**

**DesignOps:**

**Design Project Profitability Analytics System**

_Design and Development of_

_a Web-Based Project Management and Business Intelligence Application_

_for a Graphic Design Agency_

_Prepared by_

**Mahdi Mlika**

Third-Year IT Student - Business Intelligence

| Academic Supervisor     | Mr. Trigui Omar                        |
| ----------------------- | -------------------------------------- |
| Professional Supervisor | Mr. Jawhar Letaief                     |
| Host Organisation       | Creative Media - Graphic Design Agency |
| Academic Year           | 2025 - 2026                            |

# Acknowledgements

I would like to express my sincere gratitude to all those who contributed to the successful completion of this final year project.

First and foremost, I thank my academic supervisor, **Mr. Trigui Omar**, for his guidance, constructive feedback, and continuous support throughout this project. His expertise and thoughtful recommendations have been invaluable in shaping the direction and quality of this work.

I also extend my thanks to my professional supervisor, **Mr. Jawhar Letaief**, at Creative Media, for welcoming me into the organisation, providing access to the operational context that made this project relevant, and for the insightful discussions that helped me understand the real-world challenges the system is designed to solve.

I am grateful to the faculty and staff of the Higher Institute of Management of Sousse for providing the academic framework that made this project possible.

Finally, I thank my family and friends for their unwavering encouragement and patience throughout this journey.

# Abstract

This report documents the design and development of a web-based project management and business intelligence system, built during a three-month internship at Creative Media, a small graphic design agency in Tunisia. The agency currently has no digital system for tracking project hours or measuring profitability - costs are estimated informally, and it is only after a project closes that the manager can judge whether it was financially sound.

The system developed here addresses this directly. It provides a Django REST API backend, a React/TypeScript single-page application for the frontend, and a PostgreSQL database. Three user roles are supported: a Manager who oversees all projects and accesses analytical dashboards, Designers who log time against tasks, and Clients who submit feedback and track their project status.

Key metrics implemented include the Effective Hourly Rate, Budget Utilisation, Scope Creep Index, Designer Utilisation, and Revision-to-Approval Ratio. All are computed in real time via PostgreSQL aggregate queries. The system also supports file uploads, an internal messaging board per project, and PDF/Excel export of reports.

Development followed six two-week Agile sprints, progressing from authentication and data modelling through to BI dashboards, report export, and cloud deployment.

Future development may extend the system to a multi-tenant architecture, enabling independent design agencies to operate on a shared platform with fully isolated data environments.

**Keywords:** Business Intelligence, Project Management, Django REST Framework, React, TypeScript, PostgreSQL, Profitability Analytics, Scope Creep, Agile Development, Graphic Design Agency.

# General Introduction

## 1\. Context and Justification

Graphic design agencies operate in a highly competitive environment where the quality of creative output must be balanced against strict budget and deadline constraints. Unlike product-based businesses, design agencies generate their entire revenue by selling designer time - yet most agencies have no system to track how that time is spent relative to what was budgeted. Project tracking, if done at all, relies on spreadsheets, verbal agreements, or generic task management tools that lack financial visibility.

Without real-time data on hours logged against a project budget, a manager cannot know whether a project is profitable until it is complete - often too late to take corrective action. Scope creep, defined as the accumulation of tasks added after a project's initial specification, is particularly damaging in creative work, where revision cycles are frequent and the boundary between contracted and extra work is easily blurred.

Creative Media, the host organisation for this internship, faces precisely these challenges. Projects are currently tracked informally, profitability is estimated rather than measured, and designer capacity is managed by intuition rather than data. This project was initiated to address these gaps directly.

## 2\. Problem Statement and Objectives

The core question this project addresses is: How can a graphic design agency gain real-time, data-driven visibility into the profitability of its projects, the utilisation of its designers, and the extent of unplanned scope growth - and use that information to make better operational and financial decisions?

The project was scoped to the following objectives:

- Design and develop a full-stack web application covering the complete project lifecycle, from creation to delivery.
- Implement a granular time-tracking system linking logged hours to specific tasks and project budgets.
- Build analytical dashboards exposing key profitability metrics: Effective Hourly Rate, Budget Utilisation, Scope Creep Index, Designer Utilisation, and Revision-to-Approval Ratio.
- Enforce role-based access control for three user types (Manager, Designer, Client) ensuring data confidentiality and appropriate functionality per role.
- Support PDF and Excel report exports for offline management reporting.
- Deploy the complete system to a cloud environment accessible by the agency's team.

## 3\. Methodology

This project adopts an Agile development methodology adapted for a solo developer context, organised into six two-week sprints, each delivering a vertical slice of working functionality - from the database layer through the API to the user interface. This approach produces demonstrable progress at each supervisor review and limits integration risk by ensuring every feature is complete before the next is started.

## 4\. Report Structure

Chapters 1 and 2 establish the organisational context and technical framework. Chapters 3 through 9 follow the six-sprint cycle. The General Conclusion evaluates the working hypotheses and proposes future development directions.

# Chapter 1 - Project Presentation and Framing

## 1\. Presentation of the Host Organisation

### 1.1 About Creative Media

Creative Media is a Tunisian graphic design agency specialising in visual communication materials for a diverse client portfolio. Its core services include brand identity design (logos, typography, colour systems), print and digital advertising, social media content creation, and web graphic design. The agency serves clients across retail, hospitality, education, and professional services, primarily through referrals and recurring retainer engagements.

Figure 1: Creative Media - Company Logo

### 1.2 Organisational Structure

Figure 2: Organisational Chart of Creative Media

### 1.3 Technical Fact Sheet

Table 1: Technical Fact Sheet: Creative Media

| **Attribute**               | **Detail**                                                                   |
| --------------------------- | ---------------------------------------------------------------------------- |
| **Organisation**            | Creative Media                                                               |
| **Sector**                  | Graphic Design / Creative Services                                           |
| **Location**                | Tunisia                                                                      |
| **Size**                    | Small agency - 1 Manager, 2-5 Designers                                      |
| **Revenue Model**           | Fixed-price project contracts                                                |
| **Current Tooling**         | Informal spreadsheets, verbal agreements, email/WhatsApp for client feedback |
| **Internship** **Duration** | 3 months (12 weeks)                                                          |

### 1.4 Internship Context and Tasks Performed

The student was placed at Creative Media to design and develop an internal project management and analytics system - a tool the agency currently lacks entirely. The internship tasks are directly aligned with the software engineering and BI activities documented in this report, and include:

- Requirements elicitation: structured discussions with the professional supervisor to identify operational pain points, define user roles, and establish system scope.
- UML modelling: development of use case diagrams, class diagrams, and sequence diagrams to formalise system requirements.
- System architecture and data model design: three-tier architecture definition and full entity-relationship design.
- Backend and frontend development (Sprints 1-6): progressive full-stack implementation covering all Django models, JWT authentication, user onboarding, project and task management, time tracking, client feedback, BI dashboards, file management, PDF/Excel report exports, and cloud deployment on Render.
- Iterative review: regular progress presentations to the professional supervisor with incorporation of feedback into subsequent development cycles.

### 1.5 SWOT Analysis

The following SWOT analysis frames Creative Media's current operational position and contextualises the opportunities this project aims to exploit.

Table 2: SWOT Analysis of Creative Media

<div class="joplin-table-wrapper"><table><tbody><tr><th><p><strong>Strengths</strong></p><ul><li>Established and loyal client base</li><li>Strong creative portfolio and expertise</li><li>Flexible team structure adaptable to project needs</li><li>Good market reputation within local sector</li></ul></th><th><p><strong>Weaknesses</strong></p><ul><li>No digital time or project tracking system</li><li>Project profitability is not measured</li><li>Scope changes are managed informally</li><li>Manual reporting is time-consuming and error-prone</li></ul></th></tr><tr><td><p><strong>Opportunities</strong></p><ul><li>Growing demand for data-driven agency management</li><li>BI adoption as a competitive differentiator</li><li>Scalable analytics platform for future growth</li><li>Potential to expand services using performance data</li></ul></td><td><p><strong>Threats</strong></p><ul><li>Competitive pressure from freelance platforms</li><li>Client budget constraints reducing project margins</li><li>Scope creep risk on fixed-price contracts</li><li>Talent retention challenges in the creative sector</li></ul></td></tr></tbody></table></div>

## 2\. Project Context and Problem Statement

### 2.1 The Problem Being Solved

The fundamental problem this system addresses is the absence of financial transparency in creative project management. At Creative Media, when a project concludes, it is often unclear whether it was profitable. A project invoiced at a fixed price may have required significantly more designer hours than estimated, eroding or eliminating the margin. This occurs for two primary reasons:

- Scope creep: clients frequently request revisions or additional elements after the project specification has been agreed upon. Without a formal tracking mechanism, these additions are absorbed into the workload without being reflected in the invoice.
- No real-time budget visibility: because hours are not logged systematically against budgets, the manager cannot intervene when a project is trending over budget before it is too late.

Secondary problems include the inability to identify which clients generate the most revision cycles and are therefore least profitable, and the difficulty of planning designer capacity when utilisation data is unavailable.

### 2.2 Scope Boundaries

The system covers the complete project lifecycle for Managers, Designers, and Clients, including a BI analytics layer and Render cloud deployment. Invoicing, payroll, real-time collaborative editing, and third-party design-tool integrations are out of scope.

## 3\. Development Methodology

### 3.1 Classical vs. Agile Approaches - Comparative Overview

Two broad methodological families exist for software development projects: classical (sequential/waterfall) approaches and Agile iterative approaches. Table 3 summarises the key differences.

Table 3: Classical vs. Agile: Comparative Overview

| **Criterion**           | **Classical (Waterfall)**       | **Agile (Scrum)**             |
| ----------------------- | ------------------------------- | ----------------------------- |
| **Requirements**        | Fixed upfront                   | Evolve iteratively            |
| **Delivery**            | Single release at end           | Working increment each sprint |
| **Feedback**            | End of project                  | After every sprint            |
| **Risk** **Management** | Late defect discovery           | Early detection per cycle     |
| **Documentation**       | Extensive upfront               | Lean, just-in-time            |
| **Adaptation**          | Costly - requires phase restart | Built into sprint cycle       |

### 3.2 Justification for the Chosen Methodology

Agile was selected for three reasons specific to the internship context. First, requirements at Creative Media were partially discovered - the manager knew the pain points but not the precise metrics or workflows that would address them, making iterative elicitation preferable to a complete upfront specification. Second, the twelve-week constraint demanded working software at every milestone for supervisor review; a waterfall approach would have produced nothing demonstrable for the first eight weeks. Third, as a solo developer, the cost of context-switching between large phases (all models, then all APIs, then all UI) is high; vertical slices within each sprint keep cognitive load manageable.

### 3.3 Agile Sprint-Based Approach

The project adopts the Scrum framework, which organises development into fixed-length iterations called sprints, each producing a usable software increment. While Scrum is designed for teams, its core mechanics - sprint planning, backlog management, and retrospective review - adapt naturally to a supervised solo project. Six two-week sprints structure the work, each with a clearly defined goal and deliverable. This produces working, demonstrable software at the end of every sprint - enabling regular supervisor review - and limits the scope of each development cycle, reducing the risk of losing context across a large codebase.

Figure 3: Agile Sprint Cycle

### 3.4 Vertical Slice Development

Within each sprint, features are developed as vertical slices: each user story is implemented end-to-end - database model → serialiser → API view → React component - before the next story begins. This contrasts with a horizontal approach where all models come first, then all APIs, then all UI; the horizontal approach produces nothing testable for extended periods and makes early requirement validation impossible.

Figure 4: Per-Sprint Development Workflow

### 3.5 Modelling Languages and Tools

This report uses the Unified Modelling Language (UML) for all structural and behavioural diagrams. UML was chosen because it is the standard notation for object-oriented software design and provides a shared vocabulary between the academic context and professional practice. The following UML diagram types are used throughout the report: Use Case Diagrams (system scope and actor interactions), Class Diagrams (static domain model), Sequence Diagrams (dynamic interaction flows), and Deployment Diagrams (physical infrastructure topology). All UML diagrams were produced using draw.io.

## 4\. Chapter Conclusion

Creative Media's absence of digital project tracking defines a well-bounded business problem, and the Agile sprint methodology provides the structure needed to deliver a full-stack solution within twelve weeks. Chapter 2 establishes the theoretical and technical framework that grounds the design decisions made throughout implementation.

# Chapter 2 - Literature Review and Technical Framework

## 1\. Introduction

This chapter reviews BI practice in service industries, evaluates existing tools, justifies the technology stack, and states the working hypotheses evaluated in the General Conclusion.

## 2\. Business Intelligence in Service Industries

### 2.1 Definition and Role of Business Intelligence

Business Intelligence (BI) refers to the set of technologies, processes, and practices that transform raw operational data into meaningful, actionable information for decision-makers. In a service industry context - where revenue is generated by selling time and expertise rather than tangible goods - BI plays a particularly important role in understanding the relationship between inputs (designer hours) and outputs (project value delivered to clients).

This system covers both layers: operational views (time logs per project, feedback per task) and analytical metrics (EHR, budget variance, scope creep index) that let a manager understand not just what happened but why.

### 2.2 Key Performance Indicators for Creative Agencies

Based on the pain points identified at Creative Media, six metrics were selected as the core analytical layer. The Effective Hourly Rate is the central profitability indicator: it expresses how much monetary value the agency generates per designer hour logged. A high EHR indicates an efficiently managed project; a low EHR indicates underpricing or overconsumption of hours. The Scope Creep Index complements this by revealing whether a low EHR is driven by poor estimation or uncontrolled scope expansion.

Table 4: Analytical Metrics Implemented in the System

| **Metric**                      | **Formula**                                             | **Business Meaning**                                                 |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| **Effective Hourly Rate (EHR)** | budget_amount ÷ SUM(hours_spent)                        | Revenue earned per hour of designer time invested                    |
| **Budget Utilisation %**        | SUM(hours_spent) ÷ budget_hours × 100                   | Proportion of the allocated hour budget consumed to date             |
| **Estimation Variance %**       | (SUM(actual) − SUM(estimated)) ÷ SUM(estimated) × 100   | Accuracy of the original task hour estimates                         |
| **Scope Creep Index**           | COUNT(is_unplanned=True) ÷ COUNT(\*) × 100              | Percentage of tasks added after project kick-off                     |
| **Designer Utilisation %**      | SUM(hours this week) ÷ available_hours_per_week × 100   | Proportion of contracted capacity actually billed                    |
| **Revision-to-Approval Ratio**  | COUNT(category='Revision') ÷ COUNT(category='Approval') | Client feedback quality; high values signal rework-intensive clients |

## 3\. Project Management Information Systems

### 3.1 Characteristics of an Effective PMIS

A Project Management Information System (PMIS) is a software system that supports the planning, execution, monitoring, and control of projects. For a creative agency, an effective PMIS must balance the structured task tracking of traditional project management with the flexibility required in creative workflows, where scope is often iterative and client-driven.

Key characteristics of an effective PMIS in this context include: role-differentiated access (so that clients see only their own projects, designers see only their assignments, and managers have complete visibility); real-time status updates (task status, hours logged against budget); and direct integration between task management and financial tracking (so that logged hours translate immediately into budget consumption data without manual consolidation).

### 3.2 Analysis of Existing Tools

Table 5 compares five commercial tools against the agency's requirements.

Table 5: Comparison of Existing Project Management Tools

| **Tool**            | **Strengths**                                        | **Gaps for Creative Media**                                                                                    |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Harvest**         | Strong time tracking and invoicing; team reporting   | No custom scope creep tracking; requires integration with separate PM tools; no client profitability analytics |
| **Toggl** **Track** | Excellent timer-based tracking; good team dashboards | No project budget management; no client-facing portal; no BI metrics                                           |
| **FunctionFox**     | Designed for creative agencies; project costing      | Proprietary SaaS with per-seat pricing; no customisable analytical layer; cannot adapt KPIs to agency needs    |
| **Monday.com**      | Powerful general-purpose PM; highly configurable     | No financial analytics; no EHR or scope creep concept; requires significant setup for basic time tracking      |
| **Asana**           | Mature task management; good workflow automation     | No time tracking or budget tracking natively; no analytical layer; no client portal                            |

The gap common to all these tools is the absence of customisable, agency-specific profitability analytics integrated directly into the project management workflow. None expose a Scope Creep Index, an EHR per client, or a client profitability ranking weighted by revision frequency - the three metrics most relevant to Creative Media's decision-making.

## 4\. Technical Framework and Technology Justification

### 4.1 System Architecture Pattern

The system follows a three-tier client-server architecture: a React single-page application communicates exclusively with a Django REST API via JSON over HTTPS; the API communicates with a PostgreSQL database. This separation provides several advantages: the frontend and backend can be developed, tested, and deployed independently; the API can be consumed by future clients (mobile apps, integrations) without changes; and authentication and authorisation logic is enforced centrally at the API boundary rather than on the client side, preventing data leakage through URL manipulation.

Figure 5: Three-Tier System Architecture

### 4.2 Technology Stack Justification

Table 6: Technology Stack with Justifications

| **Layer**             | **Technology**        | **Justification**                                                                                                                                                   |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**           | Django 5 + DRF 3.15   | Mature Python framework. ORM enables complex multi-table aggregate queries. DRF provides battle-tested serialisation and viewset patterns with minimal boilerplate. |
| **Authentication**    | Simple JWT library    | Stateless JWT tokens. No server-side session storage. Role embedded in payload enables role-based routing without secondary API call.                               |
| **Database**          | PostgreSQL 16         | Advanced aggregation capabilities (window functions, conditional COUNT, multi-level joins) required for the BI layer. ACID compliance critical for financial data.  |
| **Frontend**          | React 18 + TypeScript | Component-based SPA. TypeScript enforces consistency between API data shapes and component props, catching integration errors at compile time.                      |
| **Build** **tool**    | Vite                  | Fast dev server with HMR. Significantly faster than CRA for TypeScript projects; production build is optimised and small.                                           |
| **Data** **fetching** | TanStack React Query  | Declarative server-state management with automatic cache invalidation on mutation - eliminates significant boilerplate vs. plain Redux.                             |
| **Styling**           | Tailwind CSS          | Utility-first CSS with consistent design tokens. Avoids style conflicts in component-heavy UIs.                                                                     |
| **Charts**            | Recharts              | React-native charting library built on D3. Declarative and composable - well-suited for BI dashboards with dynamic data.                                            |
| **Forms**             | React Hook Form + Zod | Performant uncontrolled forms with schema-based validation. Zod schemas mirror backend serialiser validation.                                                       |
| **AI Inference**      | Groq API              | Provides low-latency hosted LLM inference. The llama-3.3-70b-versatile model offers strong contextual reasoning.                                                    |
| **PDF** **export**    | ReportLab             | Standard Python library for programmatic PDF generation, widely used in Django projects.                                                                            |
| **Excel** **export**  | openpyxl              | Python library for .xlsx generation with formatting and multi-sheet support.                                                                                        |
| **Deployment**        | Render                | Managed Web Service + Static Site + PostgreSQL. Simple environment variable management and automatic deploys from Git.                                              |

### 4.3 Authentication Strategy

The system uses JSON Web Token (JWT) authentication implemented via the Simple JWT library. JWTs are stateless: the server does not maintain a session store, and authorisation decisions are made by decoding the token on each request. The payload includes the user's ID, email, and role, enabling role-based filtering without an additional database query per request.

A short-lived access token (60 minutes) paired with a longer-lived refresh token (7 days) is used. The React frontend's Axios interceptor automatically detects 401 responses, requests a new access token using the refresh token, and retries the failed request - making token expiry invisible to the user in normal usage.

New user onboarding uses a separate invitation token mechanism: a UUID token with a 48-hour expiry is generated and emailed to new users by the Manager. Users must activate their account by setting a password through this token before JWT login becomes available. This prevents self-registration and ensures only Manager-approved users access the system.

## 5\. Synthesis and Working Hypotheses

The literature review and comparative analysis confirm that the system being built fills a genuine gap in available tooling for small-to-medium creative agencies. The following working hypotheses guide the design and implementation. Each is evaluated against the completed system in the General Conclusion.

**H1:** Systematic time logging against project tasks, when integrated with budget data, will enable managers to identify unprofitable projects in real time rather than retrospectively.

**H2:** A formal Scope Creep Index will make the volume and frequency of unplanned work visible, enabling the agency to adjust contract terms or pricing models for repeat clients.

**H3:** Role-scoped access will ensure that client-facing views do not expose sensitive financial data (EHR, profitability rankings) while still providing clients with meaningful project status visibility.

**H4:** Server-side computation of all metrics via PostgreSQL aggregations will ensure dashboards reflect live data without requiring a separate data warehouse or ETL process.

## 6\. Chapter Conclusion

No existing tool combines role-scoped project management, designer time logging, structured client feedback, and customisable agency-specific profitability analytics in a single platform - confirming the need for a bespoke solution. The technology stack selected provides the capabilities required to build both the operational management layer and the analytical layer within the project constraint. Chapter 3 translates this into concrete requirements and a global system design.

# Chapter 3 - Sprint 0: Requirements Specification and System Design

## 1\. Introduction

This chapter documents Sprint 0 in full. It begins with a structured requirements capture, then presents the Scrum planning artefacts (product backlog, use case diagrams, Gantt chart), the interface wireframes, the hardware and software development environment, the system architecture, and the global data model.

## 2\. Requirements Capture

### 2.1 Identification of Actors

Functional requirements were elicited through structured discussions with the professional supervisor and organised by user role. The system defines four actors: three internal users interacting directly with the platform, and one external technical actor.

Table 7: Identified Actors and Their Roles

| **Actor**        | **Type** | **Role Description**                                                                                                                                                                                                                                                               |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manager**      | Internal | The primary platform administrator. Creates and manages user accounts, projects, tasks, and designers. Has full visibility of all projects, analytics dashboards, and profitability reports. The only role authorised to generate and export PDF/Excel reports.                    |
| **Designer**     | Internal | A team member assigned to one or more projects by the Manager. Views only their assigned projects and tasks, logs time against tasks, updates task status, uploads deliverable files, and views and responds to client feedback.                                                   |
| **Client**       | External | A customer of the agency who is associated with one or more projects. Authenticated access limited to their own projects. Views project status, uploads reference materials and brand guidelines, submits feedback on deliverables, and participates in the project message board. |
| **Email System** | External | An external actor representing the SMTP or transactional email service. Triggered automatically by the system when a Manager creates a new user account. Responsible for delivering invitation emails containing secure, time-limited password-creation links.                     |

### 2.2 Functional Requirements

Table 8 presents 21 functional requirements derived directly from the use case diagram and structured discussions with the professional supervisor. They are organised by system module and cover all three internal roles as well as the Email System external actor.

Table 8: Functional Requirements by Role

| **ID**    | **Module**         | **Description**                                                                                                                                  |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **FR-01** | Authentication     | The system shall allow all users (Manager, Designer, Client) to log in using an email address and password.                                      |
| **FR-02** | Authentication     | The system shall provide a 'Create Password' flow triggered by an email invitation link sent by the Email System.                                |
| **FR-03** | Authentication     | The system shall enforce session management and secure logout for all users.                                                                     |
| **FR-04** | User Management    | Managers shall be able to create, view, update, and deactivate/delete user accounts.                                                             |
| **FR-05** | User Management    | The system shall automatically trigger a 'Send Email Invitation' notification via the Email System when a new user account is created.           |
| **FR-06** | Project Management | Managers shall be able to create, view, edit, archive, and delete projects.                                                                      |
| **FR-07** | Project Management | Managers shall be able to create tasks within a project and assign one or more Designers to the project.                                         |
| **FR-08** | Project Management | Designers shall be able to view only the projects and tasks assigned to them.                                                                    |
| **FR-09** | Task Tracking      | Designers shall be able to log time spent on a specific task with a description.                                                                 |
| **FR-10** | Task Tracking      | Designers shall be able to update task status (Todo, In Progress, Completed) independently at any time.                                          |
| **FR-11** | Deliverables       | Designers shall be able to upload deliverable files to a project.                                                                                |
| **FR-12** | Feedback           | Managers and Designers shall be able to view feedback submitted by Clients on deliverables.                                                      |
| **FR-13** | Feedback           | Managers and Designers shall be able to reply to Client feedback from within the platform.                                                       |
| **FR-14** | Messaging          | Managers, Designers, and Clients shall be able to send direct messages to other users on the platform within a project context.                  |
| **FR-15** | Client Portal      | Clients shall be able to view the current status of their project(s) in real time after authenticating.                                          |
| **FR-16** | Client Portal      | Clients shall be able to upload reference materials (images, documents) to their project.                                                        |
| **FR-17** | Client Portal      | Clients shall be able to submit written feedback on deliverables.                                                                                |
| **FR-18** | Reporting          | Managers shall be able to view dashboards showing project profitability KPIs (EHR, budget utilisation, scope creep index, designer utilisation). |
| **FR-19** | Reporting          | Managers shall be able to generate detailed profitability and performance reports.                                                               |
| **FR-20** | Reporting          | Managers shall be able to export generated reports in standard formats (PDF, Excel).                                                             |
| **FR-21** | Email System       | The Email System shall send email invitations when triggered by user account creation.                                                           |

### 2.3 Non-Functional Requirements

Table 9 lists 12 non-functional requirements which govern the quality attributes of the system. They are organised by category and constrain the technical implementation across all six sprints.

Table : Non-Functional Requirements

| **ID**     | **Category**    | **Description**                                                                                                                                                                                                     |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-01** | Security        | All communications between client and server shall use HTTPS/TLS 1.2+.                                                                                                                                              |
| **NFR-02** | Security        | Passwords shall be stored using a strong one-way hashing algorithm with salting.                                                                                                                                    |
| **NFR-03** | Security        | The system shall implement role-based access control (RBAC): Manager, Designer, and Client roles with distinct permissions enforced at every API endpoint.                                                          |
| **NFR-04** | Security        | JWT access tokens shall expire after 1 hour. The Axios HTTP client shall silently refresh expired tokens and retry the original request without logging the user out. Refresh tokens shall be rotated on every use. |
| **NFR-05** | Performance     | Dashboard and report pages shall load within 3 seconds under normal load (≤ 100 concurrent users).                                                                                                                  |
| **NFR-06** | Performance     | File uploads (deliverables, reference materials) shall support files up to 50 MB.                                                                                                                                   |
| **NFR-07** | Scalability     | The system architecture shall support horizontal scaling to accommodate growth in users and projects.                                                                                                               |
| **NFR-08** | Usability       | The UI shall be responsive and usable on desktop browsers (Chrome, Firefox, Edge).                                                                                                                                  |
| **NFR-09** | Usability       | Error messages shall be human-readable and provide actionable guidance.                                                                                                                                             |
| **NFR-10** | Reliability     | All computed metrics (EHR, budget utilisation, scope creep index) shall be derived from live database aggregations and shall never be persisted as model fields, ensuring results are always current.               |
| **NFR-11** | Maintainability | Source code shall follow consistent style conventions and include inline documentation for all modules.                                                                                                             |
| **NFR-12** | Integration     | Email delivery shall be handled through a configurable external SMTP provider or email API.                                                                                                                         |

### 2.4 Roles and Permissions Matrix

Table : User Roles and Permissions Matrix

| **Capability**                  | **Manager** | **Designer** | **Client** |
| ------------------------------- | ----------- | ------------ | ---------- |
| All BI dashboards and analytics | ✓           | ✗            | ✗          |
| Create / edit / delete projects | ✓           | ✗            | ✗          |
| Assign designers to projects    | ✓           | ✗            | ✗          |
| View all projects               | ✓           | ✗            | ✗          |
| View assigned projects          | ✓           | ✓            | ✗          |
| Log time and update task status | ✓           | ✓            | ✗          |
| Upload deliverables             | ✓           | ✓            | ✗          |
| View client feedback            | ✓           | ✓            | ✗          |
| View own projects               | ✓           | ✗            | ✓          |
| Submit feedback and revisions   | ✓           | ✗            | ✓          |
| Upload reference materials      | ✓           | ✗            | ✓          |
| Send and receive messages       | ✓           | ✓            | ✓          |
| Generate and export reports     | ✓           | ✗            | ✗          |
| Create user accounts            | ✓           | ✗            | ✗          |
| AI task hour estimation         | ✓           | ✗            | ✗          |
| AI project health narrative     | ✓           | ✗            | ✗          |

## 3\. Global Use Case Diagram

Figure 6 presents the global use case diagram capturing all three roles and their interactions with the system.

Figure 6: Use Case Diagram - Global View

Figure 7: Use Case Diagram - Manager Role

Figure 8: Use Case Diagram - Designer Role

Figure 9: Use Case Diagram - Client Role

## 4\. Scrum Project Planning

### 4.1 Scrum Roles and Responsibilities

Product Owner: **Mr. Jawhar** **Letaief** defines and prioritizes the product backlog and business requirements.

Scrum Master: **Mr. Trigui** **Omar** manages the sprint cycle, facilitates ceremonies, and resolves impediments.

Developer: **Mahdi Mlika** implements all technical deliverables across the six sprints.

### 4.2 Product Backlog

The Product Backlog contains all 21 user stories for the project, organised by Epic and priority. Estimation is expressed in person-days. Stories are ordered by priority (Must Have → Should Have → Could Have) and dependency.

Table : Global Product Backlog

| **ID**    | **Epic**              | **User Story**                                                                                                                                                      | **Priority** | **Complexity** | **Est. (days)** |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | --------------- |
| **US-01** | Authentication        | As a Manager/Designer/Client, I want to authenticate so that I can access the platform.                                                                             | 1            | Medium         | 3               |
| **US-02** | Authentication        | As a Designer/Client, I want to create my password so that I can secure my account after receiving an invitation.                                                   | 1            | Low            | 2               |
| **US-03** | User Management       | As a Manager, I want to create user accounts so that new members can access the platform.                                                                           | 1            | Medium         | 4               |
| **US-04** | User Management       | As a Manager, I want to manage users so that I can view, edit, and deactivate accounts.                                                                             | 1            | Medium         | 5               |
| **US-05** | User Management       | As a Manager, I want the system to send an email invitation when a user account is created.                                                                         | 1            | Low            | 2               |
| **US-06** | Project Management    | As a Manager, I want to create a project with budget, deadline, and category, and edit or delete it at any time.                                                    | 1            | High           | 5               |
| **US-07** | Project Management    | As a Manager, I want to list all projects, view a detail page, assign designers, and filter results by status.                                                      | 1            | High           | 6               |
| **US-08** | Project Management    | As a Manager, I want to create, edit, and delete tasks linked to a project, with estimated hours, subtask support, and an unplanned-task flag to track scope creep. | 1            | Medium         | 5               |
| **US-09** | Project Management    | As a Designer, I want to see only the projects I am assigned to, with a budget progress bar showing hours used versus budget.                                       | 1            | Low            | 3               |
| **US-10** | Task & Deliverables   | As a Designer, I want to log time on a task so that my effort is accurately tracked against the project budget.                                                     | 2            | Medium         | 4               |
| **US-11** | Task & Deliverables   | As a Designer, I want to update the task status so that the team knows the current progress without having to ask.                                                  | 2            | Low            | 2               |
| **US-12** | Task & Deliverables   | As a Designer, I want to upload deliverables so that clients and managers can review the completed outputs directly on the platform.                                | 2            | Medium         | 4               |
| **US-13** | Feedback & Messaging  | As a Manager/Designer, I want to view client feedback so that I can understand and act on client comments on my deliverables.                                       | 2            | Low            | 3               |
| **US-14** | Feedback & Messaging  | As a Manager/Designer, I want to reply to feedback so that I can communicate directly with the client.                                                              | 3            | Medium         | 3               |
| **US-15** | Feedback & Messaging  | As a Manager/Designer/Client, I want to send messages so that I can communicate with other platform users.                                                          | 2            | High           | 6               |
| **US-16** | Client Portal         | As a Client, I want to view the project status so that I can monitor progress without contacting the team.                                                          | 2            | Medium         | 4               |
| **US-17** | Client Portal         | As a Client, I want to upload reference materials so that the design team has the context they need.                                                                | 3            | Medium         | 3               |
| **US-18** | Client Portal         | As a Client, I want to submit feedback so that I can share my opinions on the delivered work.                                                                       | 2            | Medium         | 4               |
| **US-19** | Reporting & Analytics | As a Manager, I want to view dashboards so that I can monitor project profitability at a glance.                                                                    | 1            | High           | 8               |
| **US-20** | Reporting & Analytics | As a Manager, I want to generate reports so that I can analyse detailed performance and financial data.                                                             | 1            | High           | 7               |
| **US-21** | Reporting & Analytics | As a Manager, I want to export reports so that I can share or archive results outside the platform.                                                                 | 3            | Medium         | 3               |

### 4.3 Sprint Planning Overview

The 21 user stories are distributed across six 2-week sprints, ordered by priority and inter-sprint dependency. Table 12 provides a high-level view of each sprint's goal, included stories, and estimated effort. Detailed sprint checklists are presented in Chapters 4 through 9.

_Table 12: Sprint Planning Overview_

| **Sprint**                                  | **Sprint Goal**                                                                                                                                                | **User Stories**                  | **Duration** | **Est. (days)** |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------ | --------------- |
| **Sprint 1 - Foundation & Auth**            | Authentication, password creation, and user management are fully operational.                                                                                  | US-01, US-02, US-03, US-04, US-05 | 2 weeks      | **16**          |
| **Sprint 2 - Project & Task Management**    | Managers can create and manage projects and tasks; Designers can view their assigned projects.                                                                 | US-06, US-07, US-08, US-09        | 2 weeks      | **19**          |
| **Sprint 3 - Time Tracking & Deliverables** | Designers can log time, update task status, upload deliverables, and view client feedback.                                                                     | US-10, US-11, US-12, US-13        | 2 weeks      | **13**          |
| **Sprint 4 - Client Portal & Feedback**     | Clients can view project status, upload reference materials, and submit feedback; Designers and Managers can view, respond to, and resolve all feedback items. | US-14, US-15, US-16, US-17, US-18 | 2 weeks      | **20**          |
| **Sprint 5 - BI Dashboards**                | Manager BI dashboards are operational with KPI cards, budget vs. actual charts, EHR, client profitability, designer utilisation, and scope creep index.        | US-19                             | 2 weeks      | **8**           |
| **Sprint 6 - Reports, Export & Deployment** | Report generation with filters, PDF and Excel export, automated tests, and Render deployment are complete.                                                     | US-20, US-21                      | 2 weeks      | **10**          |

### 4.4 Project Gantt Chart

Figure 10 provides a temporal view of the six-sprint development timeline. Each sprint block covers two weeks.

Figure 10: Gantt Chart - Six-Sprint Development Timeline

## 5\. Development Environment

### 5.1 Hardware Environment

Table : Hardware Development Environment

| **Component**           | **Specification**                            |
| ----------------------- | -------------------------------------------- |
| **Development Machine** | Personal laptop - Windows 11 Pro             |
| **System Type**         | 64-bit Operating System, x64-Based Processor |
| **Processor**           | AMD Ryzen 7 7735HS with Radeon Graphics      |
| **RAM**                 | 16.0 GB                                      |
| **Storage**             | 512 GB SSD                                   |
| **Browser**             | Mozilla Firefox                              |

### 5.2 Software and Development Tools

Table 14: Software and Development Environment

| **Category**           | **Tool / Version**                 | **Purpose**                         |
| ---------------------- | ---------------------------------- | ----------------------------------- |
| **Backend Runtime**    | Python 3.12                        | Server-side language                |
| **Web Framework**      | Django 5.0                         | Backend framework and ORM           |
| **API Layer**          | Django REST Framework 3.15         | REST API serialisation and views    |
| **Database**           | PostgreSQL 16                      | Primary data store                  |
| **Frontend Runtime**   | Node.js 20 (npm)                   | Frontend package management         |
| **Build Tool**         | Vite 5                             | Frontend dev server and build       |
| **Frontend Framework** | React 18 + TypeScript              | SPA and type-safe components        |
| **IDE**                | Visual Studio Code                 | Code editing, extensions, debugging |
| **API Testing**        | Thunder Client (VS Code extension) | Manual endpoint testing             |
| **Diagramming**        | draw.io                            | All UML diagrams                    |
| **Scrum**              | Trello                             | Scrum boards                        |
| **Version Control**    | Git + GitHub                       | Source code management              |
| **Virtualenv**         | Python venv                        | Python dependency isolation         |

## 6\. System Architecture

### 6.1 Physical Architecture

The system is deployed on Render across three components: a Static Site serving the compiled React SPA (CDN-backed), a Web Service running the Django REST API (containerised), and a managed PostgreSQL instance isolated from the application tier. All communication between the SPA and the API occurs over HTTPS; the API communicates with the database over a private internal network not exposed to the public internet.

### 6.2 Logical / Software Architecture

The Django backend is organised into eight domain apps: users, projects, tasks, timelog, feedback, messages, files, and analytics. The analytics app is architecturally distinct - it contains no models, only views executing aggregate queries across the other apps. Keeping the analytics app free of models prevents aggregate query logic from coupling with domain models.

Figure 11: Backend Directory Structure

The React frontend mirrors this structure with separate api/, hooks/, types/, pages/, and components/ directories. Each resource has its own typed API functions, React Query hooks, and TypeScript interfaces, ensuring that the type contract between backend and frontend is maintained explicitly.

Figure 12: Frontend Directory Structure

### 6.3 Architecture Rationale

The choice of a strict three-tier separation with all business logic in the API layer (rather than partly in the frontend) is a security decision as much as a structural one. By enforcing RBAC at the API boundary - via both permission classes and query-level filtering - the system ensures that a client who manipulates URL parameters or intercepts API responses cannot access other clients' data. The frontend's role is presentation only.

### 6.4 Deployment Diagram

Figure 13: Deployment Diagram

## 7\. Global Data Model

### 7.1 Global Class Diagram

The class diagram models all eleven domain objects and their relationships. The central entity is Project, which aggregates Tasks (with optional subtask nesting via a self-referential foreign key), time-logged by Designers through TimeLogs, and feedback submitted by Clients. The User entity drives authentication; role-differentiated profiles (Designer and Client) are attached via one-to-one relationships.

Figure : Class Diagram

### 7.2 Entity-Relationship Diagram

The ERD presents the physical database schema derived from the class diagram. Key constraints are visible: the deletion-protected link from Project to Client, the compound uniqueness constraint on ProjectAssignment, and the self-referential foreign key on Task.

Figure 15: Entity-Relationship Diagram

### 7.3 Relational Schema

The relational schema below presents all eleven entities with their attributes. Foreign keys are denoted with the # symbol.

**User** (user_id, email, full_name, password, role, is_active, is_staff, created_at).

**Designer** (designer_id, #user_id, hourly_rate, specialization, available_hours_per_week).

**Client** (client_id, #user_id, phone, industry).

**InvitationToken** (token_id, #user_id, token, expires_at, is_used).

**Project** (project_id, #client_id, project_name, description, budget_hours, budget_amount, deadline, status, category, created_at, updated_at).

**ProjectAssignment** (assignment_id, #project_id, #designer_id, assigned_at).

**Task** (task_id, #project_id, #parent_task_id, task_name, description, estimated_hours, status, is_unplanned, created_at).

**TimeLog** (log_id, #task_id, #designer_id, hours_spent, description, created_at).

**Feedback** (feedback_id, #project_id, category, content_text, status, submitted_at, resolved_at).

**Message** (message_id, #project_id, #sender_id, content_text, is_read, created_at).

**FileUpload** (file_id, #project_id, #uploaded_by, file_type, file_name, file_path, file_size, uploaded_at).

## 8\. Chapter Conclusion

Sprint 0 produced the complete artefact set required before development begins: a prioritised backlog of 21 user stories, a three-tier architecture with deployment diagram, and a global data model covering all eleven entities. Chapter 4 documents Sprint 1, in which the Django and React scaffolds are built, all models are migrated, and the full authentication and onboarding flow is delivered.

# Chapter 4 - Sprint 1: Foundation and Authentication

## 1\. Introduction

Sprint 1 covers five user stories (US-01 through US-05), estimated at 16 person-days. The goal is to have authentication, password creation, and user management fully working by the end of the sprint - nothing else in the system can be tested without them.

## 2\. Sprint 1 Backlog

Table 15 lists all user stories included in Sprint 1, their module, complexity, and estimated effort in person-days.

Table : Sprint 1 Backlog

| **ID**    | **Epic**        | **User Story**                                                                                                    | **Priority** | **Complexity** | **Est.** |
| --------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | -------- |
| **US-01** | Authentication  | As a Manager/Designer/Client, I want to authenticate so that I can access the platform.                           | 1            | Medium         | 3        |
| **US-02** | Authentication  | As a Designer/Client, I want to create my password so that I can secure my account after receiving an invitation. | 1            | Low            | 2        |
| **US-03** | User Management | As a Manager, I want to create user accounts so that new members can access the platform.                         | 1            | Medium         | 4        |
| **US-04** | User Management | As a Manager, I want to manage users so that I can view, edit, and deactivate accounts.                           | 1            | Medium         | 5        |
| **US-05** | User Management | As a Manager, I want the system to send an email invitation when a user account is created.                       | 1            | Low            | 2        |

## 3\. Functional Specification

### 3.1 Sprint 1 Use Case Diagram

Figure 16 presents the use cases addressed in Sprint 1. All three internal actors interact with the Authenticate use case; the Manager additionally triggers the Send Email Invitation use case through the Create User Account action, which involves the external Email System actor.

Figure 16: Sprint 1 Use Case Diagram

### 3.2 Textual Description of Use Cases

#### 3.2.1 Use Case: Authenticate

Table 16: Textual Description of Use Case: Authenticate

| **Use Case: Authenticate** | |
| --- | | --- |
| **Actor(s)** | Manager, Designer, Client |
| **Description** | Allows any registered user to sign in to the platform using their email address and password, and to access their role-specific workspace. |
| **Pre-condition(s)** | The user account exists and has been activated. |
| **Post-condition(s)** | The user is signed in and redirected to their personal dashboard (Manager, Designer, or Client view depending on their role). |
| **Base Scenario** | **1\.** The user opens the login page.<br><br>**2\.** The user enters their email address and password, then clicks Sign In.<br><br>**3\.** The system verifies the credentials.<br><br>**4\.** The system identifies the user's role.<br><br>**5\.** The user is redirected to their role-specific dashboard. |
| **Other Scenarios** | **3.a Wrong email or password:**<br><br>**1\.** The system displays the message "Invalid email or password."<br><br>**3.b Deactivated account:**<br><br>**1\.** The system rejects the sign-in attempt and displays an appropriate message. |

#### 3.2.2 Use Case: Create Password

Table 17: Textual Description of Use Case: Create Password

| **Use Case: Create Password** | |
| --- | | --- |
| **Actor(s)** | Manager, Designer, Client |
| **Description** | Allows a newly invited user to set their own password by clicking the activation link received by email. |
| **Pre-condition(s)** | The Manager has created the user account.<br><br>The user has received the invitation email containing a unique activation link.<br><br>The link has not yet been used and has not expired. |
| **Post-condition(s)** | The account is activated and the user can sign in. |
| **Base Scenario** | **1\.** The user clicks the activation link in the invitation email.<br><br>**2\.** The system displays a password creation form.<br><br>**3\.** The user enters and confirms their new password.<br><br>**4\.** The system validates the password and activates the account.<br><br>**5\.** The user is directed to the login page with a confirmation message. |
| **Other Scenarios** | **4.a Activation link has expired (48-hour limit reached):**<br><br>**1.** The system displays the message "This invitation link has expired."<br><br>**2.** The Manager must send a new invitation.<br><br>**4.b Activation link has already been used:**<br><br>**1.** The system displays the message "This link has already been used."<br><br>**2.** The user is directed to the login page. |

#### 3.2.3 Use Case: Create User Account

Table 18: Textual Description of Use Case: Create User Account

| **Use Case: Create User Account** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to register a new user on the platform by providing their name, email address, and role. The system automatically sends the new user an invitation email with an activation link. |
| **Pre-condition(s)** | The Manager is signed in.<br><br>The email address provided does not already belong to an existing account. |
| **Post-condition(s)** | The user account is created in an inactive state.<br><br>An invitation email has been sent to the new user.<br><br>The account becomes active once the user sets their password. |
| **Base Scenario** | **1\.** The Manager opens the Django Admin Panel.<br><br>**2\.** The Manager fills in the new user's full name, email address, and role (Designer or Client).<br><br>**3\.** The Manager confirms the creation.<br><br>**4\.** The system creates the account and generates a secure, time-limited activation link.<br><br>**5\.** The system automatically sends an invitation email to the new user containing the activation link. |
| **Other Scenarios** | **3.a Email address already in use:**<br><br>**1\.** The system displays an error message and the account is not created. |

#### 3.2.4 Use Case: Manage Users

Table 19: Textual Description of Use Case: Manage Users

| **Use Case: Manage Users** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to view the list of all platform users, edit their details, and deactivate accounts when necessary. |
| **Pre-condition(s)** | The Manager is signed in. |
| **Post-condition(s)** | The selected user's account reflects the changes made.<br><br>A deactivated user can no longer sign in to the platform. |
| **Base Scenario** | **1\.** The Manager opens the user management section.<br><br>**2\.** The system displays the full list of users with their role and account status.<br><br>**3\.** The Manager selects a user to view or edit their details.<br><br>**4\.** The Manager updates the relevant information (name, role, or account status) and saves the changes. |

## 4\. Conception

### 4.1 Sequence Diagrams

Figure 17 and Figure 18 model the primary dynamic flows implemented in Sprint 1.

#### 4.1.1 Sequence Diagram: Authenticate

The authentication sequence models the JWT login flow and the Axios interceptor token-refresh path.

Figure 17: Sequence Diagram - Authenticate

#### 4.1.2 Sequence Diagram: User Onboarding - Create & Activate Account

This sequence covers the invitation-based onboarding flow: account creation, token generation, email dispatch, and activation.

Figure 18: Sequence Diagram - User Onboarding

### 4.2 Class Diagram

Figure 19 presents the four domain models introduced in Sprint 1. User is the central auth model. Designer and Client each extend it via a one-to-one link, separating role-specific fields from auth data.

Figure 19: Sprint 1 Class Diagram

## 5\. Implementation

### 5.1 Data Layer: Custom User Model and Profiles

The user model extends Django's base abstract user class rather than the default user model for three reasons. First, email is used as the login identifier instead of a username, requiring a custom user manager that overrides the default user-creation logic. Second, the role field must be a constrained enumeration with exactly three choices: Manager, Designer, and Client. Third, the account's active status defaults to inactive, preventing uninvited users from signing in before completing the activation flow.

Two profile models, Designer and Client, are linked to the user via a one-to-one relationship. Profile records are created via an automatic signal fired whenever a new user is saved, branching on the assigned role. The InvitationToken model stores a UUID token alongside a foreign key to the associated user, an expiry timestamp set to 48 hours after creation, and a usage flag. Tokens are invalidated on use, preventing replay attacks.

### 5.2 Authentication API Endpoints

JWT authentication is implemented using the Simple JWT library. The access token lifespan was set to 60 minutes; the refresh token to 7 days with rotation enabled. The token payload was extended to include the user's role, so that the React frontend can perform role-based routing without a secondary API call after login.

### 5.3 Invitation Token and Activation Endpoint

The account activation endpoint receives a token string and a new password. It performs three validation checks in sequence: the token record must exist, the token must not have been previously used, and it must not have expired. If all pass, the password is updated, the account is activated, and the token is marked as used.

### 5.4 Permission Classes

Four permission classes enforce role checks: one for each individual role (Manager, Designer, Client) and a combined class permitting both Manager and Designer access. Each verifies that the request originates from an authenticated user and checks their assigned role. Creation and deletion are restricted to managers; updates to managers and designers; listing and retrieval to any authenticated user.

### 5.5 React Frontend: Login, AuthContext, and ProtectedRoute

The authentication context stores the decoded token data (user ID, email, role) and exposes it to all components via a custom authentication hook. The route guard component wraps role-sensitive pages and redirects unauthenticated or unauthorised users to the login page. The Axios instance includes a request interceptor that attaches the authentication token and a response interceptor that silently refreshes expired tokens and retries failed requests.

## 6\. Interface Realisation

Figure 20-Figure 28 present the Sprint 1 deliverables.

### 6.1 Django Admin Panel & User Management

Figure 20 shows the Django administration panel used by the Manager. Figure 21 illustrates the account creation form, and Figure 22 shows the resulting user management list with role and status visible per entry.

Figure : Django Admin Panel

Figure : Account Creation

Figure 22: User Management

### 6.2 Login Interface

Figure 23 shows the login interface - a centred card with email and password fields. On success, the user is redirected to their role-specific dashboard; invalid credentials display an inline error without revealing account existence.

Figure 23: Login Interface

### 6.3 Account Activation Interface

Figure 24 shows the invitation email received by a newly created user. Figure 25 shows the password creation form reached via the activation link.

Figure : Activation Email

Figure 25: Account Activation Interface

### 6.4 Role-Based Dashboard Stubs

Figure 26, Figure 27, and Figure 28 show the three role-specific dashboard stubs - Manager, Designer, and Client respectively.

Figure : Manager Dashboard

Figure : Designer Dashboard

Figure 28: Client Dashboard

## 7\. Testing

Figure 29 shows a representative sample of the Thunder Client test results. Each row corresponds to one scenario in Table 20.

Figure 29: Sprint 1 API Testing

Table 20: Sprint 1 Test Results

| **Endpoint / Action**    | **Method** | **Scenario**                             | **Expected result**                                   | **Outcome** |
| ------------------------ | ---------- | ---------------------------------------- | ----------------------------------------------------- | ----------- |
| /api/auth/token/         | POST       | Valid credentials                        | Access & refresh tokens returned                      | **✔ Pass**  |
| /api/auth/token/         | POST       | Incorrect password or inactive account   | Error message                                         | **✔ Pass**  |
| /api/auth/token/refresh/ | POST       | Valid refresh token                      | New access token generated                            | **✔ Pass**  |
| /api/auth/activate/      | POST       | Valid token, unused, not expired         | Account activated                                     | **✔ Pass**  |
| /api/auth/activate/      | POST       | Expired or already-used token            | Error message                                         | **✔ Pass**  |
| Post-login redirect      | UI         | Login with Manager role                  | Redirect to Manager dashboard (/manager)              | **✔ Pass**  |
| Post-login redirect      | UI         | Login with Designer role                 | Redirect to Designer dashboard (/designer)            | **✔ Pass**  |
| Full invitation flow     | UI         | Click invitation link received by e-mail | Password set → account activated → redirect to /login | **✔ Pass**  |

## 8\. Sprint Tracking

### 8.1 Scrum Board

Figure 30 shows the Sprint 1 Scrum board at sprint close - all five user stories and infrastructure tasks have been accomplished.

Figure 30: Sprint 1 Scrum Board

### 8.2 Burndown Chart

Figure 31 plots actual remaining effort against the ideal burndown.

Figure 31: Sprint 1 Burndown Chart

## Chapter Conclusion

Authentication and onboarding are complete, and all eleven models are migrated. Sprint 2 builds the project and task management layer on top of this foundation.

# Chapter 5 - Sprint 2: Project and Task Management

## 1\. Introduction

Sprint 2 covers five user stories - US-06 through US-09 and US-AI-01 - estimated at 15 person-days. The goal is to make the application usable for end-to-end project management: a Manager must be able to create a project, assign designers, break it into tasks with estimates, and monitor budget utilisation; a Designer must be able to see the projects they are responsible for.

## 2\. Sprint 2 Backlog

Table 21 lists all user stories included in Sprint 2, their assigned role, complexity, and estimated effort in person-days.

Table : Sprint 2 Backlog

| **ID**       | **Epic**           | **User Story**                                                                                                                                                                     | **Priority** | **Complexity** | **Est.** |
| ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- | -------- |
| **US-06**    | Project Management | As a Manager, I want to create a project with budget, deadline, and category, and edit or delete it at any time.                                                                   | 1            | Medium         | 5        |
| **US-07**    | Project Management | As a Manager, I want to list all projects, view a detail page, assign designers, and filter results by status.                                                                     | 1            | Medium         | 6        |
| **US-08**    | Project Management | As a Manager, I want to create, edit, and delete tasks linked to a project, with estimated hours, subtask support, and an unplanned-task flag to track scope creep.                | 1            | Medium         | 5        |
| **US-09**    | Project Management | As a Designer, I want to see only the projects I am assigned to, with a budget progress bar showing hours used versus budget.                                                      | 2            | Low            | 3        |
| **US-AI-01** | Project Management | As a Manager, I want to request an AI-generated hour estimate for a new task. The system provides a suggestion with reasoning drawn from historical time logs of the same project. | 2            | High           | 2        |

## 3\. Functional Specification

### 3.1 Sprint 2 Use Case Diagram

Figure 32 presents the use cases addressed in Sprint 2. The Manager is the primary actor with create, edit, delete, and assignment capabilities; the Designer participates with a read-only view of assigned projects. The AI Estimator use case is initiated by the Manager and delegates to the Groq API as an external system.

Figure 32: Sprint 2 Use Case Diagram

### 3.2 Textual Description of Use Cases

#### 3.2.1 Use Case: Manage Projects

Table 22: Textual Description of Use Case: Manage Projects

| **Use Case: Manage Projects** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to create new projects by specifying client, budget, deadline, and category, and to subsequently edit, update the status of, or delete any project. |
| **Pre-condition(s)** | The Manager is signed in.<br><br>At least one Client account exists in the system. |
| **Post-condition(s)** | A Project record exists in the database and appears in the Manager's project list. |
| **Base Scenario** | **1\.** The Manager navigates to the Projects section.<br><br>**2\.** The Manager selects Create Project.<br><br>**3\.** The Manager fills in the project details.<br><br>**4\.** The system validates the input and persists the record with status Active. |
| **Other Scenarios** | **3.a Missing required fields:**<br><br>**1\.** The system returns field-level error messages; the project is not saved. |

#### 3.2.2 Use Case: Assign Designer

Table 23: Textual Description of Use Case: Assign Designer

| **Use Case: Assign Designer** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to assign one or more Designers to an existing project, granting them access to its detail page and task list. |
| **Pre-condition(s)** | The Manager is signed in.<br><br>The project exists.<br><br>The target user has role Designer and an associated Designer profile. |
| **Post-condition(s)** | The designer gains access to the project and its task list. |
| **Base Scenario** | **1\.** The Manager opens the project detail page.<br><br>**2\.** The Manager selects a Designer from the assignment panel.<br><br>**3\.** The system creates a ProjectAssignment record linking the Designer to the project.<br><br>**4\.** The Designer's project list is updated on their next request. |
| **Other Scenarios** | **4.a Designer already assigned:**<br><br>**1\.** The system displays the message "This designer is already assigned to this project." and no duplicate record is created. |

#### 3.2.3 Use Case: Manage Tasks

Table 24: Textual Description of Use Case: Manage Tasks

| **Use Case: Manage Tasks** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to create, edit, and delete tasks linked to a project, with estimated hours, optional subtask nesting via a parent task, and an unplanned flag to identify scope creep. |
| **Pre-condition(s)** | The Manager is signed in.<br><br>A Project exists. |
| **Post-condition(s)** | Task records are linked to the project.<br><br>Estimated hours feed into budget variance calculations.<br><br>Tasks flagged as unplanned are counted in the Scope Creep Index. |
| **Base Scenario** | **1\.** The Manager opens the task list for a project.<br><br>**2\.** The Manager selects Create Task.<br><br>**3\.** The Manager fills the task details.<br><br>**4\.** The system persists the Task record with status Todo. |
| **Other Scenarios** | **3.a Unplanned flag set:**<br><br>**1\.** The task is marked with a scope-creep badge in the UI and is counted in the Scope Creep Index metric.<br><br>**3.b Parent task specified:**<br><br>**1\.** The task is created as a subtask nested under the selected parent task. |

#### 3.2.4 Use Case: View Assigned Projects

Table 25: Textual Description of Use Case: View Assigned Projects

| **Use Case: View Assigned Projects** | |
| --- | | --- |
| **Actor(s)** | Designer |
| **Description** | Allows the Designer to view the list of projects they are assigned to, each showing its status, deadline, and a budget progress bar. |
| **Pre-condition(s)** | The Designer is signed in.<br><br>At least one ProjectAssignment links this Designer to a project. |
| **Post-condition(s)** | The Designer can navigate to any assigned project detail page. |
| **Base Scenario** | **1\.** The Designer navigates to their dashboard.<br><br>**2\.** The system returns only the projects they are assigned to.<br><br>**3\.** The Designer selects a project to access its detail page. |
| **Other Scenarios** | **2.a No assignments exist:**<br><br>**1\.** The list is empty and the UI displays an informational message. |

#### 3.2.5 Use Case: AI Estimate Task Hours

Table 26: Textual Description of Use Case: AI Estimate Task Hours

| **Use Case: AI Estimate Task Hours** | |
| --- | | --- |
| **Actor(s)** | Manager |
| **Description** | Allows the Manager to request an AI-generated hour estimate for a new task. The system retrieves relevant historical time logs from the same project and submits them as context to the Groq API, which returns a suggested estimate with plain-English reasoning. |
| **Pre-condition(s)** | The Manager is signed in.<br><br>A project exists. |
| **Post-condition(s)** | A suggested estimate is displayed as advisory content. |
| **Base Scenario** | **1\.** The Manager fills in the task name and description.<br><br>**2\.** The Manager clicks Estimate Hours.<br><br>**3\.** The system queries up to 10 recent TimeLog records from the same project.<br><br>**4\.** The system constructs a prompt embedding the retrieved context and sends it to the Groq API.<br><br>**5\.** The AI service returns a suggested estimate and a plain-English justification.<br><br>**6\.** The system displays the suggestion in an advisory card below the Estimated Hours field.<br><br>**7\.** The Manager accepts the suggestion or dismisses it. |
| **Other Scenarios** | **4.a Groq API timeout or error:**<br><br>**1\.** The system returns an error message.<br><br>**3.b No historical data in project:**<br><br>**1\.** The system sends the prompt without context.<br><br>**2\.** The model returns a generic estimate based on the task description alone. |

## 4\. Conception

### 4.1 Sequence Diagrams

Figure 33 and Figure 34 model the two primary dynamic flows implemented in Sprint 2.

#### 4.1.1 Sequence Diagram: Manage Projects & Assign Designer

Figure 33: Sequence Diagram - Manage Projects

#### 4.1.2 Sequence Diagram: Manage Tasks & AI Estimate Task Hours

The task management feature allows the Manager to decompose each project into tasks and subtasks, each carrying a name, an estimated duration and a status (_To Do_, _In Progress_, _Completed_).

To assist the Manager during task creation, an AI-powered hour estimator is available. On demand, the system queries the project's historical time logs, filters entries with similar task names, and forwards this contextual data to the language model, which returns a suggested duration along with a brief justification.

Figure 34: Sequence Diagram - Manage Tasks

### 4.2 Class Diagram

Figure 35 presents the three domain models introduced in Sprint 2. Project links the Client to its tasks and assignments. Task adds a self-referential parent link for subtask nesting and an unplanned flag that feeds the Scope Creep Index in Sprint 5.

Figure 35: Sprint 2 Class Diagram

## 5\. Implementation

### 5.1 Data Layer: Project, Task, and Assignment Models

The Project model configures the foreign key to the client to prevent deletion of any client who owns active projects. Both budget fields use decimal precision to support the Effective Hourly Rate calculation in Sprint 5. The assignment model enforces a compound uniqueness constraint, preventing duplicate assignments at the database level. The Task model introduces two analytically significant fields: an unplanned flag (false by default), which drives the Scope Creep Index, and an optional parent task reference that supports subtask hierarchies without a separate model.

### 5.2 Role-Scoped API ViewSets

The project endpoint applies role-aware query filtering with three branches: managers receive all projects; Designers receive only projects where a ProjectAssignment links the project to their profile; Clients receive only their own projects. Any unrecognised role returns no results. Project creation and deletion are restricted to managers; updates to managers or designers; listing and retrieval to any authenticated user, with results filtered per role.

### 5.3 Designer Assignment Endpoint

The designer assignment endpoint validates that the target user holds the Designer role, then creates the assignment record. If a duplicate assignment is submitted, the database constraint rejects it and the API returns a descriptive validation error.

### 5.4 AI Task Hour Estimator

The AI estimation endpoint is restricted to managers. The backend queries the TimeLog model for up to ten recent logs from the specified project whose task names share keyword overlap with the submitted task name. These records are embedded into a prompt that instructs the Groq API to return a structured response containing the suggested estimate and the model's reasoning. The API key is read from the server's environment configuration. If the API call fails, the view returns an error message.

### 5.5 React Frontend

The Manager-facing pages include a CreateProject form (React Hook Form + Zod validation), a ProjectList page with status badges and budget progress bars (TanStack React Query), and a ProjectDetail page with an assignment panel. The task creation side panel includes an Estimate Hours button that calls the AI endpoint and displays the returned suggestion in an advisory card with Accept and Dismiss actions. Tasks flagged as unplanned render with an amber scope-creep badge across all task lists. The designer's home page presents a read-only card list of assigned projects with budget progress and deadline indicators.

## 6\. Interface Realisation

Figure 36-Figure 40 present the Sprint 2 deliverables.

### 6.1 Project Card

Figure 36 shows the project card component used across list and detail views.

Figure 36: Project Card

### 6.2 Project List Interface (Manager View)

Figure 37 shows the Manager's project list with status badges and filter controls.

Figure 37: Project List Interface (Manager View)

### 6.3 Project Detail and Task Management Interface

Figure 38 shows the project detail page with the task management panel and budget progress bar.

Figure 38: Project Detail and Task Management Interface

### 6.4 Task Creation Interface

Figure 39 shows the task creation side panel with the AI hour estimator advisory card.

Figure 39: Task Creation Interface

### 6.5 Project List Interface (Designer View)

Figure 40 shows the Designer's read-only assigned project list.

Figure 40: Project List Interface (Designer View)

## 7\. Testing

Figure 41 shows the Thunder Client results for Sprint 2. Key scenarios include the role-scope enforcement tests and the duplicate assignment rejection, which correspond to the rows in Table 27.

Figure 41: Sprint 2 API Testing

Table 27: Sprint 2 Test Results

| **Endpoint / Action**      | **Method** | **Scenario**                                         | **Expected result**                        | **Outcome** |
| -------------------------- | ---------- | ---------------------------------------------------- | ------------------------------------------ | ----------- |
| /api/projects/             | POST       | Manager role, valid project data                     | Project created                            | **✔ Pass**  |
| /api/projects/             | POST       | Request with Designer role (not authorised)          | Access denied                              | **✔ Pass**  |
| /api/projects/{id}/        | GET        | Designer role, project not assigned to that designer | Resource not found                         | **✔ Pass**  |
| /api/projects/{id}/        | PATCH      | Update project status (Active → OnHold)              | Status updated                             | **✔ Pass**  |
| /api/tasks/                | POST       | Manager role, unplanned flag set                     | Task created with scope-creep flag         | **✔ Pass**  |
| /api/tasks/ (subtask)      | POST       | Task with parent task set                            | Parent relationship persisted correctly    | **✔ Pass**  |
| /api/tasks/estimate-hours/ | POST       | Valid task data, similar time logs available         | Suggested hours and justification returned | **✔ Pass**  |

## 8\. Sprint Tracking

### 8.1 Scrum Board

Figure 42 shows the Sprint 2 Scrum board at close. US-AI-01 entered In Progress on day 14 as a post-planning addition, after the core task CRUD was confirmed working.

Figure 42: Sprint 2 Scrum Board

### 8.2 Burndown Chart

Figure 43 plots actual effort against ideal burndown. The deviation between days 14 and 15 corresponds to the Groq API integration work.

Figure 43: Sprint 2 Burndown Chart

## Chapter Conclusion

Sprint 2 delivered the full project and task management layer, with all five user stories completed. Two decisions carry forward to Sprint 5: the unplanned task flag and the compound uniqueness constraint on assignments. Sprint 3 follows with time tracking and deliverable management.

# Chapter 6 - Sprint 3: Time Tracking and Deliverables

## 1\. Introduction

Sprint 3 covers four user stories (US-10 through US-13), estimated at 13 person-days. The goal is to make the application useful to Designers in their day-to-day work: a Designer must be able to log their hours against a task, update that task's status, upload the resulting deliverable file for the client to review, and access any feedback the client has left against the project.

## 2\. Sprint 3 Backlog

Table 28 lists all user stories included in Sprint 3, their assigned role, complexity, and estimated effort in person-days.

Table : Sprint 3 Backlog

| **ID**    | **Epic**             | **User Story**                                                                                                                       | **Priority** | **Complexity** | **Est.** |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ | -------------- | -------- |
| **US-10** | Task & Deliverables  | As a Designer, I want to log time on a task so that my effort is accurately tracked against the project budget.                      | 2            | Medium         | 4        |
| **US-11** | Task & Deliverables  | As a Designer, I want to update the task status so that the team knows the current progress without having to ask.                   | 2            | Low            | 2        |
| **US-12** | Task & Deliverables  | As a Designer, I want to upload deliverables so that clients and managers can review the completed outputs directly on the platform. | 2            | Medium         | 4        |
| **US-13** | Feedback & Messaging | As a Designer, I want to view client feedback so that I can understand and act on client comments on my deliverables.                | 2            | Low            | 3        |

## 3\. Functional Specification

### 3.1 Sprint 3 Use Case Diagram

Figure 44: Sprint 3 Use Case Diagram

### 3.2 Textual Description of Use Cases

#### 3.2.1 Use Case: Log Time

Table 29: Textual Description of Use Case: Log Time

| **Use Case: Log Time** | |
| --- | | --- |
| **Actor(s)** | Designer, Manager |
| **Description** | Allows a Designer to record the number of hours spent on a specific task, along with a description of the work performed. The Manager can view all time log entries across all projects. |
| **Pre-condition(s)** | The Designer is signed in.<br><br>The Designer is assigned to the project containing the target task.<br><br>The task exists and belongs to the Designer's assigned project. |
| **Post-condition(s)** | A TimeLog record is created and linked to the task and the Designer.<br><br>Budget utilisation metrics are immediately updated to reflect the new entry. |
| **Base Scenario** | **1\.** The Designer navigates to the task detail or time log form.<br><br>**2\.** The Designer enters the hours spent and a description of the work.<br><br>**3\.** The Designer submits the form.<br><br>**4.** The system validates the input and persists the TimeLog record.<br><br>**5.** The project's budget progress bar reflects the updated total. |
| **Other Scenarios** | **4.a Hours value is zero or negative:**<br><br>**1\.** The system returns a validation error; the log is not saved. |

#### 3.2.2 Use Case: Update Task Status

Table 30: Textual Description of Use Case: Update Task Status

| **Use Case: Update Task Status** | |
| --- | | --- |
| **Actor(s)** | Designer, Manager |
| **Description** | Allows a Designer or Manager to update the status of a task to reflect its current stage of completion. |
| **Pre-condition(s)** | The Designer or Manager is signed in.<br><br>A Designer may only update the status of tasks belonging to their assigned projects. |
| **Post-condition(s)** | The task record reflects the new status, visible to all users with access to the project. |
| **Base Scenario** | **1.** The Designer opens the task list for a project.<br><br>**2.** The Designer selects the new status: To Do, In Progress, or Completed.<br><br>**3.** The system sends a partial update request and saves the new status.<br><br>**4\.** The task list reflects the new status immediately. |

#### 3.2.3 Use Case: Upload Deliverable

Table 31: Textual Description of Use Case: Upload Deliverable

| **Use Case: Upload Deliverable** | |
| --- | | --- |
| **Actor(s)** | Designer, Manager |
| **Description** | Allows a Designer to upload a completed output file (a deliverable) to the project. The file is stored on the cloud storage layer and a FileUpload record is created linking the file to the project. |
| **Pre-condition(s)** | The Designer is signed in and assigned to the project.<br><br>The file size does not exceed 50 MB.<br><br>The file type is supported. |
| **Post-condition(s)** | A FileUpload record exists with file type set to deliverable.<br><br>The file is stored at the configured storage path.<br><br>The file appears in the project's file list, accessible to the Manager and Client. |
| **Base Scenario** | **1.** The Designer opens the project detail page.<br><br>**2.** The Designer selects Upload Deliverable and chooses a file.<br><br>**3.** The system validates the file type and size, stores the file, and creates a FileUpload record.<br><br>**4.** The uploaded file appears in the project file list with a download link. |
| **Other Scenarios** | **3.a File exceeds 50 MB:**<br><br>**1\.** The system rejects the upload and returns a validation error.<br><br>**3.b Client attempts to upload a file classified as a deliverable:**<br><br>**1\.** The system enforces type-scoping and returns an error message. |

#### 3.2.4 Use Case: View Client Feedback

Table 32: Textual Description of Use Case: View Client Feedback

| **Use Case: View Client Feedback** | |
| --- | | --- |
| **Actor(s)** | Designer, Manager |
| **Description** | Allows a Designer to read all feedback items submitted by the Client against a project, filtered by category and status. This enables the Designer to understand what revisions or approvals are pending before the next work session. |
| **Pre-condition(s)** | The Designer is signed in and assigned to the project.<br><br>The Client has previously submitted at least one feedback item. |
| **Post-condition(s)** | The Designer can view the full list of feedback items with their category, content, status, and submission date. |
| **Base Scenario** | **1.** The Designer navigates to the project detail page.<br><br>**2.** The Designer selects the Feedback tab.<br><br>**3.** The system returns all Feedback records for the project, ordered by submission date.<br><br>**4.** The Designer reads the feedback items and can filter by category or status. |
| **Other Scenarios** | **3.a No feedback items exist for the project:**<br><br>**1\.** The list is empty and the UI displays an informational message**.** |

## 4\. Conception

### 4.1 Sequence Diagrams

Figure 45 and Figure 46 model the primary dynamic flows in Sprint 3.

#### 4.1.1 Sequence Diagram: Log Time on Task

This sequence models the time logging flow from the Designer's perspective. The Designer submits a form containing the task identifier, hours spent, and a description.

Figure 45: Sequence Diagram - Log Time on Task

#### 4.1.2 Sequence Diagram: Upload Deliverable

This sequence models the file upload flow. The frontend encodes the file as a standard multipart upload. Designers may only upload deliverables, not reference materials or brand guidelines - then writes the file to cloud storage (Cloudinary) and creates a FileUpload record in the database containing the metadata.

Figure 46: Sequence Diagram - Upload Deliverable

### 4.2 Class Diagram

TimeLog links a Designer to a Task and stores logged hours; it is the source of all budget and utilisation metrics in Sprint 5. FileUpload links a project to its uploader and carries a file type that enforces role-scoped upload rules at the API layer.

Figure 47: Sprint 3 Class Diagram

## 5\. Implementation

### 5.1 Data Layer: TimeLog and FileUpload Models

The TimeLog model stores hours as a decimal value with two places of precision. The description field is free-text and records what work was performed during the logged period. Database indexes on the task-designer combination and the creation timestamp support the aggregate queries used in Sprint 5.

The FileUpload model stores the file path within the cloud storage bucket rather than a binary blob, keeping the relational database lean. The file size is stored in bytes and validated against the 50 MB ceiling at the serialiser level before the upload is attempted. The file type field accepts three values: deliverable, reference material, and brand guideline; the API permission layer enforces which roles may upload which types.

### 5.2 Role-Scoped Time Log Endpoints

The time log endpoint applies role-aware filtering. A Manager receives all time logs across all projects. A Designer receives only logs they have authored. Any attempt by a Designer to create a log against a task that does not belong to one of their assigned projects is rejected with an access-denied response before the database write occurs. The Manager-facing list endpoint additionally supports project and designer filter parameters for filtered views on the project detail page.

### 5.3 Task Status Update Endpoint

Task status updates are submitted as partial update requests to the task endpoint. The endpoint accepts any subset of writable task fields; for status updates only the status field is sent. Access is restricted to managers and designers; a Designer may only update a task belonging to a project they are assigned to, enforced at the individual record level. The three valid status values - To Do, In Progress, and Completed - are enforced by the serialiser.

### 5.4 File Upload Endpoint

The file upload endpoint accepts a multipart form submission containing the file binary, the project identifier, and the file type. On the backend, the file is uploaded to Cloudinary using the Cloudinary Python library; the returned file URL is stored. The FileUpload record is persisted linked to the uploader. Type-scope enforcement is implemented in the serialiser's validation logic method: Designers may only upload files classified as deliverables; Clients may only upload reference materials or brand guidelines.

### 5.5 React Frontend

The Designer-facing time log form is a slide-out panel accessed from any task row on the project detail page. It contains a task selector pre-populated with the current task, an hours field accepting quarter-hour increments, and a description textarea. On success, TanStack React Query invalidates both the time log list and the project summary queries, causing the budget progress bar to recompute automatically.

The task status toggle applies changes immediately with local optimistic updates, reverting on server error. File uploads are validated for type and size before submission. The feedback panel presents items grouped by status with category badges distinguishing revision, approval, and question entries.

## 6\. Interface Realisation

Figure 48-Figure 51 present the Sprint 3 deliverables.

### 6.1 Time Logging Interface (Designer View)

Figure 48 shows a slide-out panel on the project detail page allowing the Designer to submit a time entry against any task. The budget progress bar updates after each submission.

Figure 48: Time Logging Interface (Designer View)

### 6.2 Task Status Toggle

Figure 49 shows a segmented status control rendered inline on each task row, allowing the Designer or Manager to move a task through Todo, InProgress, and Completed without opening a separate form. Updates are applied optimistically with server confirmation.

Figure 49: Task Status Toggle

### 6.3 File Upload Interface

Figure 50 shows the files uploaded on the project detail page.

Figure 50: File Upload Interface

### 6.4 Feedback View Interface (Designer View)

Figure 51 shows the feedback panel with items grouped by status. Category badges (Revision, Approval, Question) and dropdown filters for category and status are visible.

Figure 51: Feedback View Interface (Designer View)

## 7\. Testing

Figure 52 shows the Thunder Client results for Sprint 3.

Figure 52: Sprint 3 API Testing

Table 33: Sprint 3 Test Results

| **Endpoint**   | **Method** | **Scenario**                                                  | **Expected result**                          | **Outcome** |
| -------------- | ---------- | ------------------------------------------------------------- | -------------------------------------------- | ----------- |
| /api/timelogs/ | POST       | Designer role, valid task in assigned project                 | TimeLog created                              | **✔ Pass**  |
| /api/timelogs/ | POST       | Designer role, task in unassigned project                     | Access denied                                | **✔ Pass**  |
| /api/timelogs/ | POST       | Hours value is 0                                              | Validation error                             | **✔ Pass**  |
| /api/timelogs/ | GET        | Designer role                                                 | Only logs authored by that Designer returned | **✔ Pass**  |
| /api/files/    | POST       | Designer uploads a deliverable file                           | FileUpload record created                    | **✔ Pass**  |
| /api/files/    | POST       | Designer uploads with reference file type (scoping violation) | Type-scope error                             | **✔ Pass**  |
| /api/files/    | POST       | File size exceeds 50 MB                                       | Validation error                             | **✔ Pass**  |

## 8\. Sprint Tracking

### 8.1 Scrum Board

Figure 53 shows the Sprint 3 Scrum board.

Figure 53: Sprint 3 Scrum Board

### 8.2 Burndown Chart

Figure 54 plots actual effort against ideal burndown.

Figure 54: Sprint 3 Burndown Chart

## Chapter Conclusion

Two decisions carry forward: time log records are the sole source of truth for all budget and EHR metrics in Sprint 5, and the Cloudinary integration eliminates the ephemeral disk risk.