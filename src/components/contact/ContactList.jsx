import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Box,
    Typography,
    Pagination
} from '@mui/material';
// import PaginationComponent from './PaginationComponent';
import { useNavigate } from 'react-router-dom';
import {DeleteForever, EditOutlined} from "@mui/icons-material";
import apiService from "../../services/apiService";

const ContactList = ({ contacts,filters,handleSort,currentPage,totalPages, handlePageChange, handleFilterChange,handleDelete }) => {
    const navigate = useNavigate();

    const handleEdit = (id) => {
        navigate(`/contact/edit/${id}`);
    };


    const columnHeader = [{
        key: 'companyName',
        value: "Company"
    },{
        key: "gstNumber",
        value: "GST Number"
    },{
        key: "state",
        value: "State"
    },{
        key: "emailId",
        value: "Email ID"
    },{
        key: "contactNumber",
        value: "Contact Number"
    },{
        key: "action",
        value: "Action"
    }
    ]
    return (
        <Box>
            <Typography variant="h4" gutterBottom>Company Details</Typography>


            <Button variant="contained" color="primary"   style={{"float": "right","marginBottom":"2rem"}} onClick={() => navigate('add')}>
                Add New Company
            </Button>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columnHeader.map((column, index) => (
                                <TableCell
                                    align="center"
                                    sx={{
                                        fontWeight: 'bold',
                                        backgroundColor: '#f5f5f5',
                                        color: '#333',
                                        fontSize: '1rem',
                                        borderBottom: '2px solid #ccc',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() =>
                                    {["companyName","gstNumber"].includes(column.key)&& handleSort(column.key)}}
                                >
                                    {column.value}

                            </TableCell>))}
                        </TableRow>
                    </TableHead>
                    <TableHead>
                        <TableRow>
                            {columnHeader.map((columnHead, index) => (
                                <TableCell key={index} align="center">
                                    {['gstNumber','companyName'].includes(columnHead.key) &&
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            placeholder={`Filter by ${columnHead.value}`}
                                            value={filters[columnHead.key]}
                                            onChange={(e) => handleFilterChange(columnHead.key, e.target.value)}
                                            sx={{ width: '80%' }}
                                        />
                                    }
                                </TableCell>
                                ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {contacts.map((contact,rowIndex) => {
                            // Extract the first person's details if available
                            const firstPerson = contact.personDetails[0] || {};
                            const firstAddress = contact.addresses[0] || {};

                            return (
                                <TableRow key={contact.id}  sx={{
                                    backgroundColor: rowIndex % 2 === 0 ? '#fafafa' : '#fff',
                                    '&:hover': {
                                        backgroundColor: '#f1f1f1',
                                    },
                                }}>
                                    <TableCell
                                                 align="center"
                                                 sx={{
                                                     fontSize: '0.9rem',
                                                     color: '#555',
                                                     borderBottom: '1px solid #eee',
                                                 }}>{contact.companyName}</TableCell>
                                    <TableCell align="center"  sx={{fontSize: '0.9rem',color: '#555',borderBottom: '1px solid #eee'}}>{contact.gstNumber}</TableCell>
                                    <TableCell align="center"  sx={{fontSize: '0.9rem',color: '#555',borderBottom: '1px solid #eee'}}>{firstAddress.state || 'N/A'}</TableCell>
                                    <TableCell align="center"  sx={{fontSize: '0.9rem',color: '#555',borderBottom: '1px solid #eee'}}>{firstPerson.emailId || 'N/A'}</TableCell>
                                    <TableCell align="center"  sx={{fontSize: '0.9rem',color: '#555',borderBottom: '1px solid #eee'}}>{firstPerson.phoneNumber || 'N/A'}</TableCell>
                                    <TableCell align="center"  sx={{fontSize: '0.9rem',color: '#555',borderBottom: '1px solid #eee'}}>
                                        <Button onClick={() => handleEdit(contact.id)}><EditOutlined /></Button>
                                        <Button color="secondary" onClick={() => handleDelete(contact.id)}><DeleteForever /></Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default ContactList;
