--- BACKEND ---

DRF - the middleman between the database and the React app, it speaks Python to the database and JSON to the frontend.
REST - Representational State Transfer. It's an architectural style for designing networked applications. The backend exposes resources as URLs and we use standard HTTP methods such as GET, POST, DELETE etc.

REST API + SPA split.
relational database design

ORM - python code that django translates to raw sql

indexes - database optimization to avoid scanning every row (slow). example: ['client', 'status'] "get all Active projects for client X"

aggregate queries - compute a single value from many rows

annotate - adds a computed column to query results

core/urls - central router of the backend, every requests hits this file

apps/urls - routing for specific app, instead of manually writing a path() for list, detail, create, update, delete, they are automatically generated

viewset - bundles all actions (crud) in 1 class

queryset - is Django's representation of a database query that has not run yet. It's lazy — defining it does not hit the database.

view - decides who can do it and what data they see
serializer - decides what shape that data is in — what gets validated on input and what gets returned on output. Python objects <-> JSON.
DRF's ModelViewSet handles all the data processing internally

permission_classes = [IsAuthenticated] - reject anyone whos not authenticated

get_queryset - filter what each role can see

get_serializer_class - write serializer for fields the user should be able to set. When data comes in from a form. It only accepts fields that should be editable.
read serializer for computed fields and responses that do not exist as columns in the database. when data goes out to the frontend.

Why this matters: It prevents the frontend from accidentally overwriting computed data

get_permissions - control who can do what

get_or_create (application level) - fetch this row, if it doesn't exist then create it
unique_together (database level) - prevent duplicate row

detail=False → URL is /api/messages/mark-read/ (no ID)
detail=True → URL would be /api/messages/{id}/mark-read/ (acts on one message)

request.query_params.get - URL query string: ?project=5 - Typically GET
request.data.get - Request body (JSON, form data) - Typically POST, PATCH, PUT

ManyToManyField - Django creates a hidden table.

__str__ - defines how a model instance renders as a string. Python calls it whenever something does str(instance) or repr(instance).

HEAD - identical to GET but the server returns only the response headers, with no body.
OPTIONS — returns a description of what the endpoint supports (allowed methods, accepted content types).

SerializerMethodField - when u can't pull a value directly from a model field 
PrimaryKeyRelatedField - Validates that the submitted ID actually exists in the table. 

why ProjectAssignment - because relational databases cannot directly store a many-to-many relationship. You can't put a list of designers inside a project row, so a solution is always a junction table in between. Also ProjectAssignment has extra fields.

why not store analytics or make a model - analytics are computed from data thats already stored, if i store analytics separately, they could go out of sync, for example every time a designer logs time, i'd have to remember to update the analytics table too

AUTH_USER_MODEL = 'users.User' - replaced Django's default User model with a custom one that uses email instead of username and adds a role field
REST_FRAMEWORK - sets JWT as the default authentication method globally, so every endpoint requires a valid token unless explicitly made public

related_name='designer_profile'
related_name='client_profile'
allows acessing the related profile eg. designer_obj = some_user.designer_profile

models.CASCADE - defines what happens to child rows when their parent is deleted. CASCADE means: delete the child too.

attrs - the dictionary of validated field values passed into validate() in a DRF serializer.
obj - the model instance being serialized.

strip() - removes spaces and tabs

Decimal stores precise fractional numbers — 0.01, 1.75, 0.003. Unlike Python's float, which uses binary representation and introduces tiny errors (0.1 + 0.2 = 0.30000000000000004), Decimal stores numbers exactly as you'd write them on paper. 

--- DATABASE ---

SQLite is only for development, it breaks under real traffic. PostgreSQL is the standard production database for Django, and it handles my analytics queries more reliably

psql -U admin -d designflow
\l          -- list all databases
\dt         -- list all tables
\d projects_project   -- describe a specific table (show columns)
\q          -- quit
SELECT * FROM projects_project;

How do you get the client's name from a project - The Project model has a foreign key to Client, which has a foreign key to User. In the serializer I traverse that with client.user.full_name

--- FRONTEND ---

TypeScript catches type errors before the code runs, the same way a C compiler would reject mismatched types. JavaScript would only crash at runtime — potentially in front of a user

useState — when you have a value that the UI depends on and can change.
useMemo — when you want to remember an expensive calculation and only redo it if specific things change.
useEffect — when you need to do something outside of rendering. Fetching data, setting a timer, listening to an event.
Page loads → useEffect fires → calls the API → setData(result) → component re-renders with the data.

types/ — Shape of the data - TypeScript interfaces that mirror your database models

api/ — How to talk to the backend - Functions that make the actual HTTP requests using Axios. Each function maps to one endpoint

hooks/ — How the component uses the data - Wraps the api/ functions in TanStack React Query. Handles loading state, error state, caching, and automatic refetching. Components call these hooks instead of calling api/ directly.

Flow - Component → calls hook → hook calls api function → api hits backend

States:
UI state — is this modal open? what's typed in this input? Lives only in the browser. React's useState handles this.
Server state — the list of projects, the tasks, the users. Lives in the database. Your component doesn't own it, it just borrows a copy of it.

Project: what the backend sends you.
ProjectPayload: what you send to the backend

TanStack React Query - a library that manages server state in React — meaning data that lives on the backend, not in your component.

useQueryClient - The brain that holds all caches
useQuery — Used for reading data (GET requests).
useMutation — Used for writing data (POST, PATCH, DELETE).

onSettled - success or failure.

Zod is a library that lets you describe the shape and rules of your data, then validates any value against those rules.

onMutate: async ({ id, status }) => { // Before the API even responds, we immediately update the UI.
await queryClient.cancelQueries({ queryKey: ['projects'] }); // Stop any background refetch of the projects list so it doesn't overwrite our change.

invalidateQueries - After a project is created, the cached list is now stale (it doesn't include the new project). invalidateQueries tells React Query "throw away that cached result and refetch." This is why the list auto-refreshes without you writing any refresh logic.

removeQueries - deletes it from the cache entirely. On delete, you remove the detail cache (['projects', 5]) because if you just invalidated it, React Query might try to refetch /projects/5/ which now returns 404

queryKey: ['projects'] — This is the cache key. React Query stores the result under this key. If two components both call useProjects(), only one HTTP request is made — the second one gets the cached result. This is automatic deduplication.

{data} - {} grabs a specific property from a response object

exact: true - refresh only specific key

qc.invalidateQueries({ queryKey: ['projects', id] }); - refresh detail of specific project
qc.invalidateQueries({ queryKey: ['projects'], exact: true }); - refresh project list

QueryClientProvider — makes React Query available to the whole app (data fetching)
AuthProvider — makes the logged-in user available everywhere via context (any component can call useAuth())
StrictMode — a React development tool that highlights potential bugs

ProtectedRoute — wraps every page that requires a role. If you're not logged in or wrong role, you get redirected.
PublicRoute — the opposite. If you're already logged in and try to visit /login, it redirects you away.
RootRedirect — visiting / sends you to the right dashboard based on your role.

Promise<Project[]> — A Promise is a placeholder for a value that doesn't exist yet. Promise<Project[]> means "this will eventually give you an array of Project objects." 

Partial<ProjectPayload> or Partial<T> means every field of T becomes optional. This is because PATCH (partial update) only sends the fields you want to change, not the whole object.

apiClient — This is your configured Axios instance (from client.ts). It already has the base URL and the JWT token injected automatically via interceptors. So every function here doesn't need to worry about auth — it's handled one level below

default export - a file can have one default export. When you import it, you can call it whatever you want.
name export - a file can have many named exports. The name is fixed — you must use the exact name it was exported with.
* as projectsApi - pulls every named export from the file into one object, so you call them as projectsApi.getProjects()

JWT access tokens expire after a short time (typically 5–15 minutes). Without this, users would get randomly logged out mid-session when their token expires. The solution is a silent token refresh.
Login → get both tokens
Every request → send access token
Access token expires → interceptor catches 401 → sends refresh token to /auth/token/refresh/ → backend returns a new access token → rotate the refresh token after using it to grab a new access token
Refresh token expires → must log in again

JWT - not encrypted but encoded with base64, the backend verifies its not tampered with using the secret key.

const ehr = pm?.ehr ?? null;
?  Optional chaining, if value is null or undefined, stop safely.
?? Nullish coalescing, if the thing on the left is null or undefined, use the thing on the right instead

... - spread operator, unpacks an array and inserts each item individually.
results = [ [project1, project2, ...20 items] ] -> results = [ project1, project2, ...20 items ]

useNavigate for events, <Navigate /> for render

Record<KeyType, ValueType> - an object where every key is X and every value is Y, to ensure we dont add an unknown value as ValueType.

--- Analytics ---

Projected EHR - `budget_amount / budget_hours` - Project creation / planning - "This is the revenue rate we need to hit to consider this project on target."

Raw EHR - `budget_amount / actual_hours` - Live project - "This is the revenue rate we are currently generating — watch it fall as hours accumulate."

Weighted EHR - `raw EHR - weighted avg designer hourly rate` - Analytics - "This is what we actually keep per hour after paying the designers — the true profit signal."

Avg. EHR = "How much money comes in per hour on average?"





"My stack was selected around two constraints: solo development and a 3-month timeline. Django + DRF provided the backend scaffolding, ORM, and admin panel I needed to build 8 related models quickly. PostgreSQL handled the analytical queries for BI. React 19 + TypeScript + Vite gave me a type-safe, fast frontend. TanStack Query eliminated manual state management for server data. Tailwind and React Hook Form accelerated UI development. JWT fit the SPA architecture. ReportLab and openpyxl let me generate reports server-side without external services. Groq provided accessible AI inference for the two LLM features without requiring GPU infrastructure."


Design Agency System Prevents Scope Creep and Provides Analytics
The user is asking for a concise, natural-sounding "elevator pitch" or project summary they can use during a technical defense. They want to know what to say when someone asks "what's the project?"
I need to synthesize the information from the three uploaded documents (PROJECT_CONTEXT.md, DATA_MODEL.md, DEVELOPMENT.md) into a clear, confident, academic defense-style response. The key elements to cover:

    What it is (DesignFlow - a project management + BI system for a graphic design agency)
    The problem it solves (agencies lose money due to scope creep and lack of visibility into actual vs budgeted hours)
    Tech stack (Django 5 + DRF, React 19/TypeScript/Vite, PostgreSQL, JWT auth, Tailwind, Recharts, etc.)
    Key features (project/task management, time tracking with timers, client feedback portal, BI dashboards with analytics, AI features)
    Architecture highlights (role-based access control with 3 roles, custom User model with email login, invitation-based onboarding, no public signup)
    Academic context (final year IT internship, solo developer, 3 months, 5 sprints)

I should make it sound like spoken defense language - natural, not reading from a doc, but covering all the important technical and business points. I should keep it to roughly 1-2 minutes of speaking time (150-250 words), structured so they can deliver it smoothly.
Let me draft this in a conversational but technically precisetone.
Here's a natural, defense-ready summary you can deliver in about 90 seconds:
"This is DesignFlow — a project management and business intelligence platform I built for a graphic design agency as my final-year internship project."
The Problem: "Design agencies typically lose money because of scope creep and poor visibility into actual hours versus budgeted hours. Managers often don't know a project is bleeding until it's too late."
The Solution: "I built a full-stack web application over three months using Django 5 with Django REST Framework on the backend, and a React 19 TypeScript SPA on the frontend, backed by PostgreSQL. The system supports three distinct roles — Manager, Designer, and Client — with strict RBAC on every endpoint."
Key Features: "Managers create projects and tasks, assign designers, and get real-time BI dashboards showing metrics like Effective Hourly Rate, budget variance, scope creep index, and designer utilisation. Designers track time via an integrated start/pause/stop timer that auto-logs hours against tasks, and they manage work through a Kanban board. Clients can view their project status, submit feedback and revisions, and upload reference materials. There's also an AI layer using Groq's LLM that suggests task hour estimates based on historical data and generates project health narratives for managers."
Architecture: "Notable technical decisions include a custom User model with email-based authentication and JWT tokens, an invitation-only onboarding flow with expiring UUID tokens, and an analytics app with no models — it runs complex PostgreSQL aggregations across the operational data. I also implemented PDF and Excel report generation, and the entire project was delivered across five two-week sprints."