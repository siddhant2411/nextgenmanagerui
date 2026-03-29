# Contributing to NextGenManager UI

Thank you for your interest in contributing! This guide will help you get started with the frontend.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nextgenmanagerui.git
   cd nextgenmanagerui
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install and run**:
   ```bash
   cp .env.example .env
   npm install
   npm start
   ```

You'll also need the [backend](https://github.com/siddhant2411/nextgenmanager) running for the API.

## Code Guidelines

### Component Organization

- **Pages** (`src/pages/`) -- Route-level containers that compose components
- **Components** (`src/components/[domain]/`) -- Reusable UI organized by business domain
- **Services** (`src/services/`) -- API integration, one file per domain
- **Shared UI** (`src/components/ui/`) -- Sidebar, toolbar, breadcrumbs, and other shared elements

### Conventions

- Use **Material-UI** components for consistency (buttons, tables, dialogs, data grids)
- Use **Formik + Yup** for all forms with validation
- API calls go through **service files** -- never call Axios directly from components
- Keep **domain logic** in the matching `components/[domain]/` folder
- Use **functional components** with hooks (no class components)
- Follow existing naming: `PascalCase.jsx` for components, `camelCase.js` for utilities

### Authentication

- Auth state comes from `useAuth()` hook (see `src/auth/AuthContext.jsx`)
- Role checks: `hasRole()`, `hasAnyRole()`, `canModule()`, `canAction()`
- Protect routes with `ProtectedRoute` or `RoleProtectedRoute`
- API tokens are managed automatically by the Axios interceptor

### Styling

The project uses a mixed styling approach:
- **Material-UI `sx` prop** for component-level styles
- **Tailwind CSS** utility classes for layout and spacing
- **CSS files** in `style/` subdirectories for component-specific styles

When adding new styles, match what the surrounding code uses.

## Pull Request Process

1. Keep PRs focused -- one feature or fix per PR
2. Test in the browser before submitting
3. Make sure `npm run build` succeeds
4. Link any related issues in the PR description
5. Add screenshots for UI changes

## Good First Issues

Look for issues labeled `good first issue`. Some areas that always welcome help:

- Improving mobile responsiveness
- Adding loading states and error handling
- UI/UX refinements
- Accessibility improvements
- Adding unit tests

## Questions?

Open a [Discussion](https://github.com/siddhant2411/nextgenmanagerui/discussions) or comment on the relevant issue.

---

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
