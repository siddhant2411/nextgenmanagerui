import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Typography, Paper, Table, TableCell, TableContainer, TableHead,
  TableRow, Divider, CircularProgress, Checkbox, Toolbar, Tooltip,
  useMediaQuery, useTheme, TableBody, IconButton, TablePagination,
  Menu, MenuItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from "@mui/material";
import {
  Tune as TuneIcon, ArrowUpward, ArrowDownward,
  BookmarkAdded
} from "@mui/icons-material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import Stack from "@mui/material/Stack";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useNavigate } from "react-router-dom";
import { getWorkOrderList, getWorkOrderSummary, scheduleAllWorkOrders } from "../../../services/workOrderService";
import FilterBar from "../../ui/filterbar/FilterBar";
import { useAuth } from "../../../auth/AuthContext";
import { PRODUCTION_MANAGE_ROLES } from "../../../auth/roles";

dayjs.extend(isSameOrBefore);

/* ── Theme constants ── */
const HEADER_BG = '#f8fafc';
const HEADER_TEXT = '#475569';
const BORDER_COLOR = '#e2e8f0';
const ROW_BORDER = '#f1f5f9';
const ROW_EVEN = '#ffffff';
const ROW_ODD = '#ffffff';
const ROW_HOVER = '#f8fafc';

/* ── Status chip styling ── */
const statusStyles = {
  DRAFT:        { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
  CREATED:      { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
  SCHEDULED:    { bg: '#eef4fb', color: '#2a6496', border: '#c8dcf0' },
  RELEASED:     { bg: '#eaf0f9', color: '#1c4f87', border: '#bad0ec' },
  IN_PROGRESS:      { bg: '#f0edf9', color: '#5b3b9e', border: '#d4caea' },
  MATERIAL_REORDER: { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
  READY:            { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
  COMPLETED:    { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
  BLOCKED:      { bg: '#fbeeee', color: '#8a2222', border: '#e8c0c0' },
  CLOSED:       { bg: '#f5f5f5', color: '#6b6b6b', border: '#ddd' },
  CANCELLED:    { bg: '#fbeeee', color: '#8a2222', border: '#e8c0c0' },
  SHORT_CLOSED: { bg: '#fdf8ec', color: '#7a5a18', border: '#eddcaa' },
};

const statusLabels = {
  DRAFT: 'Draft', CREATED: 'Created', SCHEDULED: 'Scheduled', RELEASED: 'Released',
  IN_PROGRESS: 'In Progress', MATERIAL_REORDER: 'Material Re-order', READY: 'Ready', COMPLETED: 'Completed',
  BLOCKED: 'Blocked', CLOSED: 'Closed', CANCELLED: 'Cancelled',
  SHORT_CLOSED: 'Short Closed',
};

const PRIORITY_COLORS = {
  URGENT: { bg: '#fbeeee', color: '#8a2828', border: '#e8c0c0' },
  HIGH:   { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
  NORMAL: { bg: '#eef0fb', color: '#2a3a87', border: '#c0caec' },
  LOW:    { bg: '#f5f6f7', color: '#52606d', border: '#d8dde3' },
};

/* ── Header cell style ── */
const headerCellSx = {
  background: HEADER_BG,
  color: HEADER_TEXT,
  fontWeight: 700,
  fontSize: '0.6875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: `1px solid ${BORDER_COLOR}`,
  borderRight: 'none',
  whiteSpace: 'nowrap',
  py: '9px',
  px: '14px',
  userSelect: 'none',
};

/* ── Column definitions ── */
const allColumns = [
  { field: "workOrderNumber", headerName: "Document No.", width: 170, type: "string" },
  { field: "salesOrderNumber", headerName: "Reference Doc.", width: 170, type: "string" },
  { field: "priority", headerName: "Priority", width: 110, type: "enum", options: ["URGENT", "HIGH", "NORMAL", "LOW"] },
  { field: "bomName", headerName: "BOM", width: 180, type: "string" },
  { field: "status", headerName: "Status", width: 130, type: "enum", options: ["DRAFT", "CREATED", "SCHEDULED", "RELEASED", "IN_PROGRESS", "READY", "COMPLETED", "BLOCKED", "CLOSED", "CANCELLED", "SHORT_CLOSED"] },
  { field: "plannedQuantity", headerName: "Qty", width: 80, type: "number" },
  { field: "completedQuantity", headerName: "Completed", width: 100, type: "number" },
  { field: "dueDate", headerName: "Due Date", width: 130, type: "date" },
  { field: "plannedStartDate", headerName: "Start Date", width: 120, type: "date" },
  { field: "plannedEndDate", headerName: "End Date", width: 120, type: "date" },
  { field: "autoScheduled", headerName: "Scheduled", width: 100, type: "string" },
  { field: "workCenter", headerName: "Work Center", width: 150, type: "string" },
];

const getDefaultVisibleCols = (isNarrowDesktop, isMobile) => {
  let cols = allColumns.map(c => c.field);

  // Hide less important columns by default to make table visually fit within screen width
  const hiddenByDefault = ["plannedStartDate", "plannedEndDate", "autoScheduled", "workCenter", "salesOrderNumber"];
  cols = cols.filter(f => !hiddenByDefault.includes(f));

  if (isNarrowDesktop) {
    cols = cols.filter(f => !["bomName"].includes(f));
  }
  if (isMobile) {
    cols = cols.filter(f => !["completedQuantity", "priority"].includes(f));
  }
  return cols;
};

const defaultFilters = [
  { field: "status", operator: "!=", value: "CLOSED" },
  { field: "status", operator: "!=", value: "CANCELLED" },
  { field: "status", operator: "!=", value: "SHORT_CLOSED" },
];

const DATE_FIELDS = new Set([
  ...allColumns.filter(col => col.type?.toLowerCase() === "date").map(col => col.field),
  "actualEndDate", "actualStartDate",
]);

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = dayjs(dateStr);
  if (!d.isValid()) return "-";
  return d.format("DD MMM YYYY");
}

const getReferenceDoc = (item) => {
  if (!item) return "-";
  if (item.sourceType === "SALES_ORDER") return item.salesOrderNumber || item.salesOrder?.orderNumber || "-";
  if (item.sourceType === "PARENT_WORK_ORDER") return item.parentWorkOrderNumber || item.parentWorkOrder?.workOrderNumber || "-";
  if (item.sourceType === "MANUAL") return item.referenceDocument || "-";
  return item.referenceDocument || item.salesOrderNumber || item.parentWorkOrderNumber || "-";
};

/* ── Summary stat card ── */
const StatCard = ({ title, value, accent = '#1565c0', onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: '11px 14px',
      borderRadius: 1.5,
      border: `1px solid ${BORDER_COLOR}`,
      borderLeft: `3px solid ${accent}`,
      background: '#fff',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s',
      '&:hover': onClick ? { boxShadow: '0 4px 12px rgba(0,0,0,0.07)' } : undefined,
    }}
  >
    <Typography sx={{ fontSize: '0.65625rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: '5px' }}>{title}</Typography>
    <Typography sx={{ fontSize: '1.625rem', fontWeight: 500, color: '#1e293b', lineHeight: 1 }}>{value}</Typography>
  </Paper>
);

/* ── DueDateCell ── */
const DueDateCell = ({ dueDate }) => {
  const today = dayjs();
  const date = dayjs(dueDate);
  const overdue = date.isSameOrBefore(today, "day");
  const almostDue = !overdue && date.diff(today, "day") <= 2;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: overdue ? '#8a2222' : almostDue ? '#8a4a1c' : '#475569', fontWeight: overdue || almostDue ? 500 : 400 }}>
        {date.format("DD MMM YYYY")}
      </Typography>
      {overdue && <Box component="span" sx={{ ml: '6px', fontSize: '0.625rem', fontWeight: 600, bgcolor: '#fbeeee', color: '#8a2222', border: '1px solid #e8c0c0', borderRadius: '4px', px: '6px', py: '1px' }}>Overdue</Box>}
      {almostDue && <Box component="span" sx={{ ml: '6px', fontSize: '0.625rem', fontWeight: 600, bgcolor: '#fdf4ec', color: '#8a4a1c', border: '1px solid #efd0b0', borderRadius: '4px', px: '6px', py: '1px' }}>Soon</Box>}
    </Box>
  );
};

export default function WorkOrderList({ setLoading, loading, setError }) {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const canManageWorkOrders = hasAnyRole(PRODUCTION_MANAGE_ROLES);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isNarrowDesktop = useMediaQuery(theme.breakpoints.down("xl"));
  const [visibleCols, setVisibleCols] = useState(() => getDefaultVisibleCols(isNarrowDesktop, isMobile));
  const stableColumns = useMemo(() => [...allColumns], []);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemPerPage] = useState(10);
  const [WorkOrderListData, setWorkOrderListData] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortDir, setSortDir] = useState("asc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isScheduleAllLoading, setIsScheduleAllLoading] = useState(false);
  const [scheduleAllResult, setScheduleAllResult] = useState(null);
  const [scheduleAllDialogOpen, setScheduleAllDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [columnWidths, setColumnWidths] = useState(
    allColumns.reduce((acc, col) => { acc[col.field] = col.width || 150; return acc; }, {})
  );

  const displayedColumns = useMemo(() => {
    return stableColumns.filter((col) => visibleCols.includes(col.field));
  }, [stableColumns, visibleCols]);

  const tableMinWidth = useMemo(() => {
    const dynamicCols = displayedColumns.reduce((sum, col) => sum + (columnWidths[col.field] || col.width || 150), 0);
    return dynamicCols + 56 + 100; // checkbox + actions
  }, [displayedColumns, columnWidths]);

  const summaryValue = (value) => value === null || value === undefined ? "-" : value;

  /* ── Column resize ── */
  const resizingCol = useRef(null);
  const handleMouseDown = (e, field) => {
    if (isMobile) return;
    resizingCol.current = { field, startX: e.clientX, startWidth: columnWidths[field] };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    if (!resizingCol.current) return;
    const { field, startX, startWidth } = resizingCol.current;
    setColumnWidths((prev) => ({ ...prev, [field]: Math.max(80, startWidth + (e.clientX - startX)) }));
  };
  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleColumnToggle = (field) => {
    setVisibleCols((prev) => prev.includes(field) ? prev.filter((c) => c !== field) : [...prev, field]);
  };

  const handleSelectAll = (event) => {
    setSelectedRows(event.target.checked ? WorkOrderListData.map(wo => wo.id) : []);
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const handleChangeRowsPerPage = (event) => setItemPerPage(parseInt(event.target.value, 10));

  const onPageChange = (page) => {
    setCurrentPage(page);
    handleApplyFilters(filters, page, sortBy, sortDir);
  };

  const handleEditClick = (id) => {
    if (!canManageWorkOrders) return;
    navigate(`edit/${id}`);
  };

  const handleScheduleAll = async () => {
    try {
      setIsScheduleAllLoading(true);
      const result = await scheduleAllWorkOrders();
      setScheduleAllResult(result);
      setScheduleAllDialogOpen(true);
      handleApplyFilters(filters, currentPage, sortBy, sortDir);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to schedule work orders.');
    } finally {
      setIsScheduleAllLoading(false);
    }
  };

  useEffect(() => { onPageChange(0); }, [itemsPerPage]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setIsSummaryLoading(true);
        const response = await getWorkOrderSummary();
        setSummary(response);
      } catch (err) {
        // handled
      } finally {
        setIsSummaryLoading(false);
      }
    };
    loadSummary();
  }, []);

  const normalizeDateFilterValue = (value, operator) => {
    if (!value) return value;
    const trimmed = String(value).trim();
    if (!trimmed) return trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) return trimmed;
    const parsed = dayjs(trimmed);
    if (!parsed.isValid()) return value;
    if (trimmed.includes("T") || trimmed.includes(":")) return parsed.format("YYYY-MM-DD HH:mm:ss");
    const timePart = operator === "<" || operator === "<=" ? "23:59:59" : "00:00:00";
    return `${parsed.format("YYYY-MM-DD")} ${timePart}`;
  };

  const normalizeFilterValue = (filter) => {
    if (!filter || !DATE_FIELDS.has(filter.field)) return filter?.value;
    return normalizeDateFilterValue(filter.value, filter.operator);
  };

  const handleApplyFilters = async (appliedFilters = filters, page = currentPage, sortKey = sortBy, sortIn = sortDir) => {
    setLoading(true);
    try {
      const payload = {
        page, size: itemsPerPage, sortBy: sortKey, sortDir: sortIn,
        filters: appliedFilters.map(f => ({ field: f.field, operator: f.operator, value: normalizeFilterValue(f) })),
      };
      const response = await getWorkOrderList(payload);
      setWorkOrderListData(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  const handleSortChange = (sortField) => {
    const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(sortField);
    setSortDir(newSortDir);
    handleApplyFilters(filters, currentPage, sortField, newSortDir);
  };

  const applyCardFilters = (nextFilters = []) => {
    setSelectedRows([]);
    setCurrentPage(0);
    handleApplyFilters(nextFilters, 0, sortBy, sortDir);
    setFilters(nextFilters);
  };

  const handleSummaryCardClick = (key) => {
    const today = dayjs().format("YYYY-MM-DD");
    const dueSoonLimit = dayjs().add(2, "day").format("YYYY-MM-DD");
    const baseFilters = [...defaultFilters];
    let nextFilters = baseFilters;

    if (key === "overdue") nextFilters = [...baseFilters, { field: "dueDate", operator: "<", value: today }];
    if (key === "dueSoon") nextFilters = [...baseFilters, { field: "dueDate", operator: ">=", value: today }, { field: "dueDate", operator: "<=", value: dueSoonLimit }];
    if (key === "ready") nextFilters = [...baseFilters, { field: "status", operator: "=", value: "READY" }];
    if (key === "inProgress") nextFilters = [...baseFilters, { field: "status", operator: "=", value: "IN_PROGRESS" }];
    if (key === "completingToday") nextFilters = [...baseFilters, { field: "status", operator: "!=", value: "COMPLETED" }, { field: "plannedEndDate", operator: ">=", value: today }, { field: "plannedEndDate", operator: "<=", value: today }];
    if (key === "blocked") nextFilters = [...baseFilters, { field: "status", operator: "=", value: "BLOCKED" }];

    applyCardFilters(nextFilters);
  };

  /* ── Render helpers ── */
  const renderStatusChip = (status) => {
    const style = statusStyles[status] || { bg: '#f5f5f5', color: '#6b6b6b', border: '#ddd' };
    const label = statusLabels[status] || status || '-';
    return (
      <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '9px', py: '2px', fontSize: '0.6875rem', fontWeight: 600, border: `1px solid ${style.border}`, bgcolor: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
        {label}
      </Box>
    );
  };

  const renderPriorityChip = (priority) => {
    const style = PRIORITY_COLORS[priority] || PRIORITY_COLORS.NORMAL;
    return (
      <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '9px', py: '2px', fontSize: '0.6875rem', fontWeight: 600, border: `1px solid ${style.border}`, bgcolor: style.bg, color: style.color, whiteSpace: 'nowrap' }}>
        {priority || '-'}
      </Box>
    );
  };

  return (
    <Box sx={{
      minHeight: '100%',
      p: { xs: 1.5, sm: 2, md: 3 },
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      overflowX: 'hidden',
    }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          margin: 'auto',
          borderRadius: 2,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {/* ── Page Header ── */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1,
            px: 0.5,
            pb: 1.5,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              Work Orders
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Track production work orders, scheduling and execution
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleScheduleAll}
              disabled={!canManageWorkOrders || isScheduleAllLoading}
              startIcon={isScheduleAllLoading ? <CircularProgress size={14} /> : null}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
                borderColor: BORDER_COLOR,
                color: '#374151',
                '&:hover': { borderColor: '#1565c0', color: '#1565c0' },
              }}
            >
              {isScheduleAllLoading ? 'Scheduling...' : 'Schedule All'}
            </Button>
            <Button
              onClick={() => navigate("add")}
              variant="contained"
              disabled={!canManageWorkOrders}
              startIcon={<AddCircleOutlineIcon />}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 2.5,
                boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                bgcolor: '#1565c0',
                '&:hover': { bgcolor: '#0d47a1' },
              }}
            >
              Add Work Order
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── Summary Cards ── */}
        <Box
          sx={{
            mb: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            gap: 1.5,
          }}
        >
          <StatCard title="Overdue" value={isSummaryLoading ? "..." : summaryValue(summary?.overdue)} accent="#b84040" onClick={() => handleSummaryCardClick("overdue")} />
          <StatCard title="Due Soon" value={isSummaryLoading ? "..." : summaryValue(summary?.dueSoon)} accent="#c47830" onClick={() => handleSummaryCardClick("dueSoon")} />
          <StatCard title="Ready" value={isSummaryLoading ? "..." : summaryValue(summary?.ready)} accent="#4a8fc0" onClick={() => handleSummaryCardClick("ready")} />
          <StatCard title="In Progress" value={isSummaryLoading ? "..." : summaryValue(summary?.inProgress)} accent="#7c5cbf" onClick={() => handleSummaryCardClick("inProgress")} />
          <StatCard title="Completed Today" value={isSummaryLoading ? "..." : summaryValue(summary?.completedToday)} accent="#4a9460" onClick={() => handleSummaryCardClick("completingToday")} />
          <StatCard title="Blocked" value={isSummaryLoading ? "..." : summaryValue(summary?.blocked)} accent="#b84040" onClick={() => handleSummaryCardClick("blocked")} />
        </Box>

        {/* ── Filter Bar + Column Toggle ── */}
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            alignItems: { xs: 'stretch', xl: 'center' },
            flexDirection: { xs: 'column', xl: 'row' },
            gap: 1.5,
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
            <FilterBar
              allColumns={allColumns}
              filters={filters}
              setFilters={setFilters}
              page={currentPage}
              handleApplyFilters={handleApplyFilters}
              sortKey={sortBy}
              sortDir={sortDir}
            />
          </Box>
          <Button
            startIcon={<TuneIcon />}
            variant="outlined"
            size="small"
            sx={{
              minWidth: { xs: '100%', xl: 120 },
              height: 36,
              textTransform: 'none',
              flexShrink: 0,
              borderColor: BORDER_COLOR,
              color: '#374151',
              fontWeight: 500,
              '&:hover': { borderColor: '#1565c0', color: '#1565c0' },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            Columns
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ style: { maxHeight: 420 } }}>
            {allColumns.map(col => (
              <MenuItem key={col.field} onClick={() => handleColumnToggle(col.field)} dense>
                <Checkbox checked={visibleCols.includes(col.field)} size="small" />
                <ListItemText primary={col.headerName} />
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* ── Loading ── */}
        {loading && (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="40vh" gap={2}>
            <CircularProgress size={36} sx={{ color: '#1565c0' }} />
            <Typography variant="body2" color="text.secondary">Loading work orders...</Typography>
          </Box>
        )}

        {/* ── Table ── */}
        {!loading && (
          <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', position: 'relative' }}>
            <TableContainer
              component={Box}
              sx={{
                borderRadius: 1.5,
                border: `1px solid ${BORDER_COLOR}`,
                maxHeight: 'calc(100vh - 280px)',
                overflowY: 'auto',
                overflowX: 'auto',
                width: '100%',
                maxWidth: '100%',
              }}
            >
              <Table stickyHeader size="small" sx={{ tableLayout: 'auto', minWidth: tableMinWidth, width: '100%', borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ ...headerCellSx, width: 56 }}>
                      <Checkbox
                        indeterminate={selectedRows?.length > 0 && selectedRows?.length < WorkOrderListData?.length}
                        checked={WorkOrderListData?.length > 0 && selectedRows?.length === WorkOrderListData?.length}
                        onChange={handleSelectAll}
                        sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#2563eb' }, '&.MuiCheckbox-indeterminate': { color: '#2563eb' } }}
                      />
                    </TableCell>

                    {displayedColumns.map((col) => (
                      <TableCell
                        key={col.field}
                        sx={{
                          ...headerCellSx,
                          width: columnWidths[col.field] || col.width || 150,
                          minWidth: columnWidths[col.field] || col.width || 150,
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onClick={() => handleSortChange(col.field)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.headerName}</span>
                          {sortBy === col.field && (
                            sortDir === 'asc'
                              ? <ArrowUpward sx={{ fontSize: 14, color: '#64748b' }} />
                              : <ArrowDownward sx={{ fontSize: 14, color: '#64748b' }} />
                          )}
                          {!isMobile && (
                            <div
                              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, col.field); }}
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    ))}

                    <TableCell align="center" sx={{ ...headerCellSx, width: 90 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {WorkOrderListData?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={displayedColumns.length + 2} align="center" sx={{ py: 10 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" color="text.secondary">No Work Orders Found</Typography>
                          <Typography variant="body2" color="text.disabled">Adjust your filters or create a new Work Order to get started.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  {WorkOrderListData?.map((item, index) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        background: index % 2 === 0 ? ROW_EVEN : ROW_ODD,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        '&:hover': { background: ROW_HOVER },
                        '& td': { borderBottom: `1px solid ${ROW_BORDER}`, fontSize: '0.8125rem', py: '10px', px: '14px', color: '#475569' },
                      }}
                    >
                      <TableCell padding="checkbox" align="center">
                        <Checkbox color="primary" size="small" checked={selectedRows.includes(item.id)} onChange={() => handleSelectRow(item.id)} />
                      </TableCell>

                      {displayedColumns.map((col) => (
                        <TableCell
                          key={`${item.id}-${col.field}`}
                          sx={{
                            width: columnWidths[col.field] || col.width || 150,
                            minWidth: columnWidths[col.field] || col.width || 150,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          align={col.align || "left"}
                          onClick={() => handleEditClick(item.id)}
                        >
                          {col.field === "status"
                            ? renderStatusChip(item.status)
                            : col.field === "priority"
                              ? renderPriorityChip(item.priority)
                              : col.field === "autoScheduled"
                                ? (item.autoScheduled
                                  ? <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '9px', py: '2px', fontSize: '0.6875rem', fontWeight: 600, border: '1px solid #c8dcf0', bgcolor: '#eef4fb', color: '#2a6496', whiteSpace: 'nowrap' }}>Auto</Box>
                                  : <span style={{ color: '#9ca3af' }}>—</span>)
                                : col.field === "dueDate"
                                  ? (item.dueDate ? <DueDateCell dueDate={item.dueDate} /> : "-")
                                  : col.field === "plannedStartDate" || col.field === "plannedEndDate"
                                    ? formatDate(item[col.field])
                                    : col.field === "salesOrderNumber"
                                      ? (
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Typography variant="body2">{getReferenceDoc(item)}</Typography>
                                            {item.status === 'COMPLETED' && item.sourceType === 'SALES_ORDER' && (
                                              <Tooltip title="Stock Booked / Reserved">
                                                <BookmarkAdded sx={{ fontSize: 16, color: '#10b981' }} />
                                              </Tooltip>
                                            )}
                                          </Stack>
                                        )
                                      : col.field === "workOrderNumber"
                                        ? <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>{item[col.field] || "-"}</Typography>
                                        : col.field === "bomName"
                                          ? <Typography variant="body2" sx={{ fontWeight: 500 }}>{item[col.field] || "-"}</Typography>
                                          : (item[col.field] !== undefined && item[col.field] !== null ? item[col.field].toString() : "-")
                          }
                        </TableCell>
                      ))}

                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        {canManageWorkOrders && (
                          <Tooltip title="View / Edit">
                            <IconButton onClick={() => handleEditClick(item.id)} size="small">
                              <EditIcon fontSize="small" sx={{ color: '#1565c0' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* ── Pagination ── */}
            <TablePagination
              component="div"
              count={totalElements}
              page={currentPage}
              onPageChange={(e, page) => onPageChange(page)}
              rowsPerPage={itemsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: `1px solid ${BORDER_COLOR}`,
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.8125rem' },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* ── Schedule All Result Dialog ── */}
      <Dialog open={scheduleAllDialogOpen} onClose={() => setScheduleAllDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Batch Schedule Results</DialogTitle>
        <DialogContent>
          {scheduleAllResult && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {scheduleAllResult.scheduledCount ?? 0} work order(s) scheduled
              </Typography>
              {scheduleAllResult.warnings?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>Warnings:</Typography>
                  {scheduleAllResult.warnings.map((w, i) => (
                    <Alert key={i} severity="warning" sx={{ mb: 0.5, fontSize: '0.8rem' }}>{w}</Alert>
                  ))}
                </Box>
              )}
              {scheduleAllResult.failures?.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 0.5 }}>Failures:</Typography>
                  {scheduleAllResult.failures.map((f, i) => (
                    <Alert key={i} severity="error" sx={{ mb: 0.5, fontSize: '0.8rem' }}>{f}</Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleAllDialogOpen(false)} sx={{ textTransform: 'none', color: '#374151' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
