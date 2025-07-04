import {
    Autocomplete,
    Box,
    Table,
    TableContainer,
    Typography,
    TableHead, TableCell, TextField, TableRow, TableBody, Paper,
    IconButton
} from '@mui/material';
import apiService from '../../services/apiService';
import React, { useRef, useState } from 'react'
import { DeleteOutline } from '@mui/icons-material';
import { searchJobs } from '../../services/commonAPI';

export default function BomJob({ formik }) {
    const [jobOptions, setJobOptions] = useState([]);
    const [jobSearchQuery, setJobSearchQuery] = useState('');
    const jobSearchTimeout = useRef();

    const fetchJobs = async (query) => {
        try {
            const res = await searchJobs(query);
            setJobOptions(res || []);

            console.log(res)
        } catch (e) {
            console.error('Failed to fetch production jobs');
        }
    };

    const handleJobSearchChange = (query) => {
        setJobSearchQuery(query);
        clearTimeout(jobSearchTimeout.current);
        jobSearchTimeout.current = setTimeout(() => fetchJobs(query), 300);
    };
    return (
        <Box>
            <Typography variant="h6" gutterBottom>Operations</Typography>
            <Autocomplete
                fullWidth
                size="small"
                options={jobOptions}
                inputValue={jobSearchQuery}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(e, newVal, reason) => {
                    if (reason === 'input') handleJobSearchChange(newVal);
                }}
                getOptionLabel={(option) =>
                    option?.jobName ? `${option.jobName} (${option.roleRequired || ''})` : ''
                }
                onChange={(e, selectedJob) => {
                    console.log(selectedJob)
                    if (selectedJob) {
                        const updatedList = [
                            ...(formik.values.productionTemplate?.workOrderJobLists || []),
                            {
                                productionJob: selectedJob,
                                numberOfHours: 1
                            }
                        ];
                        formik.setFieldValue('productionTemplate.workOrderJobLists', updatedList);
                        setJobSearchQuery('');
                    }
                }}
                renderInput={(params) => <TextField {...params} label="Add Operation Job" />}
            />


            <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Job Name</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Machine</TableCell>
                            <TableCell>Cost/hr</TableCell>
                            <TableCell>Estimated Hours</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {formik.values.productionTemplate?.workOrderJobLists.map((job, index) => (
                            <TableRow key={index}>
                                <TableCell>{job.productionJob?.jobName}</TableCell>
                                <TableCell>{job.productionJob?.roleRequired}</TableCell>
                                <TableCell>{job.productionJob?.machineDetails?.machineName || '—'}</TableCell>
                                <TableCell>{job.productionJob?.costPerHour}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={job.numberOfHours}
                                        onChange={(e) => {
                                            console.log(e.target.value)
                                            const updated = [...formik.values.productionTemplate?.workOrderJobLists];
                                            updated[index].numberOfHours = e.target.value;
                                            console.log(updated)
                                            formik.setFieldValue('productionTemplate.workOrderJobLists', updated);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        onClick={() => {
                                            const updated = formik.values.productionTemplate?.workOrderJobLists.filter((_, i) => i !== index);
                                            formik.setFieldValue('productionTemplate.workOrderJobLists', updated);
                                        }}
                                    >
                                        <DeleteOutline />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>

    )
}
