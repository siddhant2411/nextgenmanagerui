import React, {useCallback, useEffect, useState} from 'react';
import apiService from "../../services/apiService";
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import BomList from "./BomList";
import "./style/bom.css"
import AddBom from "./AddBom";
import {Button} from "react-bootstrap";
const Bom = () => {
    const [bomList,setBomList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();
    const [columnData, setColumnData] = useState([]);

    const fetchBomList = useCallback(async (page = 1, sort = 'id', dir = 'asc', search = '') => {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: itemsPerPage,
                sortBy: sort,
                sortDir: dir,
                search,
            };

            const data = await apiService.get('/bom/all', params);
            setBomList(data.content);
            setTotalPages(data.totalPages);
            setCurrentPage(page);

            console.log(data.content);

        } catch (err) {
            setError('Failed to fetch bom list');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);


    const handleSortChange = (sortField) => {
        const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(sortField);
        setSortDir(newSortDir);
        fetchBomList(currentPage, sortField, newSortDir, searchQuery);
    };


    const performSearch = () => {
        fetchBomList(1, sortBy, sortDir, searchQuery);
    };

    useEffect(() => {
        console.log(location.pathname);
        if(location.pathname === '/bom') {
            fetchBomList()
        }
    }, [location]);

    const handlePageChange = (page) => {
        bomList(page, sortBy, sortDir, searchQuery);
    };
    const deleteBom = async (id) => {
        try {
            await apiService.delete(`/bom/${id}`);
            alert('Item deleted successfully!');
            fetchBomList(currentPage, sortBy, sortDir, searchQuery);
        } catch (err) {
            alert('Failed to delete item. Please try again.');
            console.error(err);
        }
    };


    if (loading) {
        return <div>
            <div className="text-center">
                <div className="spinner-border" role="status">
                    {/*<span className="sr-only">Loading...</span>*/}
                </div>
            </div>

        </div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    const handleAddNewItemClick=()=>{
        navigate('add');
    }
    return (

        <div className={"bom"}>
            <Routes>
                <Route path="/" element={
                    <>
                        <Button
                        className="add-item-btn btn btn-primary"
                        onClick={handleAddNewItemClick}
                    >
                        Create Item
                    </Button>
                        <BomList bomList={bomList}
                                 sortBy={sortBy}
                                 onSortChange={handleSortChange}
                                 sortDir={sortDir}
                                 searchQuery={searchQuery}
                                 onDeleteBom={deleteBom}
                                 currentPage={currentPage}
                                 totalPages={totalPages}
                                 onPageChange={handlePageChange}
                                 setSearchQuery={setSearchQuery}
                                 onSearchSubmit={performSearch}
                                 fetchBomList={fetchBomList}
                        />
                    </>
                } />


                <Route path="/add" element={
                    <AddBom searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onSearchSubmit={performSearch}
                            bomList={bomList}
                            fetchBomList={fetchBomList}


                    />
                } />

                <Route path="/edit/:bomId" element={
                    <AddBom/>
                } />
            </Routes>
            
        </div>
    );
};

export default Bom;
