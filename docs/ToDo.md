--- BACKEND ---

ORM - python code that django translates to raw sql

indexes - database optimization to avoid scanning every row (slow)

aggregate queries - compute a single value from many rows

core/urls - central router of the backend, every requests hits this file

apps/urls - routing for specific app

viewset - bundles all actions (crud) in 1 class

view - decides who can do it and what data they see
serializer - decides what shape that data is in — what gets validated on input and what gets returned on output
DRF's ModelViewSet handles all the data processing internally

get_queryset - filter what each role can see

get_serializer_class - write serializer for fields the user should be able to set (for security reasons), read serializer for computed fields and responses

get_permissions - control who can do what

get_or_create (application level) - fetch this row, if it doesn't exist then create it
unique_together (database level) - prevent duplicate row

SerializerMethodField - when u can't pull a value directly from a model field 

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
useEffect — when you need to do something outside of rendering. Fetching data, setting a timer, listening to an event.
Page loads → useEffect fires → calls the API → setData(result) → component re-renders with the data.

types/ — Shape of the data - TypeScript interfaces that mirror your database models

api/ — How to talk to the backend - Functions that make the actual HTTP requests using Axios. Each function maps to one endpoint

hooks/ — How the component uses the data - Wraps the api/ functions in TanStack React Query. Handles loading state, error state, caching, and automatic refetching. Components call these hooks instead of calling api/ directly.

Flow - Component → calls hook → hook calls api function → api hits backend

States:
UI state — is this modal open? what's typed in this input? Lives only in the browser. React's useState handles this.
Server state — the list of projects, the tasks, the users. Lives in the database. Your component doesn't own it, it just borrows a copy of it.

TanStack React Query - a library that manages server state in React — meaning data that lives on the backend, not in your component.

QueryClientProvider — makes React Query available to the whole app (data fetching)
AuthProvider — makes the logged-in user available everywhere via context (any component can call useAuth())
StrictMode — a React development tool that highlights potential bugs

ProtectedRoute — wraps every page that requires a role. If you're not logged in or wrong role, you get redirected.
PublicRoute — the opposite. If you're already logged in and try to visit /login, it redirects you away.
RootRedirect — visiting / sends you to the right dashboard based on your role.

"replace" - replaces the current history entry. So if you're logged in and get redirected away from /login, pressing back won't bring you back to /login

--- Analytics ---

Projected EHR - `budget_amount / budget_hours` - Project creation / planning - "This is the revenue rate we need to hit to consider this project on target."

Raw EHR - `budget_amount / actual_hours` - Live project - "This is the revenue rate we are currently generating — watch it fall as hours accumulate."

Weighted EHR - `raw EHR - weighted avg designer hourly rate` - Analytics - "This is what we actually keep per hour after paying the designers — the true profit signal."