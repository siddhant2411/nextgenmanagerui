import React, { useEffect, useState } from 'react'
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { ExpandMore, ExpandLess, WarningAmber } from '@mui/icons-material'
import {
    DragDropContext,
    Droppable,
    Draggable
} from "@hello-pangea/dnd";
import OperationCard from './OperationCard';
import RoutingDAGPreview from './RoutingDAGPreview';

// Parallel path colour mapping
const PATH_COLOURS_LIST = [
    '#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96',
    '#13c2c2', '#faad14', '#a0d911',
];
const getPathBgColour = (path, allPaths) => {
    if (!path) return '#e5e7eb';
    const idx = allPaths.indexOf(path);
    return PATH_COLOURS_LIST[Math.max(idx, 0) % PATH_COLOURS_LIST.length];
};

const COST_TYPES = ['CALCULATED', 'FIXED_RATE', 'SUB_CONTRACTED'];
const BORDER_COLOR = '#e5e7eb';
const HEADER_BG = '#0f2744';

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13 },
    "& .MuiInputLabel-root": { fontSize: 13 },
    "& .MuiOutlinedInput-root": {
        borderRadius: 1,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
    },
};

const SectionLabel = ({ children }) => (
    <Typography variant="caption" fontWeight={600} color="#0f2744"
        sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.8, mt: 2, mb: 0.5, display: 'block' }}>
        {children}
    </Typography>
);

export default function BomRouting({
    operations,
    setOperations,
    fetchProductionJob,
    jobs,
    error,
    loading,
    fetchWorkCenter,
    workCenters,
    fetchLaborRoles,
    laborRoles,
    fetchMachines,
    machines,
}) {

    const [searchQuery, setSearchQuery] = useState('');
    const [workCenterSearchQuery, setWorkCenterSearchQuery] = useState('');
    const [laborRoleSearchQuery, setLaborRoleSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedWorkCenter, setSelectedWorkCenter] = useState(null);
    const [selectedOperation, setSelectedOperation] = useState(null);
    const [depsExpanded, setDepsExpanded] = useState(false);
    const [selfDepAlert, setSelfDepAlert] = useState(false);

    // Compute unique parallel paths across all operations for colour legend
    const allParallelPaths = [...new Set((operations || []).map(o => o.parallelPath).filter(Boolean))];

    // Build set of operation IDs that are referenced as a dependency by other ops
    const depsTargetIds = new Set(
        (operations || []).flatMap(op =>
            (op.dependencies || []).map(d => d.dependsOnRoutingOperationId)
        )
    );

    // Returns true if op has a parallelPath set but allowParallel is false
    const hasPathMismatch = (op) => Boolean(op.parallelPath && !op.allowParallel);

    // Returns true if op is in a dependency chain (either has deps or is a dep target) AND allowParallel=false
    const hasParallelChainWarning = (op) => {
        const id = op.id || op._tempId;
        const hasDeps = (op.dependencies || []).length > 0;
        const isTarget = depsTargetIds.has(id);
        return (hasDeps || isTarget) && !op.allowParallel && Boolean(op.parallelPath);
    };

    const handleAddOperation = () => {
        const nextSeq = ((operations?.length || 0) + 1) * 10;
        const newOp = {
            _tempId: Date.now(),
            name: "New Operation",
            sequenceNumber: nextSeq,
            setupTime: "",
            runTime: "",
            inspection: false,
            notes: "",
            numberOfOperators: 1,
            costType: "CALCULATED",
            fixedCostPerUnit: null,
        };
        setOperations([...operations || [], newOp]);
    };

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result.map((op, index) => ({ ...op, sequenceNumber: (index + 1) * 10 }));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        setOperations(reorder(operations, result.source.index, result.destination.index));
    };

    useEffect(() => { fetchProductionJob(searchQuery); }, [searchQuery]);
    useEffect(() => { fetchWorkCenter(workCenterSearchQuery); }, [workCenterSearchQuery]);
    useEffect(() => { if (fetchLaborRoles) fetchLaborRoles(laborRoleSearchQuery); }, [laborRoleSearchQuery]);
    useEffect(() => { if (fetchMachines) fetchMachines(); }, []);

    const handleSaveOperation = () => {
        if (!selectedOperation) return;
        setOperations(operations.map(op =>
            (op.id || op._tempId) === (selectedOperation.id || selectedOperation._tempId) ? selectedOperation : op
        ));
    };

    const handleDeleteOperation = () => {
        if (!selectedOperation) return;
        setOperations(operations.filter(
            op => (op.id || op._tempId) !== (selectedOperation.id || selectedOperation._tempId)
        ));
        setSelectedOperation(null);
    };

    useEffect(() => {
        if (!selectedOperation?.id) {
            setSelectedOperation({
                ...selectedOperation,
                workCenter: selectedJob?.workCenter ?? null
            });
            setSelectedWorkCenter(selectedJob?.workCenter ?? null);
        }
    }, [selectedJob]);

    const isCalculated = selectedOperation?.costType === 'CALCULATED' || !selectedOperation?.costType;

    return (
        <Grid container sx={{ height: "80vh", overflow: "hidden" }} spacing={0}>

            {/* LEFT PANEL — Operations List */}
            <Grid item xs={2.5}
                sx={{ borderRight: `1px solid ${BORDER_COLOR}`, height: "100%", bgcolor: '#fafbfc' }}>
                <Box sx={{ p: 1.5, height: "100%", overflowY: "auto" }}>
                    <Box sx={{
                        bgcolor: HEADER_BG, color: '#fff', px: 1.5, py: 1, borderRadius: 1, mb: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', letterSpacing: 0.3 }}>
                            Operations
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                            {operations?.length || 0}
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        onClick={handleAddOperation}
                        fullWidth
                        size="small"
                        sx={{
                            mb: 1.5, textTransform: 'none', fontWeight: 500, fontSize: '0.8rem',
                            borderColor: '#1565c0', color: '#1565c0', borderRadius: 1,
                            '&:hover': { bgcolor: '#e3f2fd', borderColor: '#0d47a1' },
                        }}
                    >
                        + Add Operation
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
                                                    elevation={snapshot.isDragging ? 3 : 0}
                                                    sx={{
                                                        p: 1, mb: 0.75, cursor: "pointer", borderRadius: 1,
                                                        border: `1px solid ${BORDER_COLOR}`,
                                                        borderLeft: selectedOperation &&
                                                            (selectedOperation.id || selectedOperation._tempId) ===
                                                            (operation.id || operation._tempId)
                                                            ? "3px solid #1565c0"
                                                            : hasParallelChainWarning(operation)
                                                                ? "3px solid #fa8c16"
                                                                : `3px solid ${BORDER_COLOR}`,
                                                        bgcolor: selectedOperation &&
                                                            (selectedOperation.id || selectedOperation._tempId) ===
                                                            (operation.id || operation._tempId)
                                                            ? '#e3f2fd' : '#fff',
                                                        transition: 'all 0.15s',
                                                        "&:hover": { bgcolor: '#f0f7ff' },
                                                    }}
                                                    onClick={() => {
                                                        setSelectedOperation(operation);
                                                        setSelfDepAlert(false);
                                                        setDepsExpanded(false);
                                                    }}
                                                >
                                                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={0.5}>
                                                        <Typography sx={{ fontWeight: 500, fontSize: 12.5, color: '#0f2744' }}>
                                                            {operation.sequenceNumber}. {operation.name}
                                                        </Typography>
                                                        {hasParallelChainWarning(operation) && (
                                                            <Tooltip title="parallelPath set but allowParallel is off" arrow>
                                                                <WarningAmber sx={{ fontSize: 14, color: '#fa8c16', flexShrink: 0 }} />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    {operation.productionJob && (
                                                        <Typography sx={{ fontSize: 11, color: '#6b7280', mt: 0.25 }}>
                                                            {operation.productionJob.jobName}
                                                        </Typography>
                                                    )}
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

            {/* CENTER PANEL — DAG Preview */}
            <Grid item xs={5.5}
                sx={{ borderRight: `1px solid ${BORDER_COLOR}`, height: "100%" }}
                bgcolor={"#f8f9fa"}>
                <Box sx={{ p: 2, height: "100%", overflowY: "auto" }}>
                    <Box sx={{
                        bgcolor: HEADER_BG, color: '#fff', px: 1.5, py: 0.75, borderRadius: 1, mb: 1.5,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Dependency Graph</Typography>
                        <Typography sx={{ fontSize: '0.7rem', opacity: 0.65 }}>Visual preview</Typography>
                    </Box>
                    {(!operations || operations.length === 0) ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="70%">
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                No operations yet.<br />Add operations from the left panel.
                            </Typography>
                        </Box>
                    ) : (
                        <RoutingDAGPreview operations={operations} />
                    )}
                </Box>
            </Grid>

            {/* RIGHT PANEL — Operation Details */}
            <Grid item xs={4} sx={{ height: "100%" }}>
                <Box sx={{ p: 2, height: "100%", overflowY: "auto", bgcolor: '#fff' }}>

                    <Box sx={{
                        bgcolor: HEADER_BG, color: '#fff', px: 1.5, py: 1, borderRadius: 1, mb: 1.5,
                    }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', letterSpacing: 0.3 }}>
                            Operation Details
                        </Typography>
                    </Box>

                    {!selectedOperation && (
                        <Typography sx={{ color: "#9ca3af", mt: 3, textAlign: 'center', fontSize: '0.85rem' }}>
                            Select an operation to edit its details
                        </Typography>
                    )}

                    {selectedOperation && (
                        <>
                            {/* Basic Info */}
                            <SectionLabel>Basic Info</SectionLabel>
                            <TextField fullWidth size="small" label="Operation Name" sx={{ ...fieldSx, mb: 1.5 }}
                                value={selectedOperation.name || ""}
                                onChange={(e) => setSelectedOperation({ ...selectedOperation, name: e.target.value })}
                            />

                            {/* Resource Assignment */}
                            <SectionLabel>Resource Assignment</SectionLabel>
                            <Autocomplete fullWidth size="small" options={jobs}
                                value={selectedOperation.productionJob || null}
                                getOptionLabel={(o) => o?.jobName ? `${o.jobName} (${o.jobCode || ''})` : ""}
                                onChange={(e, v) => { setSelectedJob(v); setSelectedOperation({ ...selectedOperation, productionJob: v }); }}
                                renderInput={(params) => <TextField {...params} size="small" label="Production Job" sx={fieldSx} />}
                                onInputChange={(e, v) => setSearchQuery(v)} loading={loading}
                                sx={{ mb: 1.5 }}
                            />

                            <Autocomplete fullWidth size="small" options={workCenters}
                                value={selectedOperation.workCenter || null}
                                getOptionLabel={(o) => o?.centerCode ? `${o.centerName} (${o.centerCode})` : ""}
                                onChange={(e, v) => { setSelectedWorkCenter(v); setSelectedOperation({ ...selectedOperation, workCenter: v }); }}
                                renderInput={(params) => <TextField {...params} size="small" label="Work Center" sx={fieldSx} />}
                                onInputChange={(e, v) => setWorkCenterSearchQuery(v)} loading={loading}
                                sx={{ mb: 1.5 }}
                            />

                            <Autocomplete fullWidth size="small" options={laborRoles || []}
                                value={selectedOperation.laborRole || null}
                                getOptionLabel={(o) => o?.roleName ? `${o.roleName} (${o.roleCode || ''})` : ""}
                                onChange={(e, v) => setSelectedOperation({ ...selectedOperation, laborRole: v })}
                                renderInput={(params) => <TextField {...params} size="small" label="Labor Role" sx={fieldSx} />}
                                onInputChange={(e, v) => setLaborRoleSearchQuery(v)} loading={loading}
                                sx={{ mb: 1.5 }}
                            />

                            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                                <Grid item xs={6}>
                                    <TextField fullWidth size="small" type="number" label="Operators" sx={fieldSx}
                                        value={selectedOperation.numberOfOperators ?? 1}
                                        onChange={(e) => setSelectedOperation({ ...selectedOperation, numberOfOperators: parseInt(e.target.value) || 1 })}
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <Autocomplete fullWidth size="small" options={machines || []}
                                        value={selectedOperation.machineDetails || null}
                                        getOptionLabel={(o) => o?.machineName ? `${o.machineName} (${o.machineCode || ''})` : ""}
                                        onChange={(e, v) => setSelectedOperation({ ...selectedOperation, machineDetails: v })}
                                        renderInput={(params) => <TextField {...params} size="small" label="Machine" sx={fieldSx} />}
                                        loading={loading}
                                    />
                                </Grid>
                            </Grid>

                            {/* Timing & Costing */}
                            <SectionLabel>Timing & Costing</SectionLabel>
                            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                                <Grid item xs={6}>
                                    <TextField fullWidth size="small" type="number" label="Setup Time (hrs)" sx={fieldSx}
                                        value={selectedOperation.setupTime || ""}
                                        onChange={(e) => setSelectedOperation({ ...selectedOperation, setupTime: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField fullWidth size="small" type="number" label="Run Time (hrs)" sx={fieldSx}
                                        value={selectedOperation.runTime || ""}
                                        onChange={(e) => setSelectedOperation({ ...selectedOperation, runTime: e.target.value })}
                                    />
                                </Grid>
                            </Grid>

                            <TextField select fullWidth size="small" label="Cost Type" sx={{ ...fieldSx, mb: 1.5 }}
                                value={selectedOperation.costType || "CALCULATED"}
                                onChange={(e) => setSelectedOperation({
                                    ...selectedOperation, costType: e.target.value,
                                    fixedCostPerUnit: e.target.value === 'CALCULATED' ? null : selectedOperation.fixedCostPerUnit,
                                })}
                            >
                                {COST_TYPES.map((ct) => <MenuItem key={ct} value={ct}>{ct.replace(/_/g, ' ')}</MenuItem>)}
                            </TextField>

                            {!isCalculated && (
                                <TextField fullWidth size="small" type="number" label="Fixed Cost Per Unit (₹)" sx={{ ...fieldSx, mb: 1.5 }}
                                    value={selectedOperation.fixedCostPerUnit ?? ""}
                                    onChange={(e) => setSelectedOperation({
                                        ...selectedOperation, fixedCostPerUnit: e.target.value !== '' ? parseFloat(e.target.value) : null
                                    })}
                                />
                            )}

                            {/* Options */}
                            <FormControlLabel sx={{ mt: 0.5, mb: 0.5 }}
                                control={
                                    <Checkbox size="small" checked={selectedOperation.inspection || false}
                                        onChange={(e) => setSelectedOperation({ ...selectedOperation, inspection: e.target.checked })}
                                        sx={{ '&.Mui-checked': { color: '#1565c0' } }}
                                    />
                                }
                                label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Requires Inspection</Typography>}
                            />

                            {/* ── Parallel Operation Controls ── */}
                            <SectionLabel>Parallel Execution</SectionLabel>
                            <FormControlLabel
                                sx={{ mb: 0.75 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={Boolean(selectedOperation.allowParallel)}
                                        onChange={(e) => setSelectedOperation({
                                            ...selectedOperation,
                                            allowParallel: e.target.checked,
                                            parallelPath: e.target.checked ? (selectedOperation.parallelPath || '') : '',
                                        })}
                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#1565c0' } }}
                                    />
                                }
                                label={
                                    <Box display="flex" alignItems="center" gap={0.75}>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Allow Parallel</Typography>
                                        {selectedOperation.allowParallel && (
                                            <Chip size="small" label="Parallel" sx={{ bgcolor: '#e6f4ff', color: '#1677ff', fontWeight: 700, fontSize: '0.68rem', height: 18 }} />
                                        )}
                                    </Box>
                                }
                            />

                            {selectedOperation.allowParallel && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Parallel Path (e.g. PATH_A)"
                                    sx={{ ...fieldSx, mb: 1.5 }}
                                    value={selectedOperation.parallelPath || ''}
                                    placeholder="PATH_A, PATH_B…"
                                    onChange={(e) => setSelectedOperation({ ...selectedOperation, parallelPath: e.target.value.toUpperCase() })}
                                    InputProps={selectedOperation.parallelPath ? {
                                        endAdornment: (
                                            <Chip
                                                size="small"
                                                label={selectedOperation.parallelPath}
                                                sx={{
                                                    bgcolor: getPathBgColour(selectedOperation.parallelPath, allParallelPaths),
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    fontSize: '0.68rem',
                                                    height: 20,
                                                    mr: -0.5,
                                                }}
                                            />
                                        ),
                                    } : {}}
                                />
                            )}
                            {/* Path-mismatch warning: parallelPath set but allowParallel is off */}
                            {hasPathMismatch(selectedOperation) && (
                                <Alert severity="warning" sx={{ mb: 1, py: 0.25, fontSize: '0.74rem' }}>
                                    <strong>parallelPath</strong> is set but <strong>Allow Parallel</strong> is off — path will be ignored by the scheduler.
                                </Alert>
                            )}

                            {/* Dependencies — collapsible */}
                            <Box
                                onClick={() => setDepsExpanded(v => !v)}
                                sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', mt: 1.5, mb: 0.5, px: 0.5, py: 0.25, borderRadius: 1,
                                    '&:hover': { bgcolor: '#f0f4ff' },
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="caption" fontWeight={700} color="#0f2744"
                                        sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                        Dependencies
                                    </Typography>
                                    {(selectedOperation.dependencies || []).length > 0 && (
                                        <Chip size="small" label={(selectedOperation.dependencies || []).length}
                                            sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#1677ff', color: '#fff' }} />
                                    )}
                                </Box>
                                {depsExpanded
                                    ? <ExpandLess sx={{ fontSize: 16, color: '#6b7280' }} />
                                    : <ExpandMore sx={{ fontSize: 16, color: '#6b7280' }} />
                                }
                            </Box>

                            {selfDepAlert && (
                                <Alert severity="warning" sx={{ mb: 0.75, py: 0.25, fontSize: '0.74rem' }}
                                    onClose={() => setSelfDepAlert(false)}>
                                    An operation cannot depend on itself.
                                </Alert>
                            )}

                            <Collapse in={depsExpanded}>
                                {(operations || []).filter(op =>
                                    (op.id || op._tempId) !== (selectedOperation.id || selectedOperation._tempId)
                                ).length === 0 ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, pl: 0.5 }}>
                                        Add more operations to set dependencies.
                                    </Typography>
                                ) : (
                                    <Box sx={{ mb: 1.5 }}>
                                        {(operations || []).filter(op =>
                                            (op.id || op._tempId) !== (selectedOperation.id || selectedOperation._tempId)
                                        ).map(depOp => {
                                            const depOpId = depOp.id || depOp._tempId;
                                            const existingDep = (selectedOperation.dependencies || []).find(
                                                d => d.dependsOnRoutingOperationId === depOpId
                                            );
                                            const isSelected = Boolean(existingDep);

                                            const toggleDep = () => {
                                                setSelfDepAlert(false);
                                                const currentDeps = selectedOperation.dependencies || [];
                                                const nextDeps = isSelected
                                                    ? currentDeps.filter(d => d.dependsOnRoutingOperationId !== depOpId)
                                                    : [...currentDeps, { dependsOnRoutingOperationId: depOpId, dependencyType: 'SEQUENTIAL', isRequired: true }];
                                                setSelectedOperation({ ...selectedOperation, dependencies: nextDeps });
                                            };

                                            const setDepType = (type) => {
                                                const currentDeps = selectedOperation.dependencies || [];
                                                const nextDeps = currentDeps.map(d =>
                                                    d.dependsOnRoutingOperationId === depOpId ? { ...d, dependencyType: type } : d
                                                );
                                                setSelectedOperation({ ...selectedOperation, dependencies: nextDeps });
                                            };

                                            return (
                                                <Box
                                                    key={depOpId}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center', gap: 0.75,
                                                        p: 0.75, mb: 0.5, borderRadius: 1,
                                                        border: isSelected ? '1px solid #1677ff' : '1px solid #e5e7eb',
                                                        bgcolor: isSelected ? '#f0f7ff' : 'transparent',
                                                        cursor: 'pointer', transition: 'all 0.1s',
                                                        '&:hover': { bgcolor: isSelected ? '#e6f0ff' : '#f9fafb' },
                                                    }}
                                                    onClick={toggleDep}
                                                >
                                                    <Checkbox
                                                        size="small"
                                                        checked={isSelected}
                                                        onChange={toggleDep}
                                                        onClick={e => e.stopPropagation()}
                                                        sx={{ p: 0.25, '&.Mui-checked': { color: '#1677ff' } }}
                                                    />
                                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 500, flex: 1, color: '#0f2744' }}>
                                                        {depOp.sequenceNumber}. {depOp.name || 'Unnamed'}
                                                    </Typography>
                                                    {isSelected && (
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={existingDep?.dependencyType || 'SEQUENTIAL'}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => { e.stopPropagation(); setDepType(e.target.value); }}
                                                            sx={{
                                                                minWidth: 140,
                                                                '& .MuiInputBase-root': { height: 26, fontSize: '0.72rem' },
                                                                '& .MuiSelect-select': { py: 0.25, pr: 2 },
                                                            }}
                                                        >
                                                            <MenuItem value="SEQUENTIAL">
                                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                                    <span style={{ fontSize: 10 }}>&#9654;</span> Sequential
                                                                </Box>
                                                            </MenuItem>
                                                            <MenuItem value="PARALLEL_ALLOWED">
                                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                                    <span style={{ fontSize: 10, color: '#1677ff' }}>&#8649;</span> Parallel Allowed
                                                                </Box>
                                                            </MenuItem>
                                                        </TextField>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Collapse>
                            <TextField fullWidth size="small" label="Notes" sx={{ ...fieldSx, mb: 2 }}
                                value={selectedOperation.notes || ""}
                                onChange={(e) => setSelectedOperation({ ...selectedOperation, notes: e.target.value })}
                                multiline minRows={2}
                            />

                            {/* Action Buttons */}
                            <Button variant="contained" fullWidth size="small"
                                sx={{
                                    mb: 1, textTransform: 'none', fontWeight: 600, borderRadius: 1,
                                    bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' },
                                }}
                                onClick={handleSaveOperation}>
                                Save Operation
                            </Button>

                            <Button variant="outlined" color="error" fullWidth size="small"
                                sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 1 }}
                                onClick={handleDeleteOperation}>
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
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 2 L12 18 M6 12 L12 18 L18 12"
                stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    );
}
