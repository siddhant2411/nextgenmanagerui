import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import InventoryItem from './components/inventoryitem/InventoryItem';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { useMediaQuery } from '@mui/material';
import Home from "./pages/Home";
import BomPage from "./pages/BomPage";
import InventoryPage from "./pages/InventoryPage";
import Sidebar from "./components/ui/sidebar/Sidebar";
import Contact from "./components/contact/Contact";
import EnquiryPage from "./pages/EnquiryPage";
import QuotationPage from "./pages/QuotationPage";
import WorkOrderPage from './pages/WorkOrderPage';
import ProductionJobPage from './pages/ProductionJobPage';
import ItemCodeMappingPage from './pages/ItemCodeMappingPage';
import SalesOrder from './components/sales/salesorder/SalesOrder';
import Toolbar from './components/ui/toolbar/Toolbar';
import ManufacturingPage from './pages/ManufacturingPage';
import RoutingPage from './pages/RoutingPage';

function App() {
    const isSmallScreen = useMediaQuery('(max-width:900px)');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleToggleSidebar = () => {
        if (isSmallScreen) {
            setMobileSidebarOpen(true);
            return;
        }
        setIsSidebarCollapsed((prev) => !prev);
    };

    const handleCloseSidebar = () => {
        setMobileSidebarOpen(false);
    };

    return (
        <div className='app-class' style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
            <Router>
                <div style={{ display: 'flex' }}>
                    <Sidebar
                        isSmallScreen={isSmallScreen}
                        mobileOpen={mobileSidebarOpen}
                        onMobileClose={handleCloseSidebar}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                    />
                    <main style={{ flexGrow: 1 }}>
                        <Toolbar
                            showMenuButton
                            onMenuClick={handleToggleSidebar}
                        />
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/inventory-item/*" element={<InventoryItem />} />
                            <Route path="/bom/*" element={<BomPage />} />
                            <Route path='/manufacturing/*' element={<ManufacturingPage />} />
                            <Route path="/inventory/*" element={<InventoryPage />} />
                            <Route path="/contact/*" element={<Contact />} />
                            <Route path={'/enquiry/*'} element={<EnquiryPage />} />
                            <Route path={'/quotation/*'} element={<QuotationPage />} />
                            <Route path={'/production/work-order/*'} element={<WorkOrderPage />} />
                            <Route path={'/production/production-job/*'} element={<ProductionJobPage />} />
                            <Route path={'/manufacturing/routing/*'} element={<RoutingPage />} />
                            <Route path={'/sales/sales-order/*'} element={<SalesOrder />} />
                            <Route path={'/config/item-code-mapping/*'} element={<ItemCodeMappingPage />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </div>
    );
}

export default App;
