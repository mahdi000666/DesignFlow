# Project Setup Guide

> One-time setup. Windows · PostgreSQL · Django + React/TypeScript · GitHub · Render.
> Every step explains what it does and why, not just what to type.
> After completing this, open DEVELOPMENT.md for daily workflow.

---

## Prerequisites

Install these once before anything else.

### Python 3.12
https://www.python.org/downloads/
During install, check **"Add python.exe to PATH"** — without this, your terminal won't find Python.
```bash
python --version && pip --version
```

### Node.js 20 LTS
https://nodejs.org/ — the LTS installer includes npm automatically.
```bash
node --version && npm --version
```

### PostgreSQL 16
https://www.postgresql.org/download/windows/
Use the interactive installer — it includes pgAdmin 4, a visual database browser you'll use throughout development.
During install, set a password for the `postgres` superuser. **Write it down** — you'll need it every time you connect.

> ⚠️ After installing, `psql` (the PostgreSQL command-line tool) may not be recognized in your terminal because PostgreSQL's `bin` folder wasn't added to PATH. If you get `'psql' is not recognized`, use the full path instead:
> ```bash
> "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
> ```
> Or add `C:\Program Files\PostgreSQL\16\bin` to your system PATH permanently via:
> Windows search → "Edit the system environment variables" → Environment Variables → System variables → Path → Edit → New → paste the path → OK → open a fresh terminal.

```bash
psql --version    # or use full path above
```

### Git
https://git-scm.com/download/windows — use all defaults.
```bash
git --version
```

### VS Code
https://code.visualstudio.com/

Useful extensions to install inside VS Code:
- **Python** (Microsoft) — syntax highlighting, IntelliSense for Python
- **Pylance** — better Python type checking
- **ESLint** — catches JavaScript/TypeScript errors
- **Prettier** — auto-formats your code
- **Thunder Client** — lightweight API tester built into VS Code, replaces Postman, no account needed

---

## Step 1 — Create GitHub Repository

A GitHub repository is where your code lives remotely. It acts as your backup and version history.

1. Go to github.com → **New repository**
2. Name: `DesignFlow` · Set to **Private**
3. Check **"Add a README file"** — GitHub creates `README.md` for you automatically
4. Click **Create repository**

Clone it to your machine. Cloning downloads the repo and creates the folder:
```bash
cd C:\Users\YourName\Projects
git clone https://github.com/YOUR_USERNAME/DesignFlow.git
cd DesignFlow
```

You now have `DesignFlow/` as your working folder. All future commands happen inside it.

---

## Step 2 — Create .gitignore (Do This Before Anything Else)

A `.gitignore` file tells Git which files and folders to never commit. This is critical because:
- Your `.env` files contain passwords and secret keys — anyone with your repo would have full access to your database and email
- `venv/` and `node_modules/` contain thousands of auto-generated files that should never be in version control (they're reinstalled from `requirements.txt` / `package.json`)

**This file must exist before your first `git add .`** — if you commit a secret accidentally, it stays in Git history even after you delete it.

Create `DesignFlow/.gitignore`:
```gitignore
# Python virtual environment — reinstalled from requirements.txt
venv/
__pycache__/
*.pyc
*.pyo
.pytest_cache/

# Django secrets and generated files — never commit these
backend/.env
backend/media/
backend/staticfiles/

# Frontend dependencies and build output — reinstalled from package.json
frontend/node_modules/
frontend/dist/
frontend/.env

# IDE settings
.vscode/

# OS junk files
.DS_Store
Thumbs.db
```

Commit it immediately — this is your very first commit:
```bash
git add .gitignore
git commit -m "chore: add gitignore"
git push origin main
```

---

## Step 3 — Backend Setup

The backend is a Django application — it handles your database, business logic, and exposes a REST API that the frontend will call.

### 3.1 Create and activate a virtual environment

A virtual environment is an isolated Python installation for this project. Without it, packages from different projects conflict with each other and with your system Python.

```bash
# Run from the DesignFlow root folder
python -m venv venv
```

This creates a `venv/` folder containing a private copy of Python and pip.

Activate it — you must do this every time you open a new terminal to work on the backend:
```bash
venv\Scripts\activate
```

You will see `(venv)` at the start of your prompt. This tells you the environment is active and any `pip install` will only affect this project.

### 3.2 Install Python dependencies

With `(venv)` active, install all backend packages:
```bash
pip install django==5.0 djangorestframework==3.15 djangorestframework-simplejwt ^
  django-cors-headers==4.3 psycopg2-binary==2.9 python-dotenv==1.0 ^
  django-filter==24.2 Pillow==10.3 openpyxl==3.1 reportlab==4.2 ^
  gunicorn==22.0 setuptools
```

What each package does:
- **django** — the web framework. Gives you ORM, admin panel, migrations, email, authentication
- **djangorestframework** — adds REST API capabilities to Django (serializers, ViewSets, API views)
- **djangorestframework-simplejwt** — JWT token authentication for the API
- **django-cors-headers** — allows your React frontend (on port 5173) to call your Django API (on port 8000) without the browser blocking it
- **psycopg2-binary** — the connector between Django and PostgreSQL
- **python-dotenv** — reads your `.env` file and loads it as environment variables
- **django-filter** — adds filtering support to API endpoints (`?project=1&status=Active`)
- **Pillow** — image processing, required for file uploads
- **openpyxl** — generates Excel files (Sprint 6 export feature)
- **reportlab** — generates PDF files (Sprint 6 export feature)
- **gunicorn** — production web server used when deploying to Render
- **setuptools** — required by simplejwt on Python 3.12 (fixes `pkg_resources` import error)

> ⚠️ Known issue: `djangorestframework-simplejwt==5.3` causes a `ModuleNotFoundError: No module named 'pkg_resources'` on Python 3.12. Installing `setuptools` fixes it. If you still get this error after installing setuptools, run:
> ```bash
> pip install --upgrade djangorestframework-simplejwt
> ```

Save all installed packages to a file so they can be reinstalled anywhere:
```bash
pip freeze > backend/requirements.txt
```

### 3.3 Scaffold the Django project

`django-admin startproject` generates the Django project configuration. Running it with `.` at the end means "create in the current directory" rather than creating a nested folder.

```bash
cd backend
django-admin startproject core .
```

This creates:
- `core/` — the project configuration package containing:
  - `settings.py` — all Django configuration (database, installed apps, email, etc.)
  - `urls.py` — the root URL router (maps URL paths to views)
  - `wsgi.py` — entry point for production web servers
- `manage.py` — the command-line tool for everything Django (`migrate`, `runserver`, `shell`, etc.)

### 3.4 Create the apps

Django projects are divided into "apps" — self-contained modules each responsible for one area of functionality. Your project has 8 apps.

```bash
mkdir apps
type nul > apps\__init__.py
```

`apps\__init__.py` is an empty file that tells Python "this folder is a package" — without it, Django can't import your apps using the `apps.users` syntax.

```bash
cd apps
python ..\manage.py startapp users
python ..\manage.py startapp projects
python ..\manage.py startapp tasks
python ..\manage.py startapp timelog
python ..\manage.py startapp feedback
python ..\manage.py startapp files
python ..\manage.py startapp messages
python ..\manage.py startapp analytics
cd ..
```

Each `startapp` command creates a folder with these files:
- `models.py` — defines your database tables as Python classes
- `views.py` — handles API requests and returns responses
- `serializers.py` — converts model instances to/from JSON (you create this file yourself)
- `urls.py` — URL patterns for this app (you create this file yourself)
- `admin.py` — registers models to appear in the Django admin panel
- `apps.py` — app configuration (name, label)
- `migrations/` — folder where Django stores database migration files

> ⚠️ Known issue: `startapp` generates `apps.py` with `name = 'users'` but since your apps live inside the `apps/` package, the correct name is `'apps.users'`. You must fix all 8 files manually.

Open each `apps.py` and update `name`. Also add a `label` for the messages app to avoid a conflict with Django's built-in `django.contrib.messages`:

**`apps/users/apps.py`**
```python
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'
```

Repeat for every app, changing only the `name` value:

| File | `name` value |
|------|-------------|
| `apps/projects/apps.py` | `'apps.projects'` |
| `apps/tasks/apps.py` | `'apps.tasks'` |
| `apps/timelog/apps.py` | `'apps.timelog'` |
| `apps/feedback/apps.py` | `'apps.feedback'` |
| `apps/files/apps.py` | `'apps.files'` |
| `apps/analytics/apps.py` | `'apps.analytics'` |

For messages specifically, add `label` to avoid a name collision with Django's own `messages` app:

**`apps/messages/apps.py`**
```python
from django.apps import AppConfig

class MessagesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.messages'
    label = 'project_messages'    # avoids clash with django.contrib.messages
```

### 3.5 Create the PostgreSQL database

PostgreSQL needs a database and a dedicated user for your project. Connect as the superuser:

```bash
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Run these SQL commands:
```sql
CREATE DATABASE design_analytics;
CREATE USER analytics_user WITH PASSWORD 'choose_a_password';
GRANT ALL PRIVILEGES ON DATABASE design_analytics TO analytics_user;
\q
```

What each line does:
- `CREATE DATABASE` — creates the empty database your Django app will use
- `CREATE USER` — creates a dedicated database user (safer than using the superuser for everything)
- `GRANT ALL PRIVILEGES` — gives that user full control over the database

> ⚠️ Known issue on PostgreSQL 15/16: the `public` schema no longer grants CREATE permissions to non-superusers by default. If you get `permission denied for schema public` when running migrations, connect as postgres and run:
> ```bash
> "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d design_analytics
> ```
> ```sql
> GRANT ALL ON SCHEMA public TO analytics_user;
> GRANT ALL PRIVILEGES ON DATABASE design_analytics TO analytics_user;
> \q
> ```

### 3.6 Create `backend/.env`

The `.env` file stores secrets that must never be in Git. Django reads these values at startup via `python-dotenv`. Every value here must be manually re-entered in Render's dashboard when you deploy.

Create `backend/.env`:
```env
DEBUG=True
SECRET_KEY=replace_with_long_random_string
DB_NAME=design_analytics
DB_USER=analytics_user
DB_PASSWORD=choose_a_password
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
```

What each value does:
- **DEBUG** — when `True`, Django shows detailed error pages. Must be `False` in production
- **SECRET_KEY** — used by Django to sign cookies and tokens. Must be long, random, and secret
- **DB_*** — database connection details for PostgreSQL
- **ALLOWED_HOSTS** — which hostnames Django will respond to (prevents HTTP host header attacks)
- **CORS_ALLOWED_ORIGINS** — which frontend URLs are allowed to call the API (your React dev server)
- **EMAIL_*** — Gmail SMTP credentials for sending invitation emails

Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 3.7 Configure `core/settings.py`

`settings.py` is the central configuration file for your entire Django project. Replace its contents entirely:

```python
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()   # reads backend/.env and makes all values available via os.getenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',       # the admin panel at /admin/
    'django.contrib.auth',        # authentication system
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party packages
    'rest_framework',             # Django REST Framework
    'rest_framework_simplejwt',   # JWT authentication
    'corsheaders',                # CORS headers for frontend access
    'django_filters',             # query param filtering
    # Your apps
    'apps.users',
    'apps.projects',
    'apps.tasks',
    'apps.timelog',
    'apps.feedback',
    'apps.files',
    'apps.messages',
    'apps.analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # Must be first — handles CORS before anything else
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'   # tells Django where to find the root URL patterns

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Tells Django to use your custom User model instead of its built-in one
AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

REST_FRAMEWORK = {
    # All API endpoints require a valid JWT token by default
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),    # short-lived for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),    # user stays logged in for 7 days
    'ROTATE_REFRESH_TOKENS': True,                  # issues a new refresh token on each use
}

CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

# Email settings — Django uses these to send invitation emails
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('EMAIL_HOST_USER')

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # where collectstatic puts files for production
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'          # where uploaded files are stored

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### 3.8 Write the models

Each `models.py` is empty after `startapp` generates it — you write the model classes yourself. Models are Python classes that Django translates into database tables.

> ⚠️ `AUTH_USER_MODEL = 'users.User'` in settings tells Django your custom User model lives in `apps/users/models.py`. If that file is empty when you run `migrate`, Django raises `LookupError: App 'users' doesn't have a 'User' model`. You must fill `users/models.py` before running any migrations.

Fill each file using the code in `DATA_MODEL.md`. The order matters — fill `users` first because other models reference it:

1. `apps/users/models.py` — User, Designer, Client, InvitationToken
2. `apps/projects/models.py` — Project, ProjectAssignment
3. `apps/tasks/models.py` — Task
4. `apps/timelog/models.py` — TimeLog
5. `apps/feedback/models.py` — Feedback
6. `apps/messages/models.py` — Message
7. `apps/files/models.py` — FileUpload
8. `apps/analytics/models.py` — leave empty (this app has no models)

### 3.9 Run migrations

Migrations are how Django keeps your Python model definitions in sync with the actual database schema. There are two commands and they do different things:

```bash
python manage.py makemigrations
```
This scans all your `models.py` files, detects what changed, and generates migration files in each app's `migrations/` folder. These files describe the changes in Django's own language. **This does not touch the database yet.**

```bash
python manage.py migrate
```
This reads all migration files and executes them against the database — actually creating or altering tables. After this runs, your database has the table structure defined by your models.

**Changing a model later** (normal, expected, happens constantly):
1. Edit the field in `models.py`
2. `python manage.py makemigrations` — generates a new migration describing the change
3. `python manage.py migrate` — applies it to the database

You may also need to update: the serializer for that app, and later your TypeScript types on the frontend.

**Inspecting existing models:**
```bash
# See your models as Python objects
python manage.py shell
>>> from apps.users.models import User
>>> User._meta.get_fields()

# See raw database tables
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d design_analytics
\dt                  # list all tables
\d users_user        # describe a specific table's columns
\q
```
You can also browse tables visually in **pgAdmin 4** (installed with PostgreSQL):
pgAdmin → Servers → PostgreSQL 16 → Databases → design_analytics → Schemas → public → Tables

### 3.10 Create superuser and verify

```bash
python manage.py createsuperuser
```

This creates your Manager account. You'll be prompted for email, full name, and password. This is the account you'll use to log into Django Admin.

```bash
python manage.py runserver
```

This starts the development server on port 8000. Visit http://127.0.0.1:8000/admin — you should see the Django admin login page. Log in with the superuser credentials you just created. If you see the admin dashboard, the backend is working correctly.

> ⚠️ `runserver` is for development only — it serves one request at a time and is not safe for production. Render uses `gunicorn` instead.

---

## Step 4 — Frontend Setup

The frontend is a React application that users interact with. It calls your Django API to read and write data.

Open a **new terminal** and keep the backend terminal running. The backend must be running for the frontend to work.

### 4.1 Scaffold with Vite

Vite is the build tool that creates and runs your React project. Run this from the `DesignFlow` root:

```bash
cd C:\Users\Mahdi\Proj\PFE\DesignFlow
npm create vite@latest frontend -- --template react-ts
```

This creates the entire `frontend/` folder with a working React + TypeScript project. You do not create it manually.

```bash
cd frontend
```

> ⚠️ Every `npm` command must be run from inside the `frontend/` folder, not from `DesignFlow/` root. If you get `Could not read package.json`, you are in the wrong directory.

### 4.2 Install dependencies

```bash
npm install axios react-router-dom recharts react-hook-form @hookform/resolvers zod dayjs @tanstack/react-query lucide-react
```

What each package does:
- **axios** — HTTP client for calling your Django API, supports interceptors for JWT
- **react-router-dom** — client-side routing (`/manager`, `/designer`, `/client` pages)
- **recharts** — chart library for the BI dashboards (bar, line, pie charts)
- **react-hook-form** — form state management with minimal re-renders
- **@hookform/resolvers + zod** — schema-based form validation
- **dayjs** — lightweight date formatting library
- **@tanstack/react-query** — data fetching with caching, loading states, auto-refetch
- **lucide-react** — clean icon library

```bash
npm install -D tailwindcss@3 postcss autoprefixer prettier eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

- **tailwindcss@3** — utility-first CSS framework. Pinned to v3 because v4 dropped the `init` command and has a different setup flow
- **postcss + autoprefixer** — required by Tailwind to process CSS
- **prettier + eslint** — code formatting and linting

> ⚠️ Do not install `tailwindcss` without `@3` — the latest version (v4) has a completely different setup and the `npx tailwindcss init -p` command will fail with `could not determine executable to run`.

```bash
npx tailwindcss init -p
```

This generates `tailwind.config.js` and `postcss.config.js`.

### 4.3 Configure Tailwind

Open `tailwind.config.js` and replace its contents:
```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

`content` tells Tailwind which files to scan for class names — it removes unused CSS in production.

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4.4 Create `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Vite exposes variables prefixed with `VITE_` to your React code via `import.meta.env.VITE_API_BASE_URL`. This is the base URL your Axios client will use for all API calls. In production, you change this to your Render backend URL.

### 4.5 Start the dev server

```bash
npm run dev
```

Visit http://localhost:5173 — you should see the default Vite + React page. The frontend is working.

---

## Step 5 — Create docs folder and commit

```bash
# From DesignFlow root
mkdir docs
# Copy SETUP.md, DATA_MODEL.md, DEVELOPMENT.md, PROJECT_CONTEXT.md into docs/
```

Commit everything:
```bash
git add .
git commit -m "chore: initial project setup — backend scaffold, all models, frontend scaffold"
git push origin main
```

---

## What the Final Structure Looks Like

```
DesignFlow/
├── .gitignore                      ← committed
├── README.md                       ← committed
├── venv/                           ← NOT committed
├── backend/
│   ├── core/
│   │   ├── settings.py             ← Django config
│   │   ├── urls.py                 ← root URL router
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── __init__.py             ← empty, makes apps/ a Python package
│   │   ├── users/                  ← User, Designer, Client, InvitationToken
│   │   ├── projects/               ← Project, ProjectAssignment
│   │   ├── tasks/                  ← Task
│   │   ├── timelog/                ← TimeLog
│   │   ├── feedback/               ← Feedback
│   │   ├── files/                  ← FileUpload
│   │   ├── messages/               ← Message
│   │   └── analytics/              ← no models, only query views
│   ├── manage.py                   ← Django CLI
│   ├── requirements.txt            ← committed
│   └── .env                        ← NOT committed
├── frontend/
│   ├── src/
│   ├── package.json                ← committed
│   ├── tailwind.config.js          ← committed
│   └── .env                        ← NOT committed
└── docs/
    ├── SETUP.md
    ├── DATA_MODEL.md
    ├── DEVELOPMENT.md
    └── PROJECT_CONTEXT.md
```

---

## README.md

Replace the GitHub-generated README with:

```markdown
# DesignFlow

Final year project — a web-based project management and BI system for graphic design agencies.
Built with Django + React/TypeScript.

## Tech Stack
- **Backend:** Python 3.12, Django 5, Django REST Framework, PostgreSQL 16
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Auth:** JWT (djangorestframework-simplejwt) + invitation token onboarding

## Features
- Project & task management with budget tracking
- Granular time logging per task (Designer)
- Client feedback portal with revision tracking
- BI dashboards: EHR, budget variance, client profitability, scope creep index
- PDF/Excel report export
- Role-based access control (Manager / Designer / Client)

## Local Setup
See `docs/context/SETUP.md` for full setup instructions.

## Architecture & API
See `docs/context/PROJECT_CONTEXT.md` and `docs/context/DATA_MODEL.md`.
```

---

## Gmail SMTP Setup

Required in Sprint 2 when you implement the invitation email flow.

1. Enable 2FA on your Gmail account
2. Google Account → Security → App Passwords → generate one for "Mail"
3. Use the 16-character generated password as `EMAIL_HOST_PASSWORD` in `.env`

Do not use your real Gmail password — Gmail blocks it and it's a security risk.

During development and testing, you can bypass real email entirely by adding this to `settings.py`:
```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```
This prints emails to your terminal instead of sending them, so you can copy the activation link without needing SMTP configured.

---

## Daily Quick Reference

```bash
# Terminal 1 — Backend (always activate venv first)
cd C:\Users\Mahdi\Proj\PFE\DesignFlow
venv\Scripts\activate
cd backend
python manage.py runserver

# Terminal 2 — Frontend
cd C:\Users\Mahdi\Proj\PFE\DesignFlow\frontend
npm run dev

# After editing any model
python manage.py makemigrations
python manage.py migrate

# Install a new Python package
pip install package-name
pip freeze > requirements.txt

# Install a new npm package
npm install package-name
```

---
