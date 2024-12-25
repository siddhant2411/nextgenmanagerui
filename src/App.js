import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import InventoryItem from './components/inventoryitem/InventoryItem';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from "./pages/Home";
import BomPage from "./pages/BomPage";
import InventoryPage from "./pages/InventoryPage";
import Sidebar from "./components/sidebar/Sidebar";
import Contact from "./components/contact/Contact";


function App() {
    return (

        <Router>
            <div style={{display: "flex"}}>
                <Sidebar/>
                <main style={{flexGrow: 1, padding: "16px"}}>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/inventory-item/*" element={<InventoryItem/>}/>
                        <Route path="/bom/*" element={<BomPage/>}/>
                        <Route path="/inventory/*" element={<InventoryPage/>}/>
                        <Route path="/contact/*" element={<Contact />}/>
                    </Routes>
                </main>
            </div>
        </Router>

)
    ;
}

export default App;
