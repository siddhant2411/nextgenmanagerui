import React, { useState, useRef, useCallback, useEffect } from "react";
import apiService from "../../services/apiService";

import { Table, Grid, Autocomplete, IconButton, Paper, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Box } from "@mui/material";
import { ArrowDownward, ArrowUpward, DeleteOutline, ExpandLess, ExpandMore, SubdirectoryArrowRight, SubdirectoryArrowRightRounded } from "@mui/icons-material";

const BomPositionTable = ({ searchedItemList, searchQuery, handleSearchChange, formik }) => {


    const buildParentBlocks = (rows) => {
        const blocks = [];
        let i = 0;

        while (i < rows.length) {
            const row = rows[i];

            // only level-0 parents start a block
            if ((row.level ?? 0) === 0) {
                const start = i;
                let end = i;

                for (let j = i + 1; j < rows.length; j++) {
                    if ((rows[j].level ?? 0) === 0) break;
                    end = j;
                }

                blocks.push(rows.slice(start, end + 1));
                i = end + 1;
            } else {
                i++;
            }
        }

        return blocks;
    };


    const recalcPositions = (rows) => {
        let parentCounter = 0;

        return rows.map(row => {
            if ((row.level ?? 0) === 0) {
                parentCounter++;
                return {
                    ...row,
                    position: parentCounter * 10
                };
            }

            // child → DO NOT touch position
            return row;
        });
    };
    const moveRow = (index, direction) => {
        const rows = formik.values.components;

        //Only allow moving level-0 parents
        if ((rows[index].level ?? 0) !== 0) return;

        const blocks = buildParentBlocks(rows);

        // find which block this parent belongs to
        const blockIndex = blocks.findIndex(
            block => block[0].id === rows[index].id
        );

        if (blockIndex === -1) return;

        const targetBlockIndex =
            direction === "up"
                ? blockIndex - 1
                : blockIndex + 1;

        if (
            targetBlockIndex < 0 ||
            targetBlockIndex >= blocks.length
        ) {
            return;
        }

        // swap blocks
        const newBlocks = [...blocks];
        [newBlocks[blockIndex], newBlocks[targetBlockIndex]] =
            [newBlocks[targetBlockIndex], newBlocks[blockIndex]];

        // flatten back to rows
        const updatedRows = recalcPositions(newBlocks.flat());

        formik.setFieldValue("components", updatedRows);
    };


    const collapseAll = () => {
        const components = formik.values.components;

        const collapsed = components
            .filter(c => (c.level ?? 0) === 0)
            .map(c => ({
                ...c,
                isExpanded: false
            }));

        formik.setFieldValue("components", collapsed);
    };

    const showChildBom = async (index, bomId) => {
        const components = formik.values.components;
        const parent = components[index];
        if (!parent) return;

        // 🔽 COLLAPSE (level-based)
        if (parent.isExpanded) {
            const parentLevel = parent.level ?? 0;
            const updated = [];

            for (let i = 0; i < components.length; i++) {
                if (i > index && components[i].level > parentLevel) continue;

                updated.push(
                    i === index
                        ? { ...components[i], isExpanded: false }
                        : components[i]
                );
            }

            formik.setFieldValue("components", updated);
            return;
        }

        // 🔼 EXPAND
        const res = await apiService.get(`/bom/positions/${bomId}`);

        const childBoms = res?.map(cb => ({
            ...cb,
            level: (parent.level ?? 0) + 1,
            parentId: parent.id,
            isExpanded: false,
            isChild: true
        }));

        const updated = [
            ...components.slice(0, index + 1),
            ...childBoms,
            ...components.slice(index + 1)
        ];

        updated[index] = { ...updated[index], isExpanded: true };
        formik.setFieldValue("components", updated);
    };


    const handlePositionAdd = (val) => {
        if (!val) return;
        const components = formik.values.components;
        const index = components.findIndex(c => c.id === val.id);
        if (index !== -1) {
            const updated = components[index]

            updated.quantity = components[index].quantity + 1;
            components[index] = updated;
            formik.setFieldValue("components", components);
            handleSearchChange("");
            return
        };


        const newPosition = (formik.values.components?.length + 1) * 10;
        formik.setFieldValue("components", [
            ...(formik.values.components || []),
            {
                ...val,
                quantity: 1,
                position: newPosition
            }
        ]);
        handleSearchChange("");
    }
    return (
        <Grid


        >
            <Typography variant="h6" gutterBottom>Components</Typography>

            <Autocomplete
                fullWidth
                size="small"
                options={searchedItemList}
                inputValue={searchQuery}
                onInputChange={(e, v, r) => r === "input" && handleSearchChange(v)}
                getOptionLabel={(o) =>
                    `${o.parentItemName} | ${o.parentItemCode} | ${o.bomName} | Rev (${o.revision})`
                }
                onChange={(e, val) => {
                    handlePositionAdd(val);
                }}
                renderInput={(params) =>
                    <TextField {...params}
                        sx={{
                            "& .MuiInputBase-input": { fontSize: 14 },
                            "& .MuiInputLabel-root": { fontSize: 14 },

                        }}

                        label="Add Component" />}
            />

            {/* COMPONENT TABLE */}
            <TableContainer
                component={Paper}
                sx={{

                    flexGrow: 1,
                    overflow: "auto",
                }}
            >
                <Table size="small" sx={{
                    mt: 2,
                    flexGrow: 1,
                    overflow: "auto",
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell>BOM</TableCell>
                            <TableCell>Component Name</TableCell>
                            <TableCell>Item Code</TableCell>
                            <TableCell>Drawing Number</TableCell>
                            <TableCell>Revision</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Scrap %</TableCell>
                            <TableCell>UOM</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {formik.values.components?.map((c, i) => (
                            <TableRow
                                key={i}
                                sx={{
                                    backgroundColor: c?.isChild ? "#fafafa" : "inherit",
                                    "& td": {
                                        color: c?.isChild ? "text.secondary" : "text.primary"
                                    }
                                }}
                            >
                                <TableCell
                                    sx={{
                                        pl: 1 + c?.level * 3,
                                        borderLeft: c?.level > 0 ? "1px dashed #ddd" : "none"
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        {c?.hasChildBom ? (
                                            <Tooltip title={c?.isExpanded ? "Collapse" : "Expand"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => showChildBom(i, c.id)}
                                                >
                                                    {c.isExpanded ? <ExpandLess /> : <ExpandMore />}
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Box sx={{ width: 28 }} /> // alignment spacer
                                        )}

                                        {c?.isChild && (
                                            <SubdirectoryArrowRightRounded
                                                fontSize="small"
                                                sx={{ color: "text.secondary" }}
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        disabled={c?.isChild}
                                        sx={{
                                            width: 70,
                                            "& .MuiInputBase-input": {
                                                fontSize: 13,
                                                textAlign: "center"
                                            }
                                        }}
                                        value={c?.position ?? ""}
                                        onChange={(e) => {
                                            if (c?.isChild) return;
                                            const arr = [...formik.values.components];
                                            arr[i].position = parseInt(e.target.value, 10);
                                            formik.setFieldValue("components", arr);
                                        }}
                                    />

                                </TableCell>

                                <TableCell sx={{ fontSize: 14, }}>{c?.bomName}</TableCell>
                                <TableCell sx={{ fontSize: 14, }}>{c?.parentItemName}</TableCell>
                                <TableCell sx={{ fontSize: 14, }}>{c?.parentItemCode}</TableCell>
                                <TableCell sx={{ fontSize: 14, }}>{c?.parentDrawingNumber}</TableCell>
                                <TableCell sx={{ fontSize: 14, }}>{c?.revision}</TableCell>


                                <TableCell>
                                    <TextField
                                        type="number"
                                        size="small"
                                        sx={{
                                            width: "80px",
                                            "& .MuiInputBase-input": { fontSize: 14 },
                                            "& .MuiInputLabel-root": { fontSize: 14 },
                                        }}
                                        value={c?.quantity}
                                        disabled={c?.isChild}
                                        onChange={(e) => {
                                            const arr = [...formik.values.components];
                                            arr[i].quantity = e.target.value;
                                            formik.setFieldValue("components", arr);
                                        }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        type="number"
                                        size="small"
                                        sx={{
                                            width: "80px",
                                            "& .MuiInputBase-input": { fontSize: 14 },
                                            "& .MuiInputLabel-root": { fontSize: 14 },
                                        }}
                                        value={c?.scrapPercentage ?? ""}
                                        disabled={c?.isChild}
                                        onChange={(e) => {
                                            const arr = [...formik.values.components];
                                            arr[i].scrapPercentage = e.target.value;
                                            formik.setFieldValue("components", arr);
                                        }}
                                    />
                                </TableCell>

                                <TableCell sx={{ fontSize: 14, }}>{c?.uom}</TableCell>

                                {!c?.isChild ?
                                    <TableCell>
                                        <IconButton onClick={() => moveRow(i, "up")}><ArrowUpward fontSize="small" /></IconButton>
                                        <IconButton onClick={() => moveRow(i, "down")}><ArrowDownward fontSize="small" /></IconButton>
                                        <IconButton color="error" onClick={() => {
                                            const updated = formik.values.components
                                                .filter((_, idx) => idx !== i)
                                                .map((item, idx) => ({
                                                    ...item,
                                                    position: (idx + 1) * 10
                                                }));
                                            formik.setFieldValue("components", updated);
                                        }}>
                                            <DeleteOutline />
                                        </IconButton>
                                    </TableCell>
                                    :
                                    <TableCell></TableCell>
                                }


                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Grid>
    );
};

export default BomPositionTable;
