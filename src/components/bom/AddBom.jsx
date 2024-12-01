import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dropdown, Form, Spinner, Alert, Button } from "react-bootstrap";
import apiService from "../../services/apiService";
import BomPositionTable from "./BomPositionTable";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const AddBom = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedParentItem, setSelectedParentItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    const [bomName, setBomName] = useState("");
    const [rowData, setRowData] = useState([]);
    const debounceTimeout = useRef(null);
    const navigate = useNavigate();
    const { bomId } = useParams(); // Get BOM ID from URL
    const location = useLocation();

    // Fetch inventory items
    const fetchInventoryItems = useCallback(
        async (search = "") => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: 0,
                    size: 5,
                    sortBy: "name",
                    sortDir: "asc",
                    search,
                };

                const data = await apiService.get("/inventory_item/all", params);
                setItems(data.content);
            } catch (err) {
                setError("Failed to fetch inventory items");
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // Fetch BOM details for editing

    const fetchBomDetails = useCallback(async () => {
        console.log(bomId)

        if (!bomId) return;

        try {
            setLoading(true);
            const data = await apiService.get(`/bom/${bomId}`);
            setBomName(data.bomName);
            setSelectedParentItem(data.parentInventoryItem);
            setRowData(
                data.childInventoryItems.map((child, index) => ({
                    ...child.childInventoryItem,
                    quantity: child.quantity,
                    position: child.position || (index + 1) * 10,
                }))
            );
        } catch (err) {
            setError("Failed to fetch BOM details");
        } finally {
            setLoading(false);
        }
    }, [bomId]);

    // Handle form submission
    const handleSubmit = async (childInventoryItems) => {
        if (!bomName.trim() || !selectedParentItem) {
            alert("BOM Name and Parent Inventory Item are required!");
            return;
        }

        const payload = {
            bomName,
            parentInventoryItem: {
                inventoryItemId: selectedParentItem.inventoryItemId,
            },
            childInventoryItems: childInventoryItems
                .filter((row) => row.itemCode) // Exclude empty rows
                .map((row) => ({
                    childInventoryItem: {
                        inventoryItemId: row.inventoryItemId,
                    },
                    quantity: parseInt(row.quantity, 10),
                    position: parseInt(row.position, 10),
                })),
        };

        try {
            if (bomId) {
                // Edit existing BOM
                await apiService.put(`/bom/${bomId}`, payload);
                alert("BOM updated successfully!");
            } else {
                // Create new BOM
                await apiService.post("/bom", payload);
                alert("BOM created successfully!");
            }

            navigate(-1); // Redirect to BOM list
        } catch (err) {
            console.error("Failed to save BOM:", err);
            alert("Failed to save BOM.");
        }
    };

    // Debounce search
    const handleSearchChange = (event) => {
        const query = event.target.value;
        setSearchQuery(query);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            fetchInventoryItems(query);
        }, 500);

        setIsDropDownOpen(query !== "");
    };

    // Handle parent item selection
    const handleParentItemSelect = (item) => {
        setSelectedParentItem(item);
        setSearchQuery(item.itemCode);
        setIsDropDownOpen(false);
    };

    // Initialize component
    useEffect(() => {
        fetchInventoryItems();
        fetchBomDetails(); // Load BOM details if editing
    }, [fetchBomDetails, location]);


    return (
        <div className={"add-bom"}>
            <div className="my-4 input-section">
                <div className="d-flex align-items-center my-search-section left-input">
                    <label htmlFor="item-search" className="item-label me-3">
                        Parent Item:
                    </label>
                    <Dropdown>
                        <Dropdown.Toggle variant="secondary" id="parent-item-dropdown">
                            {selectedParentItem
                                ? selectedParentItem.itemCode
                                : "Select Parent Item"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ width: "300px" }}>
                            <Form.Control
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="mb-2"
                            />
                            {loading && (
                                <Dropdown.Item disabled>
                                    <Spinner animation="border" size="sm" />
                                    Loading...
                                </Dropdown.Item>
                            )}
                            {error && <Dropdown.Item disabled>{error}</Dropdown.Item>}
                            {!loading &&
                                !error &&
                                items.map((item) => (
                                    <Dropdown.Item
                                        key={item.itemCode}
                                        onClick={() => handleParentItemSelect(item)}
                                    >
                                        <strong>{item.itemCode}</strong>
                                        <br />
                                        <small className="text-muted">{item.name}</small>
                                    </Dropdown.Item>
                                ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>

                <div className="d-flex align-items-center my-search-section right-input">
                    <label htmlFor="bom-name" className="item-label me-3">
                        BOM Name:
                    </label>
                    <input
                        id="bom-name"
                        type="text"
                        placeholder="Enter BOM name..."
                        value={bomName}
                        onChange={(e) => setBomName(e.target.value)}
                        className="form-control item-input"
                    />
                </div>
            </div>

            <div className="bom-position-table-wrapper">
                <BomPositionTable
                    onSubmit={handleSubmit}
                    initialData={rowData} // Pass initial data to BomPositionTable
                />
            </div>
        </div>
    );
};

export default AddBom;
