import React from "react";
import apiService from "../../services/apiService";
import {
    Table, Grid, Autocomplete, IconButton, Paper, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Box, MenuItem
} from "@mui/material";
import { ArrowDownward, ArrowUpward, DeleteOutline, ExpandLess, ExpandMore, SubdirectoryArrowRightRounded } from "@mui/icons-material";

const HEADER_BG = '#0f2744';
const BORDER_COLOR = '#e5e7eb';
const ROW_HOVER = '#e3f2fd';
const MAX_TREE_DEPTH = 5;

const headerCellSx = {
    background: HEADER_BG,
    color: '#e8edf3',
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: 0.3,
    py: 1,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid rgba(255,255,255,0.15)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
};

const compactFieldSx = {
    "& .MuiInputBase-input": { fontSize: 12, py: 0.5 },
    "& .MuiOutlinedInput-root": { borderRadius: 1 },
};

const getPositionRowId = (row) => row?.positionId ?? row?.id ?? null;
const getChildItemId = (row) => row?.childInventoryItemId ?? row?.inventoryItemId ?? row?.childInventoryItem?.inventoryItemId ?? null;
const getOperationId = (operation) => operation?.id ?? operation?.operationId ?? operation?.routingOperationId ?? operation?._tempId ?? null;
const getOperationName = (operation) => operation?.name ?? operation?.operationName ?? null;
const isPersistedOperationId = (value) => value !== null && value !== undefined && !Number.isNaN(Number(value));

const BomPositionTable = ({ searchedItemList, searchQuery, handleSearchChange, formik, operations = [] }) => {

    const buildParentBlocks = (rows) => {
        const blocks = [];
        let i = 0;
        while (i < rows.length) {
            const row = rows[i];
            if ((row.level ?? 0) === 0) {
                const start = i;
                let end = i;
                for (let j = i + 1; j < rows.length; j++) {
                    if ((rows[j].level ?? 0) === 0) break;
                    end = j;
                }
                blocks.push(rows.slice(start, end + 1));
                i = end + 1;
            } else { i++; }
        }
        return blocks;
    };

    const recalcPositions = (rows) => {
        let parentCounter = 0;
        return rows.map(row => {
            if ((row.level ?? 0) === 0) { parentCounter++; return { ...row, position: parentCounter * 10 }; }
            return row;
        });
    };

    const moveRow = (index, direction) => {
        const rows = formik.values.components;
        if ((rows[index].level ?? 0) !== 0) return;
        const blocks = buildParentBlocks(rows);
        const currentParent = rows[index];
        const currentParentKey = getPositionRowId(currentParent) ?? `${currentParent?.itemCode}-${index}`;
        const blockIndex = blocks.findIndex((block) => {
            const blockKey = getPositionRowId(block[0]) ?? `${block?.[0]?.itemCode}-${rows.indexOf(block[0])}`;
            return blockKey === currentParentKey;
        });
        if (blockIndex === -1) return;
        const targetBlockIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;
        if (targetBlockIndex < 0 || targetBlockIndex >= blocks.length) return;
        const newBlocks = [...blocks];
        [newBlocks[blockIndex], newBlocks[targetBlockIndex]] = [newBlocks[targetBlockIndex], newBlocks[blockIndex]];
        formik.setFieldValue("components", recalcPositions(newBlocks.flat()));
    };

    const showChildBom = async (index, itemId) => {
        if (!itemId) return;
        const components = formik.values.components;
        const parent = components[index];
        if (!parent) return;

        if (parent.isExpanded) {
            const parentLevel = parent.level ?? 0;
            const updated = [];
            for (let i = 0; i < components.length; i++) {
                if (i > index && components[i].level > parentLevel) continue;
                updated.push(i === index ? { ...components[i], isExpanded: false } : components[i]);
            }
            formik.setFieldValue("components", updated);
            return;
        }

        const parentLevel = parent.level ?? 0;
        if (parentLevel >= MAX_TREE_DEPTH - 1) return; // limit depth

        const res = await apiService.get(`/bom/positions/by-item/${itemId}`);
        const childItems = res?.map(cb => ({
            ...cb, childInventoryItemId: getChildItemId(cb), level: parentLevel + 1,
            parentPositionId: getPositionRowId(parent), isExpanded: false, isChild: true
        }));
        const updated = [...components.slice(0, index + 1), ...childItems, ...components.slice(index + 1)];
        updated[index] = { ...updated[index], isExpanded: true };
        formik.setFieldValue("components", updated);
    };

    const handlePositionAdd = (val) => {
        if (!val) return;
        const components = formik.values.components;
        const valChildItemId = getChildItemId(val);
        const index = components.findIndex((c) => getChildItemId(c) === valChildItemId);
        if (index !== -1) {
            const updated = components[index];
            updated.quantity = components[index].quantity + 1;
            components[index] = updated;
            formik.setFieldValue("components", components);
            handleSearchChange("");
            return;
        }
        const newPosition = (formik.values.components?.length + 1) * 10;
        formik.setFieldValue("components", [
            ...(formik.values.components || []),
            { ...val, childInventoryItemId: valChildItemId, quantity: 1, position: newPosition, routingOperationId: null, routingOperationName: null }
        ]);
        handleSearchChange("");
    };

    return (
        <Grid>
            <Typography variant="subtitle2" fontWeight={600} color="#0f2744"
                sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1.5 }}>
                Components
            </Typography>

            <Autocomplete
                fullWidth size="small" options={searchedItemList} inputValue={searchQuery}
                onInputChange={(e, v, r) => r === "input" && handleSearchChange(v)}
                getOptionLabel={(o) => `${o.name ?? o.itemName ?? ''} | ${o.itemCode ?? ''}`}
                onChange={(e, val) => handlePositionAdd(val)}
                renderInput={(params) => (
                    <TextField {...params}
                        sx={{
                            "& .MuiInputBase-input": { fontSize: 13.5 },
                            "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
                        }}
                        label="Search and add component"
                        placeholder="Type to search..."
                    />
                )}
                sx={{ mb: 2 }}
            />

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 1.5, borderColor: BORDER_COLOR, flexGrow: 1, overflow: "auto" }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellSx, width: 50 }}></TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 70 }}>Pos</TableCell>
                            <TableCell sx={headerCellSx}>Component</TableCell>
                            <TableCell sx={headerCellSx}>Item Code</TableCell>
                            <TableCell sx={headerCellSx}>Drawing No.</TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 80 }}>Qty</TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 80 }}>Scrap %</TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 60 }}>UOM</TableCell>
                            <TableCell sx={{ ...headerCellSx, minWidth: 160 }}>Operation</TableCell>
                            <TableCell sx={{ ...headerCellSx, width: 110 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {formik.values.components?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">No components added. Search and add components above.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {formik.values.components?.map((c, i) => (
                            <TableRow
                                key={i}
                                sx={{
                                    bgcolor: c?.isChild ? '#f8f9fa' : i % 2 === 0 ? '#fff' : '#fafbfc',
                                    transition: 'background 0.15s',
                                    '&:hover': { bgcolor: ROW_HOVER },
                                    '& td': {
                                        color: c?.isChild ? 'text.secondary' : 'text.primary',
                                        fontSize: '0.8125rem',
                                        py: 0.5,
                                        borderBottom: `1px solid ${BORDER_COLOR}`,
                                    }
                                }}
                            >
                                {/* Expand/Collapse */}
                                <TableCell sx={{ pl: 1 + (c?.level || 0) * 2, borderLeft: c?.level > 0 ? '2px solid #e0e0e0' : 'none' }}>
                                    <Box display="flex" alignItems="center" gap={0.25}>
                                        {c?.hasActiveBom && (c?.level ?? 0) < MAX_TREE_DEPTH - 1 ? (
                                            <Tooltip title={c?.isExpanded ? "Collapse" : "Expand"}>
                                                <IconButton size="small" onClick={() => showChildBom(i, getChildItemId(c))} sx={{ color: '#1565c0' }}>
                                                    {c.isExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                                                </IconButton>
                                            </Tooltip>
                                        ) : <Box sx={{ width: 28 }} />}
                                        {c?.isChild && <SubdirectoryArrowRightRounded sx={{ color: '#9ca3af', fontSize: 16 }} />}
                                    </Box>
                                </TableCell>

                                {/* Position */}
                                <TableCell>
                                    <TextField size="small" disabled={c?.isChild}
                                        sx={{ width: 60, ...compactFieldSx, "& .MuiInputBase-input": { textAlign: "center" } }}
                                        value={c?.position ?? ""}
                                        onChange={(e) => {
                                            if (c?.isChild) return;
                                            const arr = [...formik.values.components];
                                            arr[i].position = parseInt(e.target.value, 10);
                                            formik.setFieldValue("components", arr);
                                        }}
                                    />
                                </TableCell>

                                <TableCell sx={{ fontWeight: 500 }}>{c?.itemName ?? c?.name}</TableCell>
                                <TableCell sx={{ color: '#1565c0', fontWeight: 500 }}>{c?.itemCode}</TableCell>
                                <TableCell>{c?.drawingNumber}</TableCell>

                                {/* Quantity */}
                                <TableCell>
                                    <TextField type="number" size="small" disabled={c?.isChild}
                                        sx={{ width: 70, ...compactFieldSx }}
                                        value={c?.quantity}
                                        onChange={(e) => { const arr = [...formik.values.components]; arr[i].quantity = e.target.value; formik.setFieldValue("components", arr); }}
                                    />
                                </TableCell>

                                {/* Scrap % */}
                                <TableCell>
                                    <TextField type="number" size="small" disabled={c?.isChild}
                                        sx={{ width: 70, ...compactFieldSx }}
                                        value={c?.scrapPercentage ?? ""}
                                        onChange={(e) => { const arr = [...formik.values.components]; arr[i].scrapPercentage = e.target.value; formik.setFieldValue("components", arr); }}
                                    />
                                </TableCell>

                                <TableCell>{c?.uom}</TableCell>

                                {/* Operation */}
                                <TableCell sx={{ minWidth: 150 }}>
                                    {c?.isChild ? (
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{c?.routingOperationName || "WO Level"}</Typography>
                                    ) : (
                                        <TextField select size="small"
                                            value={c?.routingOperationId === null || c?.routingOperationId === undefined ? "" : String(c?.routingOperationId)}
                                            onChange={(e) => {
                                                const selectedValue = e.target.value;
                                                const parsedOperationId = Number(selectedValue);
                                                const operationId = selectedValue === "" || Number.isNaN(parsedOperationId) ? null : parsedOperationId;
                                                const selectedOperation = operations.find((op) => String(getOperationId(op)) === selectedValue);
                                                const arr = [...formik.values.components];
                                                arr[i].routingOperationId = operationId;
                                                arr[i].routingOperationSequenceNumber = selectedOperation?.sequenceNumber || null;
                                                arr[i].routingOperationName = getOperationName(selectedOperation) || null;
                                                formik.setFieldValue("components", arr);
                                            }}
                                            sx={{ minWidth: 140, ...compactFieldSx }}
                                        >
                                            <MenuItem value="" sx={{ fontSize: '0.8rem' }}>WO Level</MenuItem>
                                            {isPersistedOperationId(c?.routingOperationId) &&
                                                !operations.some((op) => String(getOperationId(op)) === String(c?.routingOperationId)) && (
                                                    <MenuItem value={String(c?.routingOperationId)} sx={{ fontSize: '0.8rem' }}>
                                                        {c?.routingOperationName || `Operation ${c?.routingOperationId}`}
                                                    </MenuItem>
                                                )}
                                            {operations.map((op) => (
                                                isPersistedOperationId(getOperationId(op)) && (
                                                    <MenuItem key={String(getOperationId(op))} value={String(getOperationId(op))} sx={{ fontSize: '0.8rem' }}>
                                                        {getOperationName(op) || `Operation ${op?.sequenceNumber ?? ""}`.trim()}
                                                    </MenuItem>
                                                )
                                            ))}
                                        </TextField>
                                    )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell>
                                    {!c?.isChild ? (
                                        <Box display="flex" gap={0.25}>
                                            <Tooltip title="Move Up">
                                                <IconButton size="small" onClick={() => moveRow(i, "up")} sx={{ color: '#6b7280' }}>
                                                    <ArrowUpward sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Move Down">
                                                <IconButton size="small" onClick={() => moveRow(i, "down")} sx={{ color: '#6b7280' }}>
                                                    <ArrowDownward sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove">
                                                <IconButton size="small" sx={{ color: '#d32f2f' }} onClick={() => {
                                                    const updated = formik.values.components
                                                        .filter((_, idx) => idx !== i)
                                                        .map((item, idx) => ({ ...item, position: (idx + 1) * 10 }));
                                                    formik.setFieldValue("components", updated);
                                                }}>
                                                    <DeleteOutline sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Grid>
    );
};

export default BomPositionTable;
