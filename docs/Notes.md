--- BACKEND ---

DRF - the middleman between the database and the React app, it speaks Python to the database and JSON to the frontend.

ORM - python code that django translates to raw sql

indexes - database optimization to avoid scanning every row (slow)

aggregate queries - compute a single value from many rows

core/urls - central router of the backend, every requests hits this file

apps/urls - routing for specific app, instead of manually writing a path() for list, detail, create, update, delete, they are automatically generated

viewset - bundles all actions (crud) in 1 class

view - decides who can do it and what data they see
serializer - decides what shape that data is in — what gets validated on input and what gets returned on output
DRF's ModelViewSet handles all the data processing internally

permission_classes = [IsAuthenticated] - reject anyone whos not authenticated

get_queryset - filter what each role can see

get_serializer_class - write serializer for fields the user should be able to set. When data comes in from a form. It only accepts fields that should be editable.
read serializer for computed fields and responses that do not exist as columns in the database. when data goes out to the frontend.

Why this matters: It prevents the frontend from accidentally overwriting computed data

get_permissions - control who can do what

get_or_create (application level) - fetch this row, if it doesn't exist then create it
unique_together (database level) - prevent duplicate row

@action(detail=True) means this action operates on a single project

SerializerMethodField - when u can't pull a value directly from a model field 
PrimaryKeyRelatedField - Validates that the submitted ID actually exists in the table. 

why ProjectAssignment - because relational databases cannot directly store a many-to-many relationship. You can't put a list of designers inside a project row, so a solution is always a junction table in between.

why not store analytics or make a model - analytics are computed from data thats already stored, if i store analytics separately, they could go out of sync, for example every time a designer logs time, i'd have to remember to update the analytics table too

AUTH_USER_MODEL = 'users.User' - replaced Django's default User model with a custom one that uses email instead of username and adds a role field
REST_FRAMEWORK - sets JWT as the default authentication method globally, so every endpoint requires a valid token unless explicitly made public

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