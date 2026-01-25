import React, { useEffect, useState } from 'react'
import './style/bom.css'
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Grid,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import {
    DragDropContext,
    Droppable,
    Draggable
} from "@hello-pangea/dnd";
import OperationCard from './OperationCard';

export default function BomRouting({
    operations,
    setOperations,
    fetchProductionJob,
    jobs,
    error,
    loading,
    fetchWorkCenter,
    workCenters
}) {

    const [searchQuery, setSearchQuery] = useState('');
    const [workCenterSearchQuery, setWorkCenterSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedWorkCenter, setSelectedWorkCenter] = useState(null);

    const [selectedOperation, setSelectedOperation] = useState(null);

    // --------------------
    // Handle Add Operation
    // --------------------
    const handleAddOperation = () => {
        const nextSeq = ((operations?.length||0) + 1) * 10;
        const newOp = {
            _tempId: Date.now(),
            name: "New Operation",
            sequenceNumber: nextSeq,
            setupTime: "",
            runTime: "",
            inspection: false,
            notes: "",
        };
        setOperations([...operations||[], newOp]);
    };

    // --------------------
    // Drag Reorder Function
    // --------------------
    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return result.map((op, index) => ({
            ...op,
            sequenceNumber: (index + 1) * 10
        }));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const updated = reorder(
            operations,
            result.source.index,
            result.destination.index
        );
        setOperations(updated);
    };

    // --------------------
    // Searching
    // --------------------
    useEffect(() => {
        fetchProductionJob(searchQuery);
    }, [searchQuery])

    useEffect(() => {
        fetchWorkCenter(workCenterSearchQuery);
    }, [workCenterSearchQuery])

    // --------------------
    // Save updated operation
    // --------------------
    const handleSaveOperation = () => {
        if (!selectedOperation) return;

        const updated = operations.map(op =>
            (op.id || op._tempId) === (selectedOperation.id || selectedOperation._tempId)
                ? selectedOperation
                : op
        );

        console.log(updated)
        console.log(selectedOperation)
        setOperations(updated);
    
    };





    // --------------------
    // Delete operation
    // --------------------
    const handleDeleteOperation = () => {
        if (!selectedOperation) return;

        const filtered = operations.filter(
            op => (op.id || op._tempId) !== (selectedOperation.id || selectedOperation._tempId)
        );

        setOperations(filtered);
        setSelectedOperation(null);
    };

    useEffect(() => {
        if (!selectedOperation?.id) {
            setSelectedOperation({
                ...selectedOperation,
                workCenter: selectedJob?.workCenter ?? null
            });

            setSelectedWorkCenter(selectedJob?.workCenter ?? null)
        }


    }, [selectedJob])



    return (
        <Grid
            container
            sx={{ height: "80vh", overflow: "hidden" }}
            spacing={0}
        >


            {/* LEFT PANEL */}
            <Grid
                item
                xs={2}
                sx={{ borderRight: "1px solid #e0e0e0", height: "100%" }}
            >
                <Box sx={{ p: 2, height: "100%", overflowY: "auto" }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Operations
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={handleAddOperation}
                        sx={{ mt: 2, mb: 2 }}
                        fullWidth
                    >
                        Add Operation
                    </Button>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="operationsDroppable">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>

                                    {operations?.map((operation, index) => (
                                        <Draggable
                                            key={(operation.id || operation._tempId).toString()}
                                            draggableId={(operation.id || operation._tempId).toString()}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <Paper
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    elevation={snapshot.isDragging ? 4 : 1}
                                                    sx={{
                                                        p: 2,
                                                        mt: 2,
                                                        cursor: "pointer",
                                                        borderLeft:
                                                            selectedOperation &&
                                                                (selectedOperation.id || selectedOperation._tempId) ===
                                                                (operation.id || operation._tempId)
                                                                ? "4px solid #ff9800"
                                                                : "4px solid #1976d2",
                                                        "&:hover": { boxShadow: 3 },
                                                    }}
                                                    onClick={() => setSelectedOperation(operation)} // SELECT OPERATION
                                                >
                                                    <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                                                        {operation.sequenceNumber}. {operation.name}
                                                    </Typography>
                                                </Paper>
                                            )}
                                        </Draggable>
                                    ))}

                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Box>
            </Grid>

            {/* CENTER PANEL */}
            <Grid
                item
                xs={6}
                sx={{ borderRight: "1px solid #e0e0e0" }}
                bgcolor={"#f4f4f4"}
                height={"100%"}
            >
                <Box sx={{ p: 2, height: "100%", overflowY: "auto" }}>
                    {operations?.map((op, index) => (
                        <React.Fragment key={op.id || op._tempId}>
                            <OperationCard
                                operation={op}
                                onClick={() => setSelectedOperation(op)}
                                highlight={
                                    selectedOperation &&
                                    (selectedOperation.id || selectedOperation._tempId) ===
                                    (op.id || op._tempId)
                                }
                            />

                            {index < operations?.length - 1 && (
                                <Box sx={{ textAlign: "center", mt: 1 }}>
                                    <ArrowDown />
                                </Box>
                            )}
                        </React.Fragment>
                    ))}
                </Box>
            </Grid>

            {/* RIGHT PANEL */}
            <Grid
                item
                xs={3.5}
                sx={{ minWidth: 320, height: "100%",minHeight:"500px" }}
            >
                <Box sx={{ p: 2, height: "100%", overflowY: "auto" }}>

                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        Operation Details
                    </Typography>

                    {!selectedOperation && (
                        <Typography sx={{ color: "#888", mt: 2 }}>
                            Select an operation from left or center panel
                        </Typography>
                    )}

                    {selectedOperation && (
                        <>
                            {/* NAME */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Name
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={selectedOperation.name || ""}
                                onChange={(e) =>
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        name: e.target.value
                                    })
                                }
                            />

                            {/* JOB */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Job
                            </Typography>
                            <Autocomplete
                                fullWidth
                                options={jobs}
                                value={selectedOperation.productionJob || null}
                                getOptionLabel={(o) => o?.jobName ?? ""}
                                onChange={(e, v) => {
                                    setSelectedJob(v)
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        productionJob: v
                                    })

                                }}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Search job" />
                                )}
                                onInputChange={(e, v) => setSearchQuery(v)}
                                loading={loading}
                            />

                            {/* WORK CENTER */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Work Center
                            </Typography>
                            <Autocomplete
                                fullWidth
                                options={workCenters}
                                value={selectedOperation.workCenter || null}
                                getOptionLabel={(o) => o?.centerCode ?? ""}
                                onChange={(e, v) => {
                                    setSelectedWorkCenter(v)
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        workCenter: v

                                    })

                                }}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Search work center" />
                                )}
                                onInputChange={(e, v) => setWorkCenterSearchQuery(v)}
                                loading={loading}
                            />

                            {/* SETUP TIME */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Setup Time (hrs)
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={selectedOperation.setupTime || ""}
                                onChange={(e) =>
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        setupTime: e.target.value
                                    })
                                }
                            />

                            {/* RUN TIME */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Run Time (hrs)
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={selectedOperation.runTime || ""}
                                onChange={(e) =>
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        runTime: e.target.value
                                    })
                                }
                            />

                            {/* INSPECTION */}
                            <FormControlLabel
                                sx={{ mt: 1 }}
                                control={
                                    <Checkbox
                                        checked={selectedOperation.inspection || false}
                                        onChange={(e) =>
                                            setSelectedOperation({
                                                ...selectedOperation,
                                                inspection: e.target.checked
                                            })
                                        }
                                    />
                                }
                                label="Inspection"
                            />

                            {/* NOTES */}
                            <Typography sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>
                                Notes
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={selectedOperation.notes || ""}
                                onChange={(e) =>
                                    setSelectedOperation({
                                        ...selectedOperation,
                                        notes: e.target.value
                                    })
                                }
                            />

                            {/* ACTION BUTTONS */}
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{ mt: 3 }}
                                onClick={handleSaveOperation}
                            >
                                Save / Done
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                fullWidth
                                sx={{ mt: 1 }}
                                onClick={handleDeleteOperation}
                            >
                                Delete Operation
                            </Button>
                        </>
                    )}
                </Box>
            </Grid>
        </Grid>
    )
}

function ArrowDown() {
    return (
        <svg width="24" height="24">
            <path
                d="M12 2 L12 18 M6 12 L12 18 L18 12"
                stroke="#555"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
            />
        </svg>
    );
}
