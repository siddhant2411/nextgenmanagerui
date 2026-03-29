import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import InventoryItem from "./components/inventoryitem/InventoryItem";
import Home from "./pages/Home";
import BomPage from "./pages/BomPage";
import InventoryPage from "./pages/InventoryPage";
import Sidebar from "./components/ui/sidebar/Sidebar";
import Contact from "./components/contact/Contact";
import EnquiryPage from "./pages/EnquiryPage";
import QuotationPage from "./pages/QuotationPage";
import WorkOrderPage from "./pages/WorkOrderPage";
import ProductionJobPage from "./pages/ProductionJobPage";
import MachineAssetsPage from "./pages/MachineAssetsPage";
import ShopFloorPage from "./pages/ShopFloorPage";
import LaborRolePage from "./pages/LaborRolePage";
import HolidayCalendarPage from "./pages/HolidayCalendarPage";
import ItemCodeMappingPage from "./pages/ItemCodeMappingPage";
import SalesOrder from "./components/sales/salesorder/SalesOrder";
import Toolbar from "./components/ui/toolbar/Toolbar";
import ManufacturingPage from "./pages/ManufacturingPage";
import RoutingPage from "./pages/RoutingPage";
import ProductionSchedulePage from "./pages/ProductionSchedulePage";
import MakeBuyAnalysisPage from "./pages/MakeBuyAnalysisPage";
import JobWorkChallanPage from "./pages/JobWorkChallanPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import RoleProtectedRoute from "./auth/RoleProtectedRoute";
import {
    INVENTORY_ACCESS_ROLES,
    ITEM_CODE_MAPPING_ACCESS_ROLES,
    PRODUCTION_ACCESS_ROLES,
    SALES_ACCESS_ROLES,
    USER_MANAGEMENT_ACCESS_ROLES,
} from "./auth/roles";
import UserCreatePage from "./pages/UserCreatePage";
import RoleManagementPage from "./pages/RoleManagementPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import AuthStatusSnackbar from "./components/ui/feedback/AuthStatusSnackbar";

function AppShell() {
    const isSmallScreen = useMediaQuery("(max-width:900px)");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => localStorage.getItem("ngm.sidebar.collapsed") === "true"
    );

    const handleToggleSidebar = () => {
        if (isSmallScreen) {
            setMobileSidebarOpen(true);
            return;
        }
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("ngm.sidebar.collapsed", next);
            return next;
        });
    };

    const handleCloseSidebar = () => {
        setMobileSidebarOpen(false);
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar
                isSmallScreen={isSmallScreen}
                mobileOpen={mobileSidebarOpen}
                onMobileClose={handleCloseSidebar}
                collapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => {
                    const next = !prev;
                    localStorage.setItem("ngm.sidebar.collapsed", next);
                    return next;
                })}
            />

            <main style={{ flexGrow: 1 }}>
                <Toolbar showMenuButton onMenuClick={handleToggleSidebar} />
                <AuthStatusSnackbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Home />} />
                    <Route
                        path="/inventory-item/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={ITEM_CODE_MAPPING_ACCESS_ROLES}
                                deniedMessage="You are not authorized for product master."
                            >
                                <InventoryItem />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/bom/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for BOM."
                            >
                                <BomPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/manufacturing/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for manufacturing."
                            >
                                <ManufacturingPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/inventory/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={INVENTORY_ACCESS_ROLES}
                                deniedMessage="You are not authorized for inventory."
                            >
                                <InventoryPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/contact/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={SALES_ACCESS_ROLES}
                                deniedMessage="You are not authorized for sales contacts."
                            >
                                <Contact />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/enquiry/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={SALES_ACCESS_ROLES}
                                deniedMessage="You are not authorized for enquiries."
                            >
                                <EnquiryPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/quotation/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={SALES_ACCESS_ROLES}
                                deniedMessage="You are not authorized for quotations."
                            >
                                <QuotationPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/work-order/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for work orders."
                            >
                                <WorkOrderPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/make-or-buy/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for make or buy analysis."
                            >
                                <MakeBuyAnalysisPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/production-job/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for production jobs."
                            >
                                <ProductionJobPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/shop-floor/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for the shop floor."
                            >
                                <ShopFloorPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/machine-assets/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for machine assets."
                            >
                                <MachineAssetsPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/labor-role/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for labor roles."
                            >
                                <LaborRolePage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/schedule/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for production schedules."
                            >
                                <ProductionSchedulePage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/calendar/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for holiday calendars."
                            >
                                <HolidayCalendarPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/production/job-work-challan/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for job work challans."
                            >
                                <JobWorkChallanPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/manufacturing/routing/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={PRODUCTION_ACCESS_ROLES}
                                deniedMessage="You are not authorized for routing."
                            >
                                <RoutingPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/sales/sales-order/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={SALES_ACCESS_ROLES}
                                deniedMessage="You are not authorized for sales orders."
                            >
                                <SalesOrder />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/config/item-code-mapping/*"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={ITEM_CODE_MAPPING_ACCESS_ROLES}
                                deniedMessage="You are not authorized for item code mapping."
                            >
                                <ItemCodeMappingPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/superadmin/users"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={USER_MANAGEMENT_ACCESS_ROLES}
                                deniedMessage="User management requires admin access."
                            >
                                <UserCreatePage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route
                        path="/superadmin/roles"
                        element={
                            <RoleProtectedRoute
                                allowedRoles={USER_MANAGEMENT_ACCESS_ROLES}
                                deniedMessage="Role management requires admin access."
                            >
                                <RoleManagementPage />
                            </RoleProtectedRoute>
                        }
                    />
                    <Route path="/account/settings" element={<AccountSettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    return (
        <div
            className="app-class"
            style={{
                fontFamily:
                    'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            }}
        >
            <Router>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <PublicOnlyRoute>
                                    <LoginPage />
                                </PublicOnlyRoute>
                            }
                        />
                        <Route
                            path="*"
                            element={
                                <ProtectedRoute>
                                    <AppShell />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </AuthProvider>
            </Router>
        </div>
    );
}

export default App;
