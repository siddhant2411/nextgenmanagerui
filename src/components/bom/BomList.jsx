import React, {useRef} from 'react';
import {Button, Form, InputGroup, Pagination, Table} from "react-bootstrap";
import {useNavigate} from "react-router-dom";


const BomList = ({bomList,
                 sortBy,
                 onSortChange,
                 sortDir,
                 searchQuery,
                     onDeleteBom,
                     currentPage,
                     totalPages,
                     onPageChange,
                     setSearchQuery,
                     onSearchSubmit,
                     fetchBomList}) => {

    const navigate = useNavigate();
    const debounceTimeout = useRef(null);


    const columnMapping ={
        bomName:"BOM Name",
        itemCode:"Item Code",
        name:"Item Name"
    }
    const excludedColumns = ["id"]
    const columns = Object.keys(bomList[0] || {}).filter(
        (column) => !excludedColumns.includes(column)
    );
    const handleEditClick = (id) => {
        navigate(`/bom/edit/${id}`);
    };

    const handleDeleteClick = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDeleteBom(id);
        }
    };

    const handleChange = (event) => {
        const query = event.target.value;
        console.log(event.target)
        setSearchQuery(query);

        // Clear the previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set a new timeout to call the API after 1 second
        debounceTimeout.current = setTimeout(() => {

            fetchBomList(1, sortBy, sortDir, query);

        }, 1000); // 1-second delay
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            onSearchSubmit();
        }
    };
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

            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column}
                            onClick={() => onSortChange(column)}
                            style={{cursor: 'pointer'}}
                        >
                            {columnMapping[column] || column}
                            {sortBy === column && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </th>
                    ))}
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>{bomList.map((item) => (
                    <tr key={item.id}>
                        {columns.map((column) => (
                            <td key={column}>{item[column]}</td>
                        ))}
                        <td>
                            <Button
                                variant="info"
                                size="sm"
                                onClick={() => handleEditClick(item.id)}
                            >
                                Edit
                            </Button>{' '}
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteClick(item.id)}
                            >
                                Delete
                            </Button>
                        </td>
                    </tr>
                ))}</tbody>
            </Table>

            {/* Pagination Controls */}
            <Pagination className="justify-content-center">
                <Pagination.First onClick={() => onPageChange(1)} disabled={currentPage === 1}/>
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
        </div>
    );
};

export default BomList;
