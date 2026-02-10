import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  Checkbox,
  Toolbar,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
  TableBody,
  IconButton,
  Stack,
  TablePagination,
} from "@mui/material";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useNavigate } from "react-router-dom";
import { getWorkOrderList } from "../../../services/workOrderService";
import FilterBar from "../../ui/filterbar/FilterBar";

dayjs.extend(isSameOrBefore);

const StatusChip = ({ status }) => {
  const colorMap = {
    DRAFT: "default",
    CREATED: "default",
    RELEASED: "primary",
    IN_PROGRESS: "primary",
    READY: "warning",
    COMPLETED: "success",
    CLOSED: "default",
    CANCELLED: "error",
  };

  return (
    <Chip
      label={status}
      color={colorMap[status] || "default"}
      size="small"
      sx={{ fontSize: 11, minWidth: 90 }}
    />
  );
};

const DueDateCell = ({ dueDate }) => {
  const today = dayjs();
  const date = dayjs(dueDate);

  return (
    <>
      {date.format("DD-MM-YYYY")}
      {date.isSameOrBefore(today, "day") ? (
        <Tooltip title="Overdue">
          <span style={{ color: "red", marginLeft: 4 }}>⚠️</span>
        </Tooltip>
      ) : date.diff(today, "day") <= 2 ? (
        <Tooltip title="Almost Due">
          <span style={{ color: "orange", marginLeft: 4 }}>⏳</span>
        </Tooltip>
      ) : null}
    </>
  );
};

const getReferenceDoc = (item) => {
  if (!item) return "-";
  if (item.sourceType === "SALES_ORDER") {
    return (
      item.salesOrderNumber ||
      item.salesOrder?.orderNumber ||
      "-"
    );
  }
  if (item.sourceType === "PARENT_WORK_ORDER") {
    return (
      item.parentWorkOrderNumber ||
      item.parentWorkOrder?.workOrderNumber ||
      "-"
    );
  }
  if (item.sourceType === "MANUAL") {
    return item.referenceDocument || "-";
  }
  return item.referenceDocument || item.salesOrderNumber || item.parentWorkOrderNumber || "-";
};

const allColumns = [
  { field: "workOrderNumber", headerName: "Document No.", width: 200, type: "string" },
  { field: "salesOrderNumber", headerName: "Reference Doc.", width: 200, type: "string" },
  { field: "bomName", headerName: "BOM", width: 180, type: "string" },
  { field: "status", headerName: "Status", width: 140, type: "enum", options: ["DRAFT", "CREATED", "RELEASED", "IN_PROGRESS", "READY", "COMPLETED", "CLOSED", "CANCELLED"] },
  { field: "plannedQuantity", headerName: "Qty", width: 100, type: "number" },
  { field: "completedQuantity", headerName: "Completed", width: 130, type: "number" },
  { field: "dueDate", headerName: "Due Date", width: 150, type: "string" },
  { field: "workCenter", headerName: "Work Center", width: 180, type: "string" }
];

export default function WorkOrderList({ setLoading, loading, setError }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [itemsPerPage, setItemPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [WorkOrderList, setWorkOrderList] = useState([]);
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("workOrderNumber");
  const [sortDir, setSortDir] = useState("asc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [columnWidths, setColumnWidths] = useState(
    allColumns.reduce((acc, col) => {
      acc[col.field] = col.width;
      return acc;
    }, {})
  );

  const tableMinWidth = useMemo(() => {
    return allColumns.reduce((sum, col) => {
      const width = columnWidths[col.field] || col.width || 150;
      return sum + width;
    }, 56); // include checkbox column
  }, [columnWidths]);

  const resizingCol = useRef(null);

  const handleMouseDown = (e, field) => {
    if (isMobile) return;

    resizingCol.current = {
      field,
      startX: e.clientX,
      startWidth: columnWidths[field],
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!resizingCol.current) return;

    const { field, startX, startWidth } = resizingCol.current;
    const diff = e.clientX - startX;

    setColumnWidths((prev) => ({
      ...prev,
      [field]: Math.min(400, Math.max(100, startWidth + diff)),
    }));
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };


  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleChangeRowsPerPage = (event) => {

    setItemPerPage(parseInt(event.target.value, 10));

  };

  const onPageChange = (page) => {

    setCurrentPage(page)
    handleApplyFilters(filters, page, sortBy, sortDir)
  }


  const handleEditClick = (id) => navigate(`edit/${id}`);

  useEffect(() => {
    onPageChange(0)

  }, [itemsPerPage])


  const handleFilterApplied = (data) => {
    setWorkOrderList(data.content);
    setTotalPages(data.totalPages);
    setTotalElements(data.totalElements)
  };
  


  const handleApplyFilters = async (appliedFilters = filters, page = currentPage, sortKey = sortBy, sortIn = sortDir) => {
    setLoading(true)
    try {
      const payload = {
        page: page,
        size: itemsPerPage,
        sortBy: sortKey,
        sortDir: sortIn,
        filters: appliedFilters.map(f => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        })),
      };
      const response = await getWorkOrderList(payload);
      handleFilterApplied(response);
    } catch (err) {
      setError(err.message || "Something went wrong")
      console.error("Filter apply failed:", err);
    }
    setLoading(false)
  };

  const handleSortChange = (sortField) => {
    const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(sortField);
    setSortDir(newSortDir);
    handleApplyFilters(filters, currentPage, sortField, newSortDir)
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = WorkOrderList?.map(wo => wo.id);
      setSelectedRows(allIds);
    } else {
      setSelectedRows([]);
    }
  };
  return (
    <Box
      sx={{
        fontFamily: "'IBM Plex Sans', system-ui",
        background: "linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)",
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: "1px solid #e3e8ef",
          boxShadow: "0 10px 26px rgba(2, 12, 27, 0.08)",
          backgroundColor: "#ffffff",
        }}
      >
        <Toolbar
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            background:
              "linear-gradient(90deg, rgba(248,250,252,1) 0%, rgba(238,242,247,1) 100%)",
            border: "1px solid #e5e9f2",
            mb: 2,
          }}
        >
        
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ width: "100%", alignItems: { xs: "stretch", sm: "center" } }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: "primary.main",
                fontSize: { xs: "1.15rem", sm: "1.5rem" },
                letterSpacing: 0.2,
              }}
            >
              Work Orders
            </Typography>

            <Box sx={{ flex: 1 }} />

            <Button
              size="small"
              variant="contained"
              onClick={() => navigate("add")}
              sx={{
                alignSelf: { xs: "stretch", sm: "auto" },
                textTransform: "none",
                borderRadius: 1.25,
                px: 1.75,
                py: 0.5,
                minWidth: { xs: "100%", sm: 126 },
                fontSize: "0.8rem",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.22)",
              }}
            >
              Add Work Order
            </Button>
          </Stack>
        </Toolbar>

        <Divider sx={{ mb: 2 }} />
        <FilterBar
          allColumns={allColumns}
          filters={filters}
          setFilters={setFilters}
          page={currentPage}
          handleApplyFilters={handleApplyFilters}
          sortKey={sortBy}
          sortDir={sortDir}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {isMobile ? (
              <Stack spacing={1.5}>
                {WorkOrderList?.map((item) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      borderColor: "#e3e8ef",
                      background:
                        "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.workOrderNumber || "-"}
                      </Typography>
                      <StatusChip status={item.status || "DRAFT"} />
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={`Qty: ${item.plannedQuantity ?? "-"}`}
                      />
                      <Chip
                        size="small"
                        label={`Completed: ${item.completedQuantity ?? "-"}`}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Due:{" "}
                      {item.dueDate ? (
                        <DueDateCell dueDate={item.dueDate} />
                      ) : (
                        "-"
                      )}
                    </Typography>

                    <Divider />

                    <Typography variant="body2">
                      Reference Doc: {getReferenceDoc(item)}
                    </Typography>
                    <Typography variant="body2">
                      BOM: {item.bomName || "-"}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        onClick={() => handleEditClick(item.id)}
                      >
                        View
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <TableContainer
                  sx={{
                    maxHeight: "70vh",
                    borderRadius: 1.5,
                    border: "1px solid #e5e9f2",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <Table
                    stickyHeader
                    size="small"
                    sx={{
                      tableLayout: "auto",
                      minWidth: tableMinWidth,
                      width: "100%",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: 56 }} />
                      {allColumns.map((col) => (
                        <col
                          key={col.field}
                          style={{
                            minWidth:
                              columnWidths[col.field] || col.width || 150,
                            width:
                              col.field === "bomName"
                                ? "auto"
                                : columnWidths[col.field] || col.width || 150,
                          }}
                        />
                      ))}
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          padding="checkbox"
                          sx={{
                            background: "#0b1b2b",
                            borderBottom: "1px solid #1f2b3a",
                          }}
                          onChange={handleSelectAll}
                        >
                          <Checkbox sx={{ color: "white" }} />
                        </TableCell>

                        {allColumns.map((col) => (
                          <TableCell
                            key={col.field}
                            sx={{
                              minWidth:
                                columnWidths[col.field] || col.width || "150px",
                              width:
                                col.field === "bomName"
                                  ? "auto"
                                  : columnWidths[col.field] || col.width || "150px",
                              background: "#0b1b2b",
                              color: "#e6edf5",
                              fontWeight: 600,
                              fontSize: { xs: "0.75rem", sm: "0.875rem" },
                              borderRight: "1px solid #1f2b3a",
                              position: "relative",
                              borderBottom: "1px solid #1f2b3a",
                              cursor: "pointer",
                            }}
                            onClick={() => handleSortChange(col.field)}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                pr: 1,
                              }}
                            >
                              <span>{col.headerName}</span>
                              <span>
                                {sortBy === col.field ? (sortDir === "asc" ? "^" : "v") : ""}
                              </span>
                            </Box>

                            {/* Resize handle (desktop only) */}
                            {!isMobile && (
                              <Box
                                onMouseDown={(e) =>
                                  handleMouseDown(e, col.field)
                                }
                                sx={{
                                  position: "absolute",
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: 6,
                                  cursor: "col-resize",
                                }}
                              />
                            )}
                          </TableCell>




                        ))}

                        <TableCell
                          padding="checkbox"
                          sx={{
                            minWidth:
                              "150px",
                            width:
                              "150px",
                            background: "#0b1b2b",
                            color: "#e6edf5",
                            fontWeight: 600,
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            borderRight: "1px solid #1f2b3a",
                            position: "relative",
                            borderBottom: "1px solid #1f2b3a",
                          }}

                        >
                          ACTIONS
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {WorkOrderList?.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          sx={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f7f9fc",
                            "&:hover": { backgroundColor: "#eef2ff" },
                          }}
                        >
                          <TableCell padding="checkbox" align="center">
                            <Checkbox
                              color="primary"
                              checked={selectedRows.includes(item.id)}
                              onChange={() => handleSelectRow(item.id)}
                            />
                          </TableCell>

                          {allColumns?.map((col) => (
                            <TableCell
                              key={`${item.id}-${col.field}`}
                              sx={{
                                minWidth:
                                  columnWidths[col.field] || col.width || "150px",
                                width:
                                  col.field === "bomName"
                                    ? "auto"
                                    : columnWidths[col.field] || col.width || "150px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontSize: { xs: "0.78rem", sm: "0.875rem" },
                              }}
                              align={col.align || "left"}
                              onClick={() => {
                                handleEditClick(item.id);
                              }}
                            >
                              {col.field === "status" ? (
                                <StatusChip status={item.status || "DRAFT"} />
                              ) : col.field === "dueDate" ? (
                                item.dueDate ? (
                                  <DueDateCell dueDate={item.dueDate} />
                                ) : (
                                  "-"
                                )
                              ) : col.field === "salesOrderNumber" ? (
                                getReferenceDoc(item)
                              ) : item[col.field] !== undefined &&
                                item[col.field] !== null ? (
                                item[col.field].toString()
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          ))}

                          {/* Actions */}
                          <TableCell align="center" onClick={null}>
                            <IconButton
                              // onClick={() => handleDeleteClick(item.id)}
                              size="small"
                            >
                              {/* <DeleteIcon fontSize="small" sx={{ color: "rgba(211, 0, 0, 1)" }} /> */}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </Paper>
      <TablePagination
        component="div"
        count={totalElements}
        page={currentPage}
        onPageChange={(e, page) => onPageChange(page)}
        rowsPerPage={itemsPerPage}
        rowsPerPageOptions={[5, 10]}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}
