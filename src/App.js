import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import InventoryItem from './components/inventoryitem/InventoryItem';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from "./pages/Home";
import BomPage from "./pages/BomPage";
import InventoryPage from "./pages/InventoryPage";
import Sidebar from "./components/sidebar/Sidebar";
import Contact from "./components/contact/Contact";
import EnquiryPage from "./pages/EnquiryPage";
import QuotationPage from "./pages/QuotationPage";
import WorkOrderPage from './pages/WorkOrderPage';


function App() {
    return (

        <div className='app-class'>
            <Router>
                <div style={{ display: "flex" }} >
                    <Sidebar />
                    <main style={{ flexGrow: 1, padding: "16px" }}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/inventory-item/*" element={<InventoryItem />} />
                            <Route path="/bom/*" element={<BomPage />} />
                            <Route path="/inventory/*" element={<InventoryPage />} />
                            <Route path="/contact/*" element={<Contact />} />
                            <Route path={"/enquiry/*"} element={<EnquiryPage />} />
                            <Route path={"/quotation/*"} element={<QuotationPage />} />
                            <Route path={"/production/work-order/*"} element={<WorkOrderPage />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </div>

    )
        ;
}

export default App;
