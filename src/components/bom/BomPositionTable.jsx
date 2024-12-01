import React, {useState, useRef, useCallback, useEffect} from "react";
import { Table, Dropdown, Form, Spinner, Alert, Button } from "react-bootstrap";
import apiService from "../../services/apiService";
import {useLocation} from "react-router-dom";

const BomPositionTable = ({ onSubmit,initialData = []  }) => {
    const columns = [
        "Pos",
        "Item Code",
        "Name",
        "Qty",
        "UOM",
        "Type",
        "Dim",
        "Size 1",
        "Size 2",
        "Remarks",
        "Action"
    ];

    const [searchQuery, setSearchQuery] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const debounceTimeout = useRef(null);
    const [rowData, setRowData] = useState([]);
    const [noOfRows, setNoOfRows] = useState(0);
    const location = useLocation();
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

    useEffect(() => {
        setRowData(initialData);
        setNoOfRows(initialData.length || 0);
    }, [initialData]);

    const handleSearchChange = (event) => {
        const query = event.target.value;
        setSearchQuery(query);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            fetchInventoryItems(query);
        }, 500); // Debounce for 500ms
    };

    const handleItemSelect = (item, rowIndex) => {
        setRowData((prev) => {
            const updatedData = [...prev];
            updatedData[rowIndex] = {
                ...item,
                quantity: 1,
                position: (rowIndex+1)*10// Default quantity
            };
            return updatedData;
        });
        if (rowIndex === noOfRows) {
            setNoOfRows(noOfRows + 1);
        }
    };

    const handleRemoveRow = (key) => {
        console.log(`Removing row at index: ${key}`);

        // Filter out the row at the given key
        const updatedRows = rowData.filter((_, index) => index !== key);

        // Recalculate positions for the remaining rows
        const changedRowPosition = updatedRows.map((row, index) => ({
            ...row,
            position: (index + 1) * 10, // Update position based on (index + 1) * 10
        }));

        console.log(changedRowPosition);

        // Update the state or perform any additional actions
        setRowData(changedRowPosition);
    };
    useEffect(() => {
        if(location.pathname === '/bom/add') {
            fetchInventoryItems();
        }
    },[location])
    return (
        <div>
            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column} style={{ cursor: "pointer" }}>
                            {column}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {Array.from({ length: noOfRows + 1 }, (_, rowIndex) => (
                    <tr key={rowIndex}>
                        <td>{(rowIndex + 1) * 10}</td>
                        <td>
                            <Dropdown>
                                <Dropdown.Toggle
                                    variant="secondary"
                                    id={`dropdown-${rowIndex}`}
                                >
                                    {rowData[rowIndex]?.itemCode || "Select Item"}
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
                                                onClick={() =>
                                                    handleItemSelect(item, rowIndex)
                                                }
                                            >
                                                <strong>{item.itemCode}</strong>
                                                <br />
                                                <small className="text-muted">
                                                    {item.name}
                                                </small>
                                            </Dropdown.Item>
                                        ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </td>
                        <td>{rowData[rowIndex]?.name || ""}</td>
                        <td>
                            <Form.Control
                                type="number"
                                min="1"
                                value={rowData[rowIndex]?.quantity || "1"}
                                onChange={(e) =>
                                    setRowData((prev) => {
                                        const updatedData = [...prev];
                                        updatedData[rowIndex] = {
                                            ...updatedData[rowIndex],
                                            quantity: e.target.value,
                                        };
                                        return updatedData;
                                    })
                                }
                                style={{"width":"80px"}}
                            />
                        </td>
                        <td>{rowData[rowIndex]?.uom || ""}</td>
                        <td>{rowData[rowIndex]?.itemType || ""}</td>
                        <td>{rowData[rowIndex]?.dimension || ""}</td>
                        <td>{rowData[rowIndex]?.size1 || ""}</td>
                        <td>{rowData[rowIndex]?.size2 || ""}</td>
                        <td>{rowData[rowIndex]?.remarks || ""}</td>
                        <td> <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveRow(rowIndex)}
                        >
                            Remove
                        </Button></td>
                    </tr>
                ))}
                </tbody>
            </Table>
            <Button
                variant="primary"
                className="mt-3"
                onClick={()=>onSubmit(rowData)}
                disabled={loading}
            >
                Submit BOM
            </Button>
        </div>
    );
};

export default BomPositionTable;
