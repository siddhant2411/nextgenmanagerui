import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import InventoryItem from './components/inventoryitem/InventoryItem';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from "./pages/Home";
import BomPage from "./pages/BomPage";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/inventory-item/*" element={<InventoryItem />} />
                <Route path="/bom/*" element={<BomPage/>} />
            </Routes>
        </Router>
    );
}

export default App;
