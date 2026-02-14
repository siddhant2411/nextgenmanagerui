import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Typography, Divider, Button, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack
} from '@mui/material';
import { useParams } from 'react-router-dom';
import WorkOrderBasicDetails from './tabs/WorkOrderBasicDetails';
import WorkOrderMaterialsTab from './tabs/WorkOrderMaterialsTab';
import WorkOrderOperationsTab from './tabs/WorkOrderOperationsTab';
import WorkOrderHistoryTab from './tabs/WorkOrderHistoryTab';
import { useFormik } from 'formik';
import dayjs from 'dayjs';
import { FileDownload } from '@mui/icons-material';
import {
  cancelWorkOrder,
  closeWorkOrder,
  completeOperationPartial,
  completeWorkOrder,
  createWorkOrder,
  getWorkOrder,
  getWorkOrderHistory,
  issueWorkOrderMaterials,
  releaseWorkOrder,
  startOperation,
  updateWorkOrder,
} from '../../../services/workOrderService';
import { getBomPositisions } from '../../../services/bomService';

const getDefaultValues = () => ({
  inventoryItem: {},
  workOrderNumber: '',
  parentWorkOrderNumber: '',
  salesOrderNumber: '',
  plannedQuantity: 0,
  completedQuantity: 0,
  scrappedQuantity: 0,
  sourceType: 'SALES_ORDER',
  materials: [],
  operations: [],
  workCenter: '',
  dueDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  plannedStartDate: dayjs().format('YYYY-MM-DD'),
  plannedEndDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
  actualStartDate: '',
  actualEndDate: '',
  status: 'CREATED',
  remarks: '',
  referenceDocument: '',
  selectedItem: null,
  bom: null,
});

export default function AddUpdateWorkOrder({ setError, setSnackbar }) {
  const [initialValues, setInitialValues] = useState(getDefaultValues());
  const { workOrderId } = useParams();
  const [selectedTab, setSelectedTab] = useState(0);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
  const [isReleaseLoading, setIsReleaseLoading] = useState(false);
  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false);
  const [operationActionState, setOperationActionState] = useState({
    loading: false,
    operationId: null,
    action: '',
  });
  const [materialIssueState, setMaterialIssueState] = useState({
    loading: false,
  });
  const [workOrderActionDialog, setWorkOrderActionDialog] = useState({
    open: false,
    action: '',
  });
  const [isWorkOrderActionLoading, setIsWorkOrderActionLoading] = useState(false);
  const [hasFetchedAddMaterials, setHasFetchedAddMaterials] = useState(false);
  const [hasFetchedAddOperations, setHasFetchedAddOperations] = useState(false);
  const [baseMaterialRequirements, setBaseMaterialRequirements] = useState([]);
  const [basePlannedQuantityForMaterials, setBasePlannedQuantityForMaterials] = useState(1);
  const [workOrderHistory, setWorkOrderHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const statusColorMap = {
    DRAFT: "default",
    CREATED: "default",
    RELEASED: "primary",
    IN_PROGRESS: "primary",
    READY: "warning",
    COMPLETED: "success",
    CLOSED: "default",
    CANCELLED: "error",
  };
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (workOrderId && !['DRAFT', 'CREATED'].includes(values?.status)) {
        setError('Core work order fields are locked after issue. Use Operations actions to record execution.');
        return;
      }
      console.log('Form values before mapping:', values);
      const mapReferencePayload = (payloadValues) => {
        if (payloadValues.sourceType === 'SALES_ORDER') {
          const salesOrderId = payloadValues.referenceDocument?.id;
          return {
            ...payloadValues,
            salesOrder: salesOrderId ? { id: salesOrderId } : null,
            referenceDocument: undefined,
            parentWorkOrder: undefined,
          };
        }
        if (payloadValues.sourceType === 'PARENT_WORK_ORDER') {
          const workOrderIdValue = payloadValues.referenceDocument?.id;
          return {
            ...payloadValues,
            parentWorkOrder: workOrderIdValue ? { id: workOrderIdValue } : null,
            referenceDocument: undefined,
            salesOrder: undefined,
          };
        }
        return {
          ...payloadValues,
          referenceDocument:
            typeof payloadValues.referenceDocument === 'string'
              ? payloadValues.referenceDocument
              : '',
          salesOrder: undefined,
          parentWorkOrder: undefined,
        };
      };

      const mapDateToIso = (value) => (value ? dayjs(value).toISOString() : null);
      const mapSelectedItemToInventoryItem = (selectedItem) => {
        if (!selectedItem?.id) return null;
        return {
          inventoryItemId: selectedItem.id,
          itemCode: selectedItem.itemCode,
          name: selectedItem.name,
          hsnCode: selectedItem.hsnCode,
        };
      };

      const payload = mapReferencePayload({
        ...values,
        dueDate: mapDateToIso(values.dueDate),
        plannedStartDate: mapDateToIso(values.plannedStartDate),
        plannedEndDate: mapDateToIso(values.plannedEndDate),
        actualStartDate: mapDateToIso(values.actualStartDate),
        actualEndDate: mapDateToIso(values.actualEndDate),
        inventoryItem: mapSelectedItemToInventoryItem(values.selectedItem) || values.inventoryItem,
      });
      delete payload.selectedItem;

      // Helper: convert empty strings to null or remove empty fields
      const cleanPayload = (obj) => {
        const cleaned = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          // Remove fields with empty strings, keep other values (null, 0, false, arrays, objects)
          if (value !== '' && value !== undefined) {
            cleaned[key] = value;
          }
        });
        return cleaned;
      };

      const cleanedValues = cleanPayload(payload);
      console.log('Cleaned payload:', cleanedValues);
      if (workOrderId) {
        updateWorkOrder(workOrderId, cleanedValues)
          .then((response) => {
            console.log('Work order updated successfully:', response);
            if (setSnackbar) setSnackbar('Work order updated successfully.', 'success');
          })
          .catch((error) => {
            console.error('Error updating work order:', error);
            setError('Failed to update work order. Please try again.');
          });
      } else {
        createWorkOrder(cleanedValues)
          .then((response) => {
            console.log('Work order created successfully:', response);
            if (setSnackbar) setSnackbar('Work order created successfully.', 'success');
          })
          .catch((error) => {
            console.error('Error creating work order:', error);
            setError(error.response?.data?.error|| 'Failed to create work order. Please try again.');
          });
      }
    }

  });

  const mapWorkOrderToInitialValues = useCallback((response) => {
    const salesOrderRef = response?.salesOrder?.id
      ? {
          id: response.salesOrder.id,
          label:
            response.salesOrder.orderNumber ||
            response.salesOrderNumber ||
            response.salesOrder?.orderNumber ||
            '',
        }
      : null;
    const parentWorkOrderRef = response?.parentWorkOrder?.id
      ? {
          id: response.parentWorkOrder.id,
          label:
            response.parentWorkOrder.workOrderNumber ||
            response.parentWorkOrderNumber ||
            response.workOrderNumber ||
            '',
        }
      : null;
    const selectedItemFromInventory = response?.inventoryItem
      ? {
          id: response.inventoryItem.inventoryItemId,
          name: response.inventoryItem.name,
          itemCode: response.inventoryItem.itemCode,
          hsnCode: response.inventoryItem.hsnCode,
          uom: response.inventoryItem.uom,
        }
      : null;

    return {
      ...getDefaultValues(),
      ...response,
      remarks: response?.remarks || '',
      referenceDocument: response?.referenceDocument || '',
      plannedQuantity: response?.plannedQuantity ?? 0,
      completedQuantity: response?.completedQuantity ?? 0,
      scrappedQuantity: response?.scrappedQuantity ?? 0,
      dueDate: response?.dueDate ? dayjs(response.dueDate).format('YYYY-MM-DD') : '',
      plannedStartDate: response?.plannedStartDate ? dayjs(response.plannedStartDate).format('YYYY-MM-DD') : '',
      plannedEndDate: response?.plannedEndDate ? dayjs(response.plannedEndDate).format('YYYY-MM-DD') : '',
      actualStartDate: response?.actualStartDate ? dayjs(response.actualStartDate).format('YYYY-MM-DD') : '',
      actualEndDate: response?.actualEndDate ? dayjs(response.actualEndDate).format('YYYY-MM-DD') : '',
      materials: response?.materials || [],
      operations: response?.operations || [],
      bom: response?.bom || null,
      selectedItem: selectedItemFromInventory,
      sourceType:
        response?.sourceType ||
        (salesOrderRef ? 'SALES_ORDER' : parentWorkOrderRef ? 'PARENT_WORK_ORDER' : 'MANUAL'),
      referenceDocument:
        salesOrderRef ||
        parentWorkOrderRef ||
        response?.referenceDocument ||
        '',
    };
  }, []);

  const reloadWorkOrder = useCallback(async () => {
    if (!workOrderId) return;
    try {
      const response = await getWorkOrder(workOrderId);
      setInitialValues(mapWorkOrderToInitialValues(response));
    } catch (error) {
      console.error('Error fetching work order:', error);
      setError('Failed to fetch work order. Please try again.');
    }
  }, [mapWorkOrderToInitialValues, setError, workOrderId]);

  useEffect(() => {
    reloadWorkOrder();
  }, [reloadWorkOrder]);

  useEffect(() => {
    setWorkOrderHistory([]);
    setHasFetchedHistory(false);
    setIsHistoryLoading(false);
  }, [workOrderId]);

  useEffect(() => {
    if (workOrderId) return;
    setHasFetchedAddMaterials(false);
    setHasFetchedAddOperations(false);
    setBaseMaterialRequirements([]);
    setBasePlannedQuantityForMaterials(1);
    formik.setFieldValue('materials', []);
    formik.setFieldValue('operations', []);
  }, [formik.values.bom?.id, workOrderId]);

  useEffect(() => {
    if (workOrderId || !hasFetchedAddMaterials || baseMaterialRequirements.length === 0) return;
    const plannedQty = Number(formik.values?.plannedQuantity ?? 0);
    const safePlannedQty = Number.isNaN(plannedQty) || plannedQty <= 0 ? 0 : plannedQty;
    const baseQty =
      Number(basePlannedQuantityForMaterials) > 0 ? Number(basePlannedQuantityForMaterials) : 1;
    const factor = safePlannedQty / baseQty;

    const scaledMaterials = (formik.values.materials || []).map((material, index) => {
      const baseRequired = Number(baseMaterialRequirements[index]?.requiredQuantity ?? material?.requiredQuantity ?? 0);
      const nextRequired = Number((baseRequired * factor).toFixed(5));
      return {
        ...material,
        requiredQuantity: Number.isNaN(nextRequired) ? 0 : nextRequired,
      };
    });

    formik.setFieldValue('materials', scaledMaterials);
  }, [formik.values.plannedQuantity]);

  useEffect(() => {
    if (workOrderId || !hasFetchedAddOperations) return;
    const plannedQty = Number(formik.values?.plannedQuantity ?? 0);
    const nextPlannedQty = Number.isNaN(plannedQty) ? 0 : plannedQty;
    const updatedOperations = (formik.values.operations || []).map((operation) => ({
      ...operation,
      plannedQuantity: nextPlannedQty,
    }));
    formik.setFieldValue('operations', updatedOperations);
  }, [formik.values.plannedQuantity]);

  const mapBomPositionToMaterial = (position) => {
    const rawComponent = position?.component || position?.childInventoryItem || position?.inventoryItem;
    const component = rawComponent || {
      inventoryItemId:
        position?.inventoryItemId ??
        position?.parentInventoryItemId ??
        position?.parentItemId ??
        null,
      itemCode: position?.itemCode || position?.parentItemCode || '',
      name: position?.name || position?.parentItemName || '',
      uom: position?.uom || '',
      availableQuantity: position?.availableQuantity ?? 0,
    };
    const requiredQuantity = Number(position?.requiredQuantity ?? position?.quantity ?? 0);

    return {
      id: position?.id ?? null,
      component,
      requiredQuantity: Number.isNaN(requiredQuantity) ? 0 : requiredQuantity,
      issuedQuantity: Number(position?.issuedQuantity ?? 0) || 0,
      scrappedQuantity: Number(position?.scrappedQuantity ?? 0) || 0,
      issueStatus: position?.issueStatus || 'NOT_ISSUED',
    };
  };

  const loadMaterialsFromBom = async ({ force = false } = {}) => {
    if (workOrderId) return;
    const bomId = formik.values?.bom?.id;
    if (!bomId) {
      setError('Select an item with active BOM before loading materials.');
      return;
    }
    if (!force && hasFetchedAddMaterials) return;

    try {
      setIsMaterialsLoading(true);
      const response = await getBomPositisions(bomId);
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.data)
            ? response.data
            : [];
      const mappedMaterials = rows.map(mapBomPositionToMaterial);
      formik.setFieldValue('materials', mappedMaterials);
      setBaseMaterialRequirements(mappedMaterials.map((m) => ({ requiredQuantity: Number(m.requiredQuantity ?? 0) || 0 })));
      const plannedQty = Number(formik.values?.plannedQuantity ?? 0);
      setBasePlannedQuantityForMaterials(Number.isNaN(plannedQty) || plannedQty <= 0 ? 1 : plannedQty);
      setHasFetchedAddMaterials(true);
    } catch (error) {
      console.error('Error fetching BOM materials:', error);
      setError(error?.response?.data?.error || 'Failed to load materials from BOM.');
    } finally {
      setIsMaterialsLoading(false);
    }
  };

  const mapRoutingOperationToWorkOrderOperation = (routingOperation) => {
    const plannedQty = Number(formik.values?.plannedQuantity ?? 0);
    return {
      id: null,
      routingOperation,
      sequence: routingOperation?.sequenceNumber ?? 0,
      operationName: routingOperation?.name || '',
      workCenter: routingOperation?.workCenter || null,
      plannedQuantity: Number.isNaN(plannedQty) ? 0 : plannedQty,
      completedQuantity: 0,
      scrappedQuantity: 0,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      status: 'PLANNED',
      isMilestone: false,
      allowOverCompletion: false,
    };
  };

  const loadOperationsFromBom = ({ force = false } = {}) => {
    if (workOrderId) return;
    if (!force && hasFetchedAddOperations) return;

    const routingOperations = formik.values?.bom?.routing?.operations || [];
    const mappedOperations = routingOperations.map(mapRoutingOperationToWorkOrderOperation);
    formik.setFieldValue('operations', mappedOperations);
    setHasFetchedAddOperations(true);
  };

  const loadWorkOrderHistory = useCallback(async ({ force = false } = {}) => {
    if (!workOrderId) return;
    if (!force && hasFetchedHistory) return;
    try {
      setIsHistoryLoading(true);
      const response = await getWorkOrderHistory(workOrderId);
      const rows = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.data)
            ? response.data
            : [];
      setWorkOrderHistory(rows);
      setHasFetchedHistory(true);
    } catch (error) {
      console.error('Error fetching work order history:', error);
      setError(error?.response?.data?.error || 'Failed to fetch work order history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [workOrderId, hasFetchedHistory, setError]);

  const handleTabChange = (_, tab) => {
    setSelectedTab(tab);
    if (tab === 1 && !workOrderId) {
      loadMaterialsFromBom();
    }
    if (tab === 2 && !workOrderId) {
      loadOperationsFromBom();
    }
    if (tab === 4) {
      loadWorkOrderHistory();
    }
  };

  const handleRelease = async () => {
    setIsReleaseConfirmOpen(true);
  };

  const handleReleaseConfirmClose = () => {
    if (isReleaseLoading) return;
    setIsReleaseConfirmOpen(false);
  };

  const handleReleaseConfirm = async () => {
    if (!workOrderId) return;
    try {
      setIsReleaseLoading(true);
      await releaseWorkOrder(workOrderId);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Work order issued successfully.', 'success');
    } catch (error) {
      console.error('Error releasing work order:', error);
      setError(error?.response?.data?.error || 'Failed to issue work order. Please try again.');
    } finally {
      setIsReleaseLoading(false);
      setIsReleaseConfirmOpen(false);
    }
  };

  const openWorkOrderActionDialog = (action) => {
    setWorkOrderActionDialog({ open: true, action });
  };

  const closeWorkOrderActionDialog = () => {
    if (isWorkOrderActionLoading) return;
    setWorkOrderActionDialog({ open: false, action: '' });
  };

  const handleConfirmWorkOrderAction = async () => {
    if (!workOrderId || !workOrderActionDialog.action) return;
    const action = workOrderActionDialog.action;

    try {
      setIsWorkOrderActionLoading(true);
      if (action === 'complete') {
        await completeWorkOrder(workOrderId);
      }
      if (action === 'close') {
        await closeWorkOrder(workOrderId);
      }
      if (action === 'cancel') {
        await cancelWorkOrder(workOrderId);
      }
      await reloadWorkOrder();
      if (setSnackbar) {
        const msg =
          action === 'complete'
            ? 'Work order completed successfully.'
            : action === 'close'
              ? 'Work order closed successfully.'
              : 'Work order cancelled successfully.';
        setSnackbar(msg, 'success');
      }
    } catch (error) {
      const defaultError =
        action === 'complete'
          ? 'Failed to complete work order.'
          : action === 'close'
            ? 'Failed to close work order.'
            : 'Failed to cancel work order.';
      console.error('Error changing work order status:', error);
      setError(error?.response?.data?.error || defaultError);
    } finally {
      setIsWorkOrderActionLoading(false);
      setWorkOrderActionDialog({ open: false, action: '' });
    }
  };

  const handleIssueMaterials = async (materialsPayload = []) => {
    if (!workOrderId) return false;
    if (!Array.isArray(materialsPayload) || materialsPayload.length === 0) {
      setError('Enter issue/scrap quantity for at least one material.');
      return false;
    }

    const normalizedMaterials = materialsPayload.map((material) => ({
      workOrderMaterialId: material?.workOrderMaterialId,
      issuedQuantity: Number(material?.issuedQuantity ?? 0),
      scrappedQuantity: Number(material?.scrappedQuantity ?? 0),
    }));

    const hasInvalidPayload = normalizedMaterials.some((material) =>
      !material.workOrderMaterialId ||
      Number.isNaN(material.issuedQuantity) ||
      Number.isNaN(material.scrappedQuantity) ||
      material.issuedQuantity < 0 ||
      material.scrappedQuantity < 0 ||
      material.issuedQuantity + material.scrappedQuantity <= 0
    );

    if (hasInvalidPayload) {
      setError('Material issue quantities must be valid positive values.');
      return false;
    }

    try {
      setMaterialIssueState({ loading: true });
      await issueWorkOrderMaterials(workOrderId, normalizedMaterials);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Materials issued successfully.', 'success');
      return true;
    } catch (error) {
      console.error('Error issuing materials:', error);
      setError(error?.response?.data?.error || 'Failed to issue materials.');
      return false;
    } finally {
      setMaterialIssueState({ loading: false });
    }
  };

  const handleStartOperation = async (operationId) => {
    if (!operationId) return false;
    try {
      setOperationActionState({ loading: true, operationId, action: 'start' });
      await startOperation(operationId);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Operation started successfully.', 'success');
      return true;
    } catch (error) {
      console.error('Error starting operation:', error);
      setError(error?.response?.data?.error || 'Failed to start operation.');
      return false;
    } finally {
      setOperationActionState({ loading: false, operationId: null, action: '' });
    }
  };

  const handleCompleteOperation = async (operationId, completionPayload = {}) => {
    if (!operationId) return false;
    const completedQuantity = Number(completionPayload?.completedQuantity ?? 0);
    const scrappedQuantity = Number(completionPayload?.scrappedQuantity ?? 0);

    if (
      Number.isNaN(completedQuantity) ||
      Number.isNaN(scrappedQuantity) ||
      completedQuantity < 0 ||
      scrappedQuantity < 0
    ) {
      setError('Completed and scrapped quantities must be zero or greater.');
      return false;
    }

    if (completedQuantity + scrappedQuantity <= 0) {
      setError('Enter completed or scrapped quantity greater than zero.');
      return false;
    }

    try {
      setOperationActionState({ loading: true, operationId, action: 'complete' });
      await completeOperationPartial(operationId, {
        completedQuantity,
        scrappedQuantity,
        remarks: completionPayload?.remarks || '',
      });
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Operation progress recorded successfully.', 'success');
      return true;
    } catch (error) {
      console.error('Error completing operation:', error);
      setError(error?.response?.data?.error || 'Failed to record operation progress.');
      return false;
    } finally {
      setOperationActionState({ loading: false, operationId: null, action: '' });
    }
  };

  const workOrderStatus = formik.values.status || 'CREATED';
  const canIssueWorkOrder = workOrderStatus === 'CREATED';
  const canCompleteWorkOrderStatus = ['RELEASED', 'IN_PROGRESS', 'READY'].includes(workOrderStatus);
  const canCloseWorkOrderStatus = workOrderStatus === 'COMPLETED';
  const canCancelWorkOrderStatus = !['CANCELLED', 'CLOSED'].includes(workOrderStatus);
  const isUpdateDisabled = Boolean(workOrderId) && !['DRAFT', 'CREATED'].includes(workOrderStatus);
  const compactButtonSx = {
    minWidth: { xs: '100%', sm: 88 },
    px: 1.25,
    py: 0.5,
    borderRadius: 1.5,
    fontSize: '0.74rem',
    fontWeight: 600,
    textTransform: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <Box sx={{ fontFamily: "'IBM Plex Sans', system-ui" }}>
      <Box sx={{
        p: 3,
        backgroundColor: "white",
        borderRadius: 2,
        boxShadow: 2,
        height: "100%",
        minHeight: "500px",
        display: "flex",
        flexDirection: "column",
      }}>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            mb: 2,
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {workOrderId ? (formik.values.remarks || formik.values.workOrderNumber) : 'NEW WORK ORDER'}
              </Typography>
              <Chip
                size="small"
                label={formik.values.status || 'CREATED'}
                color={statusColorMap[formik.values.status] || 'default'}
                sx={{ fontWeight: 600 }}
              />
            </Box>
            {workOrderId && (
              <Typography variant="caption" color="text.secondary">
                Work Order No: {formik.values.workOrderNumber || '-'}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {`${formik.values.selectedItem?.name || 'Item'} | Qty: ${formik.values.plannedQuantity ?? '-'} | Due: ${formik.values.dueDate || '-'}`}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {(workOrderId &&
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownload fontSize="small" />}
                  sx={compactButtonSx}
                  onClick={() => { "TODO" }}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  sx={compactButtonSx}
                  onClick={handleRelease}
                  disabled={isReleaseLoading || !canIssueWorkOrder}
                >
                  {isReleaseLoading ? 'Issuing...' : 'Issue WO'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={compactButtonSx}
                  onClick={() => openWorkOrderActionDialog('complete')}
                  disabled={isWorkOrderActionLoading || !canCompleteWorkOrderStatus}
                >
                  Complete WO
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={compactButtonSx}
                  onClick={() => openWorkOrderActionDialog('close')}
                  disabled={isWorkOrderActionLoading || !canCloseWorkOrderStatus}
                >
                  Close WO
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={compactButtonSx}
                  onClick={() => openWorkOrderActionDialog('cancel')}
                  disabled={isWorkOrderActionLoading || !canCancelWorkOrderStatus}
                >
                  Cancel WO
                </Button>
                {/* <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} onClick={exportDetailedPDF} sx={{ width: "100px" }}>PDF</Button> */}

              </>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="small"
              sx={compactButtonSx}
              onClick={formik.handleSubmit}
              disabled={isUpdateDisabled}
            >
              {workOrderId ? 'Update' : 'Create'}
            </Button>


          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />


        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="WO DETAILS" />
          <Tab label="Materials" />
          <Tab label="Operations" />
          {<Tab label="Attachments" />}
          <Tab label="History" />
        </Tabs>

        <form onSubmit={formik.handleSubmit}>

          {selectedTab === 0 && (

            <WorkOrderBasicDetails formik={formik} setError={setError} workOrderId={workOrderId} />

          )}
          {selectedTab === 1 && (
            <WorkOrderMaterialsTab
              formik={formik}
              isLoading={isMaterialsLoading}
              onLoadFromBom={() => loadMaterialsFromBom({ force: true })}
              isAddMode={!workOrderId}
              onIssueMaterials={handleIssueMaterials}
              materialIssueState={materialIssueState}
            />
          )}
          {selectedTab === 2 && (
            <WorkOrderOperationsTab
              formik={formik}
              isEditMode={Boolean(workOrderId)}
              onStartOperation={handleStartOperation}
              onCompleteOperation={handleCompleteOperation}
              operationActionState={operationActionState}
            />
          )}
          {selectedTab === 4 && (
            <WorkOrderHistoryTab
              rows={workOrderHistory}
              loading={isHistoryLoading}
              isAddMode={!workOrderId}
            />
          )}
        </form>
      </Box>

      <Dialog
        open={isReleaseConfirmOpen}
        onClose={handleReleaseConfirmClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Issue</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Issue this work order now? This changes status from CREATED to RELEASED.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReleaseConfirmClose} disabled={isReleaseLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleReleaseConfirm}
            variant="contained"
            color="secondary"
            disabled={isReleaseLoading}
          >
            {isReleaseLoading ? 'Issuing...' : 'Issue WO'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={workOrderActionDialog.open}
        onClose={closeWorkOrderActionDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {workOrderActionDialog.action === 'complete' && 'Complete Work Order'}
          {workOrderActionDialog.action === 'close' && 'Close Work Order'}
          {workOrderActionDialog.action === 'cancel' && 'Cancel Work Order'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {workOrderActionDialog.action === 'complete' &&
              'Mark this work order as COMPLETED? All required operations must already be completed.'}
            {workOrderActionDialog.action === 'close' &&
              'Close this work order? No further changes should be made after closing.'}
            {workOrderActionDialog.action === 'cancel' &&
              'Cancel this work order? This action should only be used when production will not continue.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeWorkOrderActionDialog} disabled={isWorkOrderActionLoading}>
            Back
          </Button>
          <Button
            onClick={handleConfirmWorkOrderAction}
            variant="contained"
            color={workOrderActionDialog.action === 'cancel' ? 'error' : 'primary'}
            disabled={isWorkOrderActionLoading}
          >
            {isWorkOrderActionLoading ? 'Please wait...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>


    </Box >
  );
}
