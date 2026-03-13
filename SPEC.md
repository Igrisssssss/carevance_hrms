# TimeTrack Pro - Product and Technical Spec

## Project Overview

- Project Name: TimeTrack Pro
- Type: SaaS web application with an optional Electron desktop shell
- Core Functionality: employee time tracking, attendance, screenshots, chat, payroll, invoicing, reporting, and admin operations

## Recent Product Updates (March 10, 2026)

- Desktop `Edit Time` opens the dedicated time-edit and overtime workflow.
- Full attendance calendar remains on the `Attendance` screen.
- Monitoring includes productive and unproductive classification, tool summaries, employee rankings, and live active-tool status.
- Team-style activity management moved into `User Management`.
- `/team` redirects to `/user-management`.

## Technology Stack

### Backend
- Framework: Laravel 12
- Language: PHP 8.2+
- Database: PostgreSQL by default
- Authentication: bearer tokens stored in `personal_access_tokens`
- Queue: Laravel database queue
- File Storage: Laravel Flysystem `public` disk for browser-accessible assets

### Frontend
- Framework: React 18 with TypeScript
- Build Tool: Vite 5
- Routing: React Router 6
- Data Fetching: Axios and TanStack React Query 5
- Styling: Tailwind CSS 3 plus app-specific utility styling

### Desktop
- Framework: Electron 33
- Desktop Context: `active-win`

## Core Features

### Authentication and Access
- User registration
- Login and logout
- Role-based access control for admin, manager, and employee
- Desktop-to-web token handoff

### Time and Attendance
- Start and stop timers
- Manual time entries
- Attendance check-in and check-out
- Attendance calendar and summaries
- Overtime and time-edit requests

### Monitoring
- Screenshot capture from the desktop shell
- App and URL activity collection
- Productive and unproductive classification
- Live employee monitoring views

### Collaboration and Operations
- Projects and tasks
- Private chat and group chat with attachments
- Notifications
- User management
- Report groups for reporting filters

### Finance
- Invoices
- Payroll structures, records, payslips, and Stripe-oriented payment flows

## Setup Expectations

### Backend
- Copy `backend/.env.example` to `.env`
- Configure PostgreSQL credentials or another supported Laravel database driver
- Run `php artisan migrate`
- Run `php artisan storage:link`
- Run a queue worker if queued jobs need processing

### Frontend
- Copy `frontend/.env.example` to `.env`
- Point `VITE_API_URL` at the backend API
- Set `VITE_WEB_APP_URL` when the desktop shell should open a specific web base URL

### Desktop
- Set process env `APP_URL` only when the shell should point somewhere other than `http://localhost:5173`

## Operational Notes

- No dedicated broadcasting server is configured in this repository.
- Public file access depends on Laravel's storage symlink.
- The app structure is split into `backend/`, `frontend/`, and `desktop/`.
