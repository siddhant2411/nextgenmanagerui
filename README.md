<h1 align="center">NextGenManager UI</h1>

<p align="center">
  <strong>React frontend for the NextGenManager Manufacturing ERP</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#project-structure">Structure</a> &bull;
  <a href="#modules">Modules</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-blue?logo=react&logoColor=white" alt="React 18"/>
  <img src="https://img.shields.io/badge/MUI-6.5-blue?logo=mui&logoColor=white" alt="Material UI"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-blue?logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/React_Router-6-red?logo=reactrouter&logoColor=white" alt="React Router"/>
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue" alt="Apache 2.0 License"/>
</p>

---

This is the frontend application for [NextGenManager](https://github.com/siddhant2411/nextgenmanager), an open-source manufacturing ERP system. It provides a modern, responsive interface for managing production, inventory, sales, and asset operations.

## Features

### Dashboard
- KPI cards with key business metrics
- Interactive charts and visualizations (Recharts)
- Quick navigation to all modules

### Production & Manufacturing
- **Work Orders** -- Create, schedule, track material issuance and operation progress with state transitions
- **Routing** -- Define manufacturing processes with operation sequences and dependencies
- **Production Scheduling** -- Visual schedule against work centers with capacity planning
- **Production Jobs** -- Manage high-level production assignments
- **Shop Floor** -- Real-time shop floor operations view
- **Work Centers** -- Configure machines and workstations
- **Make vs Buy Analysis** -- Evaluate manufacturing vs purchasing decisions
- **Job Work Challans** -- Subcontracting management with drag-and-drop

### Inventory
- **Item Master** -- Product catalog with filtering, Excel import/export
- **Stock Tracking** -- Real-time inventory instance management
- **Item Code Mapping** -- Configurable auto-numbering schemes

### Sales & Marketing
- **Enquiries** -- Capture and track customer inquiries
- **Quotations** -- Generate and manage sales quotations
- **Sales Orders** -- Full order lifecycle with PDF generation

### Contacts
- **Unified Contacts** -- Vendors, customers, or both with multi-address support
- **GST/MSME Details** -- India-specific compliance fields

### Asset Management
- **Machine Registry** -- Equipment details, specs, and status tracking
- **Maintenance Events** -- Log and track machine maintenance
- **Production Logs** -- Machine utilization monitoring

### Security & Administration
- **JWT Authentication** -- Login with automatic token refresh on 401/403
- **Role-Based Access** -- 11 system roles with module-level permissions
- **User Management** -- Create users, assign roles, manage status (Super Admin)
- **Role Management** -- Create custom roles with granular permissions

### Data Export
- **PDF Generation** -- Client-side via jsPDF with auto-tables
- **Excel/CSV** -- Export any data grid via xlsx and PapaParse
- **PDF Viewing** -- In-app PDF viewer (react-pdf)

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 18.3, Create React App |
| **Routing** | React Router v6 (nested, protected routes) |
| **UI Components** | Material-UI v6, shadcn/ui, Bootstrap 5 |
| **Styling** | Tailwind CSS 3.4, Emotion |
| **Forms** | Formik + Yup validation |
| **HTTP Client** | Axios (with JWT interceptors) |
| **Charts** | Recharts 3.8 |
| **Animations** | Framer Motion 12 |
| **Drag & Drop** | @hello-pangea/dnd |
| **PDF** | jsPDF + autotable (export), react-pdf (viewing) |
| **Excel/CSV** | xlsx, PapaParse |
| **Date** | date-fns, Day.js |
| **Icons** | MUI Icons, Lucide React |

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- [NextGenManager backend](https://github.com/siddhant2411/nextgenmanager) running on port 8080

### Setup

```bash
git clone https://github.com/siddhant2411/nextgenmanagerui.git
cd nextgenmanagerui
```

Copy the environment config:

```bash
cp .env.example .env
```

Edit `.env` if your backend runs on a different URL:

```env
REACT_APP_API_BASE_URL=http://localhost:8080/api
```

Install and run:

```bash
npm install
npm start
```

The app will open at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `build/` folder, ready to serve from any static host or CDN.

## Project Structure

```
src/
├── auth/                      # Authentication system
│   ├── AuthContext.jsx         # JWT provider + useAuth hook
│   ├── roles.js               # Role definitions & access maps
│   ├── ProtectedRoute.jsx     # Auth guard
│   ├── PublicOnlyRoute.jsx     # Redirect if already logged in
│   └── RoleProtectedRoute.jsx # Role-based route guard
│
├── services/                  # API integration layer
│   ├── apiService.js          # Axios client with auth interceptors
│   ├── authService.js         # Auth & user management API
│   ├── authStorage.js         # localStorage session persistence
│   ├── bomService.js          # Bill of Materials API
│   ├── workOrderService.js    # Work order API
│   ├── routingService.js      # Routing API
│   ├── machineAssetsService.js
│   ├── laborRoleService.js
│   ├── jobWorkChallanService.js
│   └── ...
│
├── pages/                     # Route-level page components
│   ├── Home.js                # Dashboard
│   ├── LoginPage.jsx
│   ├── BomPage.js
│   ├── WorkOrderPage.jsx
│   ├── InventoryItemPage.js
│   ├── SalesOrderPage.js
│   ├── ProductionSchedulePage.jsx
│   ├── RoleManagementPage.jsx
│   └── ... (23 pages total)
│
├── components/                # Reusable UI components by domain
│   ├── ui/                    # Shared: sidebar, toolbar, breadcrumb
│   ├── bom/                   # BOM components
│   ├── inventoryitem/         # Inventory item components
│   ├── production/            # Work order, scheduling, shop floor
│   ├── manufacturing/         # Routing, work center
│   ├── sales/                 # Sales order components
│   ├── contact/               # Contact management
│   ├── enquiry/               # Enquiry components
│   ├── quotation/             # Quotation components
│   └── config/                # Item code mapping
│
├── config/
│   └── env.js                 # API base URL resolution
│
├── utils/                     # Helpers
│   ├── formatters.js          # Date/number formatting
│   └── breadcrumbConfig.js    # Navigation breadcrumbs
│
└── App.js                     # Root router & auth provider
```

## Modules

### Authentication & Authorization

The app uses JWT tokens managed via React Context (`AuthContext`). The Axios interceptor automatically:
- Attaches the access token to every request
- Refreshes the token on 401/403 responses
- Redirects to login when the session expires

**11 system roles** control access:

| Role | Access |
|------|--------|
| `ROLE_SUPER_ADMIN` | Full system access |
| `ROLE_ADMIN` | Administrative operations |
| `ROLE_PRODUCTION_ADMIN` | Production module (full) |
| `ROLE_PRODUCTION_USER` | Production module (read + limited write) |
| `ROLE_INVENTORY_ADMIN` | Inventory module (full) |
| `ROLE_INVENTORY_USER` | Inventory module (read + limited write) |
| `ROLE_SALES_ADMIN` | Sales module (full) |
| `ROLE_SALES_USER` | Sales module (read + limited write) |
| `ROLE_PURCHASE_ADMIN` | Purchase module (full) |
| `ROLE_PURCHASE_USER` | Purchase module (read + limited write) |
| `ROLE_USER` | Basic access |

Routes are protected at three levels:
1. **ProtectedRoute** -- requires authentication
2. **RoleProtectedRoute** -- requires specific roles
3. **Component-level** -- `canAction()` and `canModule()` checks

### API Service Pattern

All API calls go through `apiService.js`, which provides:

```javascript
import api from '../services/apiService';

// GET with pagination
const response = await api.get('/inventory_item/all', { params: { page: 0, size: 20 } });

// POST with body
const result = await api.post('/bom', bomData);

// File upload
const uploaded = await api.postFile('/bom/upload/123', file);
```

Domain-specific services (e.g., `bomService.js`, `workOrderService.js`) wrap these calls with business-specific methods.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_BASE_URL` | Backend API URL | `http://localhost:8080/api` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server on port 3000 |
| `npm run build` | Production build to `build/` |
| `npm test` | Run tests with Jest |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick guidelines:
- Follow existing component patterns (pages delegate to components)
- Use MUI components for consistency
- Forms use Formik + Yup
- API calls go through service files, never directly from components
- Keep domain logic in the appropriate `components/[domain]/` folder

## Related

- **Backend API**: [siddhant2411/nextgenmanager](https://github.com/siddhant2411/nextgenmanager)

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <sub>Part of the <a href="https://github.com/siddhant2411/nextgenmanager">NextGenManager</a> manufacturing ERP ecosystem.</sub>
</p>
