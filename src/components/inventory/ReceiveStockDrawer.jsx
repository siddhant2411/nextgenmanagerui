import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  TextField,
  Button,
  Stack,
  MenuItem,
  Divider,
  Alert,
  Autocomplete,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Close, MoveToInbox, OpenInNew } from '@mui/icons-material';
import { format } from 'date-fns';
import { receiveStock, searchInventoryItems, resolveApiErrorMessage } from '../../services/inventoryService';
import { createGRN, getPurchaseOrder } from '../../services/grnService';
import { getPendingReceiptPOs } from '../../services/purchaseOrderService';
import { getWorkOrderList, getWorkOrder, completeWorkOrder } from '../../services/workOrderService';
import { useAuth } from '../../auth/AuthContext';
import WarehouseSelect from '../common/WarehouseSelect';
import { serverFiltered, renderItemOption, itemLabel } from '../common/itemPicker';

/*
 * One drawer, four ways stock comes in. The source decides both the fields shown and the document
 * the receipt is posted on, so nothing lands in stock without one:
 *
 *   PURCHASE_ORDER  pick an order awaiting goods, receive its lines  -> goods receipt note on that order
 *   WORK_ORDER      pick a work order in production                  -> completes it, which books its output
 *   NO_PO           goods that arrived without an order              -> goods receipt note with no order
 *   OPENING_STOCK   stock held before the system went live           -> opening stock entry
 */
const SOURCES = [
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'WORK_ORDER',     label: 'Work Order Production' },
  { value: 'NO_PO',          label: 'Receipt without Purchase Order' },
  { value: 'OPENING_STOCK',  label: 'Opening Stock' },
];

// A work order can only be completed, and so book output, from these states.
const COMPLETABLE = ['IN_PROGRESS', 'READY_FOR_PRODUCTION'];
// Nothing more can be received against these.
const FINISHED = ['COMPLETED', 'CLOSED', 'CANCELLED', 'SHORT_CLOSED'];
const statusLabel = (s) => (s || '').replace(/_/g, ' ').toLowerCase();

const rowsOf = (resp) => (Array.isArray(resp) ? resp : resp?.content || []);
const num = (v) => parseFloat(v) || 0;
const today = () => format(new Date(), 'yyyy-MM-dd');
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

const emptyForm = (item) => ({
  quantity: 1,
  costPerUnit: item?.standardCost || 0,
  batchNo: '',
  entryDate: today(),
  warehouse: '',
  remarks: '',
});

const SectionLabel = ({ children }) => (
  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block' }}>
    {children}
  </Typography>
);

const ReceiveStockDrawer = ({ open, onClose, item: presetItem, onRowUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('PURCHASE_ORDER');
  const [formData, setFormData] = useState(emptyForm(null));

  // Item search (receipt without an order, opening stock)
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const itemSearchTimeout = useRef(null);

  // Purchase order
  const [poList, setPoList] = useState([]);
  const [poLoading, setPoLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poLines, setPoLines] = useState([]);

  // Work order
  const [woList, setWoList] = useState([]);
  const [woLoading, setWoLoading] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [woDetail, setWoDetail] = useState(null);
  const woSearchTimeout = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSource('PURCHASE_ORDER');
    setFormData(emptyForm(presetItem));
    setSelectedItem(presetItem || null);
    setSelectedPO(null);
    setPoLines([]);
    setSelectedWO(null);
    setWoDetail(null);
    setError('');
  }, [presetItem, open]);

  useEffect(() => {
    if (!open) return;
    if (source === 'PURCHASE_ORDER') loadPOs();
    if (source === 'WORK_ORDER') searchWorkOrders('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, open]);

  const loadPOs = async () => {
    setPoLoading(true);
    try {
      setPoList(rowsOf(await getPendingReceiptPOs()));
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Failed to load purchase orders.'));
    } finally {
      setPoLoading(false);
    }
  };

  const handlePOChange = async (po) => {
    setSelectedPO(po);
    setPoLines([]);
    setError('');
    if (!po) return;
    try {
      const detail = await getPurchaseOrder(po.id);
      const lines = (detail?.items || [])
        .map((poi) => {
          const due = Math.max(0, (poi.quantityOrdered || 0) - (poi.quantityReceived || 0));
          return {
            inventoryItemId: poi.itemId,
            itemCode: poi.itemCode || '',
            itemName: poi.itemName || '',
            uom: poi.uom || '',
            orderedQty: poi.quantityOrdered || 0,
            alreadyReceived: poi.quantityReceived || 0,
            receiveQty: due,
            rate: poi.unitPrice || 0,
            batchNo: '',
          };
        })
        // Opened from a stock row: only that item's lines are being received.
        .filter((l) => !presetItem || l.inventoryItemId === presetItem.inventoryItemId);
      setPoLines(lines);
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Failed to load the purchase order.'));
    }
  };

  const updatePoLine = (idx, field, value) =>
    setPoLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const searchWorkOrders = (query) => {
    clearTimeout(woSearchTimeout.current);
    woSearchTimeout.current = setTimeout(async () => {
      setWoLoading(true);
      try {
        // Every work order still open is listed, with its status, so the one being looked for is
        // always findable. Whether it can be received yet is said once it is picked.
        const resp = await getWorkOrderList({
          page: 0,
          size: 50,
          sortBy: 'workOrderNumber',
          sortDir: 'desc',
          filters: [
            ...FINISHED.map((status) => ({ field: 'status', operator: '!=', value: status })),
            ...(query ? [{ field: 'workOrderNumber', operator: 'contains', value: query }] : []),
          ],
        });
        setWoList(rowsOf(resp));
      } catch (err) {
        setError(resolveApiErrorMessage(err, 'Failed to load work orders.'));
      } finally {
        setWoLoading(false);
      }
    }, query ? 400 : 0);
  };

  const handleWOChange = async (wo) => {
    setSelectedWO(wo);
    setWoDetail(null);
    setError('');
    if (!wo) return;
    try {
      setWoDetail(await getWorkOrder(wo.id));
    } catch (err) {
      setError(resolveApiErrorMessage(err, 'Failed to load the work order.'));
    }
  };

  const handleItemSearch = (query) => {
    clearTimeout(itemSearchTimeout.current);
    if (!query || query.length < 2) return;
    itemSearchTimeout.current = setTimeout(async () => {
      try {
        const resp = await searchInventoryItems({ query, page: 0, size: 20 });
        setItems(resp?.content || []);
      } catch (err) {
        console.error('Failed to fetch items', err);
      }
    }, 400);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createdBy = user?.username || 'system';
  const grnLine = (l) => ({
    inventoryItemId: l.inventoryItemId,
    orderedQty: num(l.orderedQty),
    receivedQty: num(l.receiveQty),
    acceptedQty: num(l.receiveQty),
    rejectedQty: 0,
    rate: num(l.rate),
    amount: num(l.receiveQty) * num(l.rate),
    supplierBatchNo: l.batchNo || null,
  });

  const submitters = {
    PURCHASE_ORDER: async () => {
      const lines = poLines.filter((l) => num(l.receiveQty) > 0);
      if (!selectedPO) throw new Error('Select the purchase order the goods came against.');
      if (!lines.length) throw new Error('Enter a quantity to receive on at least one line.');
      await createGRN({
        purchaseOrderId: selectedPO.id,
        vendorId: null,
        grnDate: today(),
        warehouse: formData.warehouse,
        remarks: formData.remarks,
        createdBy,
        items: lines.map(grnLine),
      });
    },
    WORK_ORDER: async () => {
      if (!selectedWO) throw new Error('Select the work order whose output is being received.');
      await completeWorkOrder(selectedWO.id);
    },
    NO_PO: async () => {
      if (!selectedItem) throw new Error('Please select an item first.');
      if (num(formData.quantity) <= 0) throw new Error('Quantity must be greater than zero.');
      if (!formData.remarks.trim()) throw new Error('Say why these goods have no purchase order.');
      await createGRN({
        purchaseOrderId: null,
        vendorId: null,
        grnDate: today(),
        warehouse: formData.warehouse,
        remarks: formData.remarks,
        createdBy,
        items: [grnLine({
          inventoryItemId: selectedItem.inventoryItemId,
          orderedQty: 0,
          receiveQty: formData.quantity,
          rate: formData.costPerUnit,
          batchNo: formData.batchNo,
        })],
      });
    },
    OPENING_STOCK: async () => {
      if (!selectedItem) throw new Error('Please select an item first.');
      if (num(formData.quantity) <= 0) throw new Error('Quantity must be greater than zero.');
      await receiveStock({
        inventoryItemId: selectedItem.inventoryItemId,
        procurementDecision: 'OPENING_STOCK',
        referenceId: 0,
        quantity: num(formData.quantity),
        costPerUnit: num(formData.costPerUnit),
        entryDate: formData.entryDate || null,
        batchNo: formData.batchNo || null,
        warehouse: formData.warehouse || null,
        createdBy,
      });
    },
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await submitters[source]();
      onRowUpdate?.();
      onClose();
    } catch (err) {
      setError(err?.response ? resolveApiErrorMessage(err, 'Failed to receive stock.') : err.message);
    } finally {
      setLoading(false);
    }
  };

  const needsItem = source === 'NO_PO' || source === 'OPENING_STOCK';
  const woReceivable = !!selectedWO && COMPLETABLE.includes(selectedWO.status);
  const submitLabel = {
    PURCHASE_ORDER: 'Post Goods Receipt',
    WORK_ORDER: 'Complete & Receive Output',
    NO_PO: 'Post Goods Receipt',
    OPENING_STOCK: 'Save Opening Stock',
  }[source];

  const itemBlock = presetItem ? (
    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
      <SectionLabel>Selected Item</SectionLabel>
      <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#1e293b' }}>
        {presetItem.itemCode}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {presetItem.name}
      </Typography>
    </Box>
  ) : needsItem ? (
    <Autocomplete
      options={items}
      filterOptions={serverFiltered}
      renderOption={renderItemOption}
      getOptionLabel={itemLabel}
      isOptionEqualToValue={(o, v) => o.inventoryItemId === v.inventoryItemId}
      value={selectedItem}
      onInputChange={(_, value, reason) => { if (reason === 'input') handleItemSearch(value); }}
      onChange={(_, value) => {
        setSelectedItem(value);
        if (value) setFormData(prev => ({ ...prev, costPerUnit: value.standardCost || 0 }));
      }}
      renderInput={(params) => (
        <TextField {...params} label="Item" required placeholder="Type code or name..." sx={fieldSx} />
      )}
    />
  ) : null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, p: 0, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }
      }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'flex' }}>
              <MoveToInbox sx={{ color: '#0f172a' }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>Receive Stock</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Stack spacing={3} sx={{ flex: 1, overflowY: 'auto', px: 0.5, pt: 0.5 }}>
          <TextField
            select
            label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            fullWidth
            sx={fieldSx}
          >
            {SOURCES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>

          {itemBlock}

          {source === 'PURCHASE_ORDER' && (
            <>
              <Autocomplete
                options={poList}
                loading={poLoading}
                getOptionLabel={(o) => `${o.purchaseOrderNumber || ''}${o.vendorName ? ' — ' + o.vendorName : ''}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={selectedPO}
                onChange={(_, v) => handlePOChange(v)}
                noOptionsText="No purchase orders are awaiting receipt"
                renderInput={(params) => (
                  <TextField {...params} label="Purchase Order" required sx={fieldSx}
                    helperText="Orders sent to the vendor and not yet fully received" />
                )}
              />

              {selectedPO && poLines.length === 0 && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {presetItem ? `${presetItem.itemCode} is not on this purchase order.` : 'This purchase order has no lines.'}
                </Alert>
              )}

              {poLines.map((line, idx) => (
                <Box key={`${line.inventoryItemId}-${idx}`} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                  <Typography variant="body2" fontWeight={800}>{line.itemCode}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    {line.itemName} · ordered {line.orderedQty} · received {line.alreadyReceived}
                  </Typography>
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      label="Receive now"
                      type="number"
                      size="small"
                      value={line.receiveQty}
                      onChange={(e) => updatePoLine(idx, 'receiveQty', e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">{line.uom}</InputAdornment> }}
                      inputProps={{ min: 0 }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Batch #"
                      size="small"
                      value={line.batchNo}
                      onChange={(e) => updatePoLine(idx, 'batchNo', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Box>
              ))}
            </>
          )}

          {source === 'WORK_ORDER' && (
            <>
              <Autocomplete
                options={woList}
                loading={woLoading}
                filterOptions={serverFiltered}
                getOptionLabel={(o) => `${o.workOrderNumber || ''}${o.bomName ? ' — ' + o.bomName : ''}${o.status ? ' (' + statusLabel(o.status) + ')' : ''}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={selectedWO}
                onInputChange={(_, value, reason) => { if (reason === 'input') searchWorkOrders(value); }}
                onChange={(_, v) => handleWOChange(v)}
                noOptionsText="No open work orders"
                renderInput={(params) => (
                  <TextField {...params} label="Work Order" required sx={fieldSx}
                    helperText="Open work orders. Type a number to search" />
                )}
              />

              {woDetail && (
                <>
                  {(woDetail.lines || []).map((line) => (
                    <Box key={line.id} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                      <Typography variant="body2" fontWeight={800}>{line.inventoryItem?.itemCode}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {line.inventoryItem?.name} · planned {line.plannedQuantity ?? 0} · completed {line.completedQuantity ?? 0}
                      </Typography>
                    </Box>
                  ))}
                  {!woReceivable && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      This work order is {statusLabel(selectedWO.status)}. Output can be received only once it
                      is ready for production or in progress.
                    </Alert>
                  )}
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Receiving completes the work order. The quantity is what its operations reported as good
                    output, valued at actual cost, into the work order's own store. It cannot be typed here.
                  </Alert>
                  <Button
                    size="small"
                    startIcon={<OpenInNew fontSize="small" />}
                    href={`/production/work-order/edit/${selectedWO.id}`}
                    target="_blank"
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    Open work order
                  </Button>
                </>
              )}
            </>
          )}

          {needsItem && (
            <>
              <TextField
                label={source === 'OPENING_STOCK' ? 'Opening Quantity' : 'Quantity to Receive'}
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">{selectedItem?.uom || 'units'}</InputAdornment>,
                }}
                sx={fieldSx}
              />

              <TextField
                label="Unit Cost"
                name="costPerUnit"
                type="number"
                value={formData.costPerUnit}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                sx={fieldSx}
              />

              <TextField
                label="Batch #"
                name="batchNo"
                value={formData.batchNo}
                onChange={handleChange}
                fullWidth
                helperText="For batch-tracked items"
                sx={fieldSx}
              />
            </>
          )}

          {source === 'OPENING_STOCK' && (
            <TextField
              label="Entry Date"
              name="entryDate"
              type="date"
              value={formData.entryDate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="The cut-over date the books should show"
              sx={fieldSx}
            />
          )}

          {source !== 'WORK_ORDER' && (
            <WarehouseSelect
              value={formData.warehouse}
              onChange={(code) => setFormData(prev => ({ ...prev, warehouse: code }))}
              fullWidth
              helperText="Where the stock is received into"
              sx={fieldSx}
            />
          )}

          {(source === 'PURCHASE_ORDER' || source === 'NO_PO') && (
            <TextField
              label={source === 'NO_PO' ? 'Reason / Remarks' : 'Remarks'}
              name="remarks"
              multiline
              rows={3}
              value={formData.remarks}
              onChange={handleChange}
              fullWidth
              required={source === 'NO_PO'}
              placeholder={source === 'NO_PO' ? 'Why these goods have no purchase order...' : 'Any additional notes...'}
              sx={fieldSx}
            />
          )}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" gap={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || (source === 'WORK_ORDER' && !woReceivable)}
            sx={{
              borderRadius: 2,
              py: 1.2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : submitLabel}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ReceiveStockDrawer;
