Good morning, First of all, I would like to thank you for your interest in my thesis defense.
Today I have the honor of presenting my final year project. DesignFlow, a project management and business intelligence web application
Supervised by Mr. Omar Trigui and Mr. Jawhar Letaief
and completed by myself, Mahdi Mlika.

********************************************************************************************
My presentation is structured into five main parts.
First, I will introduce the general project context — the host organization, the problems they face, and the solution I proposed.
Then, I will cover the analysis and requirements phase, followed by the design and architecture.
The fourth and most substantial section will cover the implementation and finally, I will conclude with the results achieved and future perspectives.

********************************************************************************************
Let's begin with the project context.

Creative Media is a digital technology and multimedia agency founded in 2002 here in Sousse.
They specialize in web and mobile development, UX/UI design, AI integration, digital branding, and CGI.
They operate using Agile and Scrum methodologies, and their team includes full-stack developers, UX/UI designers, AI integrators, and multimedia specialists.

Graphic design agencies, like Creative Media, lose money due to four interconnected problems.
First, there is no systematic time logging against project budgets which means designers may work on tasks without being aware of how many hours have consumed the project budget

Second, Scope creep goes completely undetected and revision cycles are untracked which means when a client requests extra work, there was no process to flag it.

Third, managers had no real time visibility on the project budget, they only discover overruns after it's too late.

And fourth, the agency had no ability to identify unprofitable clients which led to projects being underpriced.


Before building DesignFlow, I analyzed multiple tools that agencies might consider.
For example:
Harvest has great time tracking and invoicing but has no scope creep tracking, client profitability ranking and requires an external project management tool

Toggl Track has an excellent timer UI but has no client portal or BI metrics

Asana has a mature task management but lacks native time tracking or budget tracking

Since none of these tools fully address the agencies needs, they needed something more integrated.

Proposed solution


********************************************************************************************

Now moving to the analysis and requirements phase.

The system serves three primary actors with role based access control

The requirements are categorized into three types:
Functional requirements include

Non-functional requirements cover security through JWT authentication, performance via optimized PostgreSQL queries, scalability through Django's proven architecture, maintainability through clean code practices, and usability through a modern React interface.

DesignFlow integrates decisional analysis across three levels, from descriptive to prescriptive

For the Descriptive layer — PostgreSQL aggregate queries compute real-time KPIs which answer "what is happening right now?"
For the Diagnostic layer  metrics like Scope Creep Index and Budget Variance identify root causes which answer "Why did it happen?"
As for the Prescriptive layer, the AI synthesizes all computed metrics into a plain-English narrative with one concrete action which answers "What should we do?"


The global use case diagram illustrates the complete function scope
2 external actors have been introduced
All primary actors must be authenticated before accesssing any functionality.

********************************************************************************************

Now moving to the technical design

The system follows a classic 3-tier architecture:

The Presentation Tier is a Single Page Application built with React and TypeScript. It communicates with the backend via HTTPS, sending JSON data, and authenticates using JWT access tokens.

The Application Tier is a REST API built with Django and Python. It exposes API views and serializers, and uses Django ORM for database operations.

The Data Tier is PostgreSQL, providing persistent storage for all application data.

This separation ensures scalability, maintainability, and security.

********************************************************************************************

I will now move to the implementation phase.

This project adopts scrum methodology 

The workflow begins with a Product Backlog, followed by a Sprint Planning to define the Sprint Backlog
Development occurs in 1 to 4-week sprints and Each sprint concludes with a Sprint Review producing finished work.

The project was divided into five sprints

Sprint 3 was dedicated to time tracking, the backlog includes timer mechanism integrated with the Kanban task board and activity log.

This sequence diagram illustrates the timer workflow

Managers can instantly spot which projects are consuming more time than planned.

********************************************************************************************

Now for the conclusion

DesignFlow successfully delivers on five key achievements:

First, a rigorous methodology, Scrum ensured iterative delivery and continuous stakeholder feedback.

Second, a modern tech stack — Django, React, TypeScript, and PostgreSQL form a production-ready project.

Third, operational BI metrics — EHR, budget utilization, scope creep, and profitability are no longer abstract concepts but concrete, visible numbers.

Fourth, integrated AI features — the task estimator and health narrative demonstrate how artificial intelligence can augment managerial decision-making without replacing human judgment.

And fifth, security and quality — JWT authentication, role-based access control, and immutable time logs ensure data integrity and accountability.


As for the perspectives, several enhancements could elevate design flow, such as: