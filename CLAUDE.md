# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (port 3000)
npm start

# Production build
npm run build

# Run tests
npm test

# Run a single test file
npm test -- --testPathPattern=ComponentName

# Run tests with coverage
npm test -- --coverage
```

Environment: Copy `.env.example` to `.env` and set `REACT_APP_API_BASE_URL` to the backend API URL (e.g., `http://localhost:8080/api`).

## Architecture

### Build System
Create React App (react-scripts), **not** Vite. Uses Tailwind CSS with PostCSS.

### Routing (`src/App.js`)
React Router v6. All routes are wrapped in `AuthProvider`. Three route guard components:
- `ProtectedRoute` — requires authentication
- `PublicOnlyRoute` — redirects authenticated users away (e.g., `/login`)
- `RoleProtectedRoute` — wraps `ProtectedRoute` with role-based access checks

The `AppShell` component renders the persistent layout (Sidebar + Toolbar + Breadcrumbs) and hosts the `<Outlet>` for nested routes.

### Auth (`src/auth/`)
JWT-based auth using React Context (no Redux/Zustand). Key files:
- `AuthContext.jsx` — provider + `useAuth()` hook; holds access/refresh tokens, user info, and permission helpers (`hasRole`, `hasAnyRole`, `canModule`, `canAction`)
- `roles.js` — role constants and per-module access role arrays (e.g., `PRODUCTION_ACCESS_ROLES`)
- `authStorage.js` — persists session to `localStorage` under key `ngm.auth.session`

### API Layer (`src/services/`)
- `apiService.js` — Axios client with JWT auth interceptors, automatic token refresh on 401, 403 event emission, 15s timeout, and file upload helpers (`postFile`, `putWithFile`)
- `authService.js` — auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/me`, etc.)
- Domain services (`bomService.js`, `workOrderService.js`, `machineAssetsService.js`, `commonAPI.jsx`) call `apiService` methods

### Component Structure (`src/components/`)
Components are organized by business domain:
- `bom/` — Bill of Materials
- `inventory/` + `inventoryitem/` — Inventory management and item master
- `production/workorder/`, `production/productionJob/`, `production/machineassets/` — Production
- `manufacturing/routing/`, `manufacturing/workcenter/` — Manufacturing
- `sales/salesorder/`, `contact/`, `enquiry/`, `quotation/` — Sales
- `config/ItemCodeMapping/` — System config
- `ui/` — Shared UI (Sidebar, Toolbar, FilterBar, breadcrumb, imageupload, pdfupload)

Pages in `src/pages/` are thin route-destination wrappers that render the domain components.

### UI Stack
Mixed UI libraries are intentionally used together:
- **Material UI v6** (`@mui/material`) — primary component library; DataGrid from `@mui/x-data-grid`
- **shadcn/ui** — in `src/components/ui/`, alias `@/components`
- **Bootstrap 5** + **react-bootstrap** — supplementary
- **Tailwind CSS** — utility classes alongside component libraries
- **Formik + Yup** — forms and validation
- **lucide-react** + **@mui/icons-material** — icons

### Data Export
`jsPDF` + `jspdf-autotable` for PDF, `xlsx` + `papaparse` for Excel/CSV. `@hello-pangea/dnd` for drag-and-drop ordering. `framer-motion` for animations.
