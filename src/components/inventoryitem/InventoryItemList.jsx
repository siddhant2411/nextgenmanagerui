import React, {useEffect, useRef} from 'react';
import {Pagination, Table, Button, Form, InputGroup} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const InventoryItemList = ({
                               inventoryItems,
                               setInventoryItems,
                               currentPage,
                               totalPages,
                               onPageChange,
                               onSortChange,
                               sortBy,
                               sortDir,
                               onDeleteItem,
                               searchQuery,
                               setSearchQuery,
                               onSearchSubmit,
                               fetchInventoryItems
                           }) => {
    const navigate = useNavigate();
    const columnMapping = {
        itemCode: 'Item Code',
        name: 'Name',
        hsnCode: 'HSN Code',
        uom: 'UOM',
        itemType: 'Type',
        dimension: 'Dimension',
        size1: 'Size 1',
        size2: 'Size 2',
        revision: 'Revision',
        remarks: 'Remarks',
        basicMaterial: 'Basic Material',
    };
    const debounceTimeout = useRef(null);
    const excludedColumns = ['creationDate', 'updatedDate', 'deletedDate', 'inventoryItemId','inventoryItemAttachmentList'];
    const columns = Object.keys(inventoryItems[0] || {}).filter(
        (column) => !excludedColumns.includes(column)
    );

    const handleEditClick = (id) => {
        navigate(`/inventory-item/edit/${id}`);
    };

    const handleDeleteClick = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDeleteItem(id);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            onSearchSubmit();
        }
    };
    const handleChange = (event) => {
        const query = event.target.value;
        setSearchQuery(query);

        // Clear the previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set a new timeout to call the API after 1 second
        debounceTimeout.current = setTimeout(() => {

                fetchInventoryItems(1, sortBy, sortDir, query);




        }, 1000); // 1-second delay
    };

    useEffect(() => {
        return () => {
            // Cleanup the timeout on component unmount
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);
    return (
        <div>

            <div className={"search-bar-section"}>
                <InputGroup className="mb-3">
                    <Form.Control
                        type="text"
                        placeholder="Search inventory items..."
                        value={searchQuery}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                    />
                    <Button variant="outline-secondary" onClick={onSearchSubmit}>
                        Search
                    </Button>
                </InputGroup>
            </div>
            {inventoryItems.length > 0 &&<>
            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column}
                            onClick={() => onSortChange(column)}
                            style={{ cursor: 'pointer' }}
                        >
                            {columnMapping[column] || column}
                            {sortBy === column && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </th>
                    ))}
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {inventoryItems.map((item) => (
                    <tr key={item.inventoryItemId}>
                        {columns.map((column) => (
                            <td key={column}>{item[column]}</td>
                        ))}
                        <td>
                            <Button
                                variant="info"
                                size="sm"
                                onClick={() => handleEditClick(item.inventoryItemId)}
                            >
                                Edit
                            </Button>{' '}
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteClick(item.inventoryItemId)}
                            >
                                Delete
                            </Button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
            {/* Pagination Controls */}
            <Pagination className="justify-content-center">
                <Pagination.First onClick={() => onPageChange(1)} disabled={currentPage === 1} />
                <Pagination.Prev
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                />
                {[...Array(totalPages).keys()].map((page) => (
                    <Pagination.Item
                        key={page + 1}
                        active={page + 1 === currentPage}
                        onClick={() => onPageChange(page + 1)}
                    >
                        {page + 1}
                    </Pagination.Item>
                ))}
                <Pagination.Next
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                />
                <Pagination.Last
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                />
            </Pagination>

</>}


        </div>
    );
};

export default InventoryItemList;
