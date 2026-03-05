# TimeTrack Pro - SaaS Time Tracking Software

A Time Doctor-like SaaS product built with Laravel backend and React frontend.

## Features

- **Time Tracking**: Start/stop timer, manual time entry
- **Project Management**: Create and manage projects with budgets
- **Task Management**: Assign tasks to team members
- **Reports & Analytics**: Daily, weekly, monthly reports
- **Invoicing**: Generate invoices from time entries
- **Team Management**: Invite and manage team members
- **Responsive UI**: Modern React frontend with Tailwind CSS

## Tech Stack

### Backend
- Laravel 11
- PostgreSQL
- Laravel Sanctum (API Authentication)

### Frontend
- React 18 with TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

## Project Structure

```
demo_laravel_2/
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   └── Models/
│   ├── config/
│   ├── database/migrations/
│   ├── routes/
│   ├── composer.json
│   └── .env.example
│
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── SPEC.md                  # Project specification
├── TODO.md                  # Implementation progress
└── README.md                # This file
```

## Prerequisites

Before running the project, you need to install:

1. **PHP 8.2+** - [Download](https://www.php.net/downloads)
2. **Composer** - [Download](https://getcomposer.org/download/)
3. **PostgreSQL** - [Download](https://www.postgresql.org/download/)
4. **Node.js 18+** - [Download](https://nodejs.org/) (Already installed)
5. **npm** - Comes with Node.js (Already installed)

## Quick Start (Demo Mode)

The frontend is configured to run in **Demo Mode** by default, which allows you to test the UI without setting up the backend.

### Frontend Only (Demo Mode)

```
bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### Full Setup (With Backend)

#### 1. Setup Backend (Laravel)

```
bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file
copy .env.example .env

# Generate application key
php artisan key:generate

# Create PostgreSQL database
# Run: createdb timetrackpro (or use pgAdmin)

# Update .env with your database credentials:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=timetrackpro
# DB_USERNAME=postgres
# DB_PASSWORD=your_password

# Run migrations
php artisan migrate

# Start Laravel server
php artisan serve
```

Backend will run at http://localhost:8000

#### 2. Setup Frontend

```
bash
cd frontend

# Install dependencies
npm install

# Update API URL in .env (create if not exists)
# VITE_API_URL=http://localhost:8000/api

# Disable demo mode in src/contexts/AuthContext.tsx
# Change: const DEMO_MODE = true; to const DEMO_MODE = false;

# Start development server
npm run dev
```

Frontend will run at http://localhost:5173

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Time Entries
- `GET /api/time-entries` - List time entries
- `POST /api/time-entries` - Create time entry
- `POST /api/time-entries/start` - Start timer
- `POST /api/time-entries/stop` - Stop timer
- `GET /api/time-entries/active` - Get active timer
- `GET /api/time-entries/today` - Get today's entries

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `PATCH /api/tasks/{id}/status` - Update task status

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/{id}` - Update invoice
- `POST /api/invoices/{id}/send` - Send invoice
- `POST /api/invoices/{id}/mark-paid` - Mark as paid

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/weekly` - Weekly report
- `GET /api/reports/monthly` - Monthly report
- `GET /api/reports/productivity` - Productivity report

## Environment Variables

### Backend (.env)
```
APP_NAME=TimeTrackPro
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=timetrackpro
DB_USERNAME=postgres
DB_PASSWORD=password

FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## Development

### Running Tests (Backend)
```
bash
cd backend
php artisan test
```

### Building for Production (Frontend)
```
bash
cd frontend
npm run build
```

## License

Commercial - All rights reserved
