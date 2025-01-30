import React, {useRef, useState} from 'react';
import {useLocation, useNavigate} from "react-router-dom";

const Quotation = () => {

    const [loading, setLoading] = useState(false);
    const [quotationList, setQuotationList] = useState([]);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({
        companyName: '',
        qtnNo: '',
        qtnDate:'',
        enqNo:'',
        enqDate: '',
        netAmount:'',
        totalAmount:''
    });

    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);
    return (
        <div>
            quotation
        </div>
    );
};

export default Quotation;
