# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Paper Trading ERP web application built with React. It manages the complete lifecycle of a paper trading business including purchase orders, inventory (rolls), sales, and accounting.

## Development Commands

### Running the Application
```bash
npm start              # Start dev server at http://localhost:3000
npm test              # Run tests in watch mode
npm run build         # Create production build in ./build
```

### Testing
- Tests use Jest and React Testing Library
- Test files use `.test.js` extension
- Located alongside their source files

## Architecture

### Technology Stack
- **Frontend**: React 19, Material-UI (MUI) v5
- **Routing**: React Router v6 with lazy loading
- **State Management**: Context API with useReducer (AppContext)
- **API Communication**: Axios with interceptors
- **Data Grid**: MUI X DataGrid
- **Forms**: React Hook Form
- **Date Handling**: date-fns with MUI Date Pickers
- **Charts**: Recharts
- **Notifications**: Notistack

### Project Structure

```
src/
├── components/common/   # Reusable UI components
│   ├── Layout.js       # Main layout with sidebar navigation
│   ├── DataTable.js    # Reusable data grid wrapper
│   ├── ConfirmDialog.js
│   ├── LoadingSpinner.js
│   └── ErrorBoundary.js
├── contexts/
│   └── AppContext.js   # Global state management
├── hooks/
│   ├── useApi.js       # API call wrapper with loading/error states
│   ├── useDebounce.js
│   └── usePagination.js
├── pages/              # Route components
│   ├── Dashboard.js
│   ├── masters/        # Master data (Categories, Products, SKUs, Suppliers, Customers)
│   ├── purchase/       # Purchase Orders, GRNs, Purchase Invoices
│   ├── inventory/      # Rolls, Unmapped Rolls, Stock Summary
│   ├── sales/          # Sales Orders, Delivery Challans, Sales Invoices (placeholder)
│   └── accounting/     # Payments, Vouchers, Ledgers (placeholder)
├── routes/
│   └── AppRoutes.js    # Route configuration with lazy loading
├── services/           # API service layers
│   ├── api.js          # Axios instance with interceptors
│   ├── masterService.js
│   ├── purchaseService.js
│   └── inventoryService.js
└── utils/
    ├── formatters.js   # Currency and number formatting
    └── validators.js   # Form validation helpers
```

### Key Design Patterns

#### 1. State Management (AppContext)
- Centralized state in `contexts/AppContext.js`
- Uses reducer pattern for predictable state updates
- Provides `useApp()` hook for accessing state and dispatch
- Includes utility functions: `setLoading()`, `setError()`, `showNotification()`
- State organized by domain: `masters`, `purchase`, `sales`, `inventory`, `accounting`, `filters`

#### 2. API Service Layer
- Base axios instance in `services/api.js` with interceptors
- Request interceptor: Add common headers
- Response interceptor: Extract data, handle errors uniformly
- Domain-specific services (masterService, purchaseService, etc.) export object with methods
- API base URL from environment: `REACT_APP_API_URL` (default: http://localhost:5000/api/v1)

#### 3. Custom Hooks
- `useApi(apiFunc, immediateCall)`: Wraps API calls with loading/error states
  - Returns `{ data, loading, error, execute }`
  - Automatically shows error notifications via AppContext
  - Set `immediateCall=true` to call on mount

#### 4. Reusable Components
- **Layout**: Sidebar navigation with collapsible menu groups, responsive drawer
- **DataTable**: Wraps MUI DataGrid with search, actions (view/edit/delete), pagination
  - Props: `columns`, `rows`, `loading`, `onAdd`, `onEdit`, `onDelete`, `onView`, etc.
- **ConfirmDialog**: Confirmation dialogs for destructive actions
- **LoadingSpinner**: Centered loading indicator

#### 5. Routing Strategy
- All page components lazy loaded via `React.lazy()`
- Wrapped in `<Suspense>` with LoadingSpinner fallback
- Nested routes under Layout component
- Many routes currently commented out (placeholders for future features)

### Theme Configuration
- Custom MUI theme defined in `App.js`
- Primary color: #1976d2 (blue)
- Secondary color: #dc004e (pink)
- Button text transform disabled globally
- Date picker localization with date-fns

### API Response Structure
The backend is expected to return responses in this format:
- Success: `{ data: {...} }`
- Error: `{ error: { message: "...", code: "..." } }`

API interceptor extracts `response.data` for success cases and normalizes errors to `{ message, code, status }`.

### Environment Variables
Required in `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_COMPANY_NAME=Paper Trading ERP
```

## Domain-Specific Notes

### Paper Trading Business Logic
- **Rolls**: Physical inventory units (paper rolls) with SKU mapping
- **Unmapped Rolls**: Rolls received but not yet mapped to SKUs
- **GRN**: Goods Receipt Note - records physical receipt of purchased goods
- **Landed Cost**: Additional costs (freight, duties) allocated to purchase invoices
- **Credit Management**: Customers can be blocked if credit limits exceeded

### Service Method Patterns
All services follow RESTful patterns:
- `getXs(params)` - List with query params
- `getX(id)` - Get by ID
- `createX(data)` - POST create
- `updateX(id, data)` - PUT update
- `deleteX(id)` - DELETE

State-changing operations (approve, close, cancel, post, etc.) use POST to action endpoints:
- `approvePurchaseOrder(id)` → POST `/purchase-orders/:id/approve`
- `postGRN(id)` → POST `/grns/:id/post`

## Conventions

### File Naming
- Components: PascalCase (e.g., `DataTable.js`)
- Utilities/Services: camelCase (e.g., `formatters.js`, `masterService.js`)
- Test files: `ComponentName.test.js`

### Component Structure
- Functional components with hooks
- Props destructured in function signature
- Default exports for components
- Named exports for utilities/services

### State Updates
- Use AppContext dispatch for global state changes
- Action types follow pattern: `SET_<ENTITY>`, `SET_<ENTITY>S`, `SET_FILTERS`, etc.
- For component-local state, use `useState`

### Error Handling
- API errors automatically show notifications via `useApi` hook
- For custom error handling, catch exceptions from service methods
- Use `showNotification(message, type)` for user feedback

### Data Grid IDs
DataTable component uses `getRowId={(row) => row._id || row.id}` to handle both MongoDB-style `_id` and standard `id` fields.

## Adding New Features

### Adding a New Page
1. Create component in appropriate `pages/` subdirectory
2. Add lazy import in `routes/AppRoutes.js`
3. Add route in `<Routes>` section
4. Add menu item in `components/common/Layout.js` `menuItems` array
5. Create service methods if API calls needed
6. Add state management in AppContext if needed

### Adding a New Service
1. Create service file in `services/` directory
2. Import `api` from `./api.js`
3. Export object with methods following RESTful patterns
4. Use in pages via `useApi` hook

### Adding Global State
1. Add to `initialState` in `contexts/AppContext.js`
2. Add reducer case in `reducer` function
3. Optionally add helper function in `AppProvider`
