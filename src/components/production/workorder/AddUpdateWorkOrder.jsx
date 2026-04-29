import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Tabs, Tab, Typography, Divider, Button, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Stack, Alert, TextField, Paper, Tooltip, LinearProgress, Grid, Menu, MenuItem
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import WorkOrderBasicDetails from './tabs/WorkOrderBasicDetails';
import WorkOrderMaterialsTab from './tabs/WorkOrderMaterialsTab';
import WorkOrderOperationsTab from './tabs/WorkOrderOperationsTab';
import WorkOrderHistoryTab from './tabs/WorkOrderHistoryTab';
import WorkOrderQCTab from './tabs/WorkOrderQCTab';
import WorkOrderAttachmentsTab from './tabs/WorkOrderAttachmentsTab';
import WorkOrderRejectionsTab from './tabs/WorkOrderRejectionsTab';
import ScheduleDialog from './ScheduleDialog';
import { useFormik } from 'formik';
import dayjs from 'dayjs';
import { FileDownload, Schedule, EventRepeat, KeyboardArrowDown } from '@mui/icons-material';
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
  shortCloseWorkOrder,
  startOperation,
  updateWorkOrder,
  scheduleWorkOrder,
  rescheduleWorkOrder,
} from '../../../services/workOrderService';
import { getBomPositisions } from '../../../services/bomService';
import { useAuth } from '../../../auth/AuthContext';
import { ACTION_KEYS } from '../../../auth/roles';

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
  priority: 'NORMAL',
  allowBackflush: false,
  remarks: '',
  referenceDocument: '',
  selectedItem: null,
  bom: null,
});

const PRIORITY_COLORS = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };

export default function AddUpdateWorkOrder({ setError, setSnackbar }) {
  const { canAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageWorkOrderAdminActions = canAction(ACTION_KEYS.WORK_ORDER_ADMIN_WRITE);
  const [initialValues, setInitialValues] = useState(getDefaultValues());
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const leaveConfirmedRef = useRef(false);
  const pendingNavRef = useRef(null);
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
  const [shortCloseDialog, setShortCloseDialog] = useState({
    open: false,
    remarks: '',
  });
  const [isWorkOrderActionLoading, setIsWorkOrderActionLoading] = useState(false);
  const [hasFetchedAddMaterials, setHasFetchedAddMaterials] = useState(false);
  const [hasFetchedAddOperations, setHasFetchedAddOperations] = useState(false);
  const [baseMaterialRequirements, setBaseMaterialRequirements] = useState([]);
  const [basePlannedQuantityForMaterials, setBasePlannedQuantityForMaterials] = useState(1);
  const [workOrderHistory, setWorkOrderHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasFetchedHistory, setHasFetchedHistory] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(dayjs().format('YYYY-MM-DD'));
  // Parallel operation dialogs
  const [blockedOpDialog, setBlockedOpDialog] = useState({ open: false, blockingNames: [] });
  const [startConfirmDialog, setStartConfirmDialog] = useState({ open: false, operationId: null, opName: '', parallelOps: [] });
  const [pendingStartOperationId, setPendingStartOperationId] = useState(null);
  // Release summary dialog
  const [releaseResultDialog, setReleaseResultDialog] = useState({ open: false, readyOps: [], waitingOps: [] });
  const statusColorMap = {
    DRAFT: "default",
    CREATED: "default",
    SCHEDULED: "info",
    RELEASED: "primary",
    IN_PROGRESS: "primary",
    MATERIAL_REORDER: "warning",
    READY: "warning",
    COMPLETED: "success",
    CLOSED: "default",
    CANCELLED: "error",
    SHORT_CLOSED: "warning",
  };
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (workOrderId && !['DRAFT', 'CREATED'].includes(values?.status)) {
        setError('Core work order fields are locked after issue. Use Operations actions to record execution.');
        return;
      }
    const mapReferencePayload = (payloadValues) => {
      // Extract ID-based fields for the new DTO contract
      const bomId = payloadValues.bom?.id || null;
        const routingId = payloadValues.bom?.routing?.id || null;
        const workCenterId = payloadValues.workCenter?.id || null; // Assuming workCenter is an object with an ID
        const enriched = { ...payloadValues, bomId, routingId, workCenterId };
        delete enriched.bom;
        delete enriched.workCenter; // Remove the object, keep the ID

        if (enriched.sourceType === 'SALES_ORDER') {
          const salesOrderId = enriched.referenceDocument?.id;
          return {
            ...enriched,
            salesOrderId: salesOrderId || null,
            salesOrder: undefined,
            referenceDocument: undefined,
            parentWorkOrder: undefined,
          };
        }
        if (enriched.sourceType === 'PARENT_WORK_ORDER') {
          const workOrderIdValue = enriched.referenceDocument?.id;
          return {
            ...enriched,
            parentWorkOrderId: workOrderIdValue ? workOrderIdValue : null,
            salesOrderId: null,
            salesOrder: undefined,
            referenceDocument: undefined,
          };
        }
        return {
          ...enriched,
          referenceDocument:
            typeof enriched.referenceDocument === 'string'
              ? enriched.referenceDocument
              : '',
          salesOrderId: null,
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
      if (workOrderId) {
        updateWorkOrder(workOrderId, cleanedValues)
          .then((response) => {
            if (setSnackbar) setSnackbar('Work order updated successfully.', 'success');
          })
          .catch((error) => {
            setError(error.response?.data?.error || 'Failed to update work order. Please try again.', "error");
          });
      } else {
        createWorkOrder(cleanedValues)
          .then((response) => {
            if (setSnackbar) setSnackbar('Work order created successfully.', 'success');
            const newId = response?.id || response?.workOrderId;
            if (newId) navigate(`../edit/${newId}`, { relative: 'path' });
          })
          .catch((error) => {
            setError(error.response?.data?.error || 'Failed to create work order. Please try again.');
          });
      }
    }

  });

  useEffect(() => {
    if (!formik.dirty) {
      leaveConfirmedRef.current = false;
      return;
    }
    const savedPath = window.location.pathname + window.location.search + window.location.hash;
    // Push a sentinel so the back button has somewhere to land before leaving
    window.history.pushState(null, '', savedPath);

    const handleBeforeUnload = (e) => { e.preventDefault(); };

    // capture:true fires before React Router's own popstate listener,
    // letting us restore the URL before React Router processes the navigation
    const handlePopState = () => {
      if (leaveConfirmedRef.current) return;
      const targetPath = window.location.pathname + window.location.search + window.location.hash;
      pendingNavRef.current = targetPath;
      window.history.pushState(null, '', savedPath); // restore our URL
      setShowLeaveWarning(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState, { capture: true });
    };
  }, [formik.dirty]);

  const handleLeaveAnyway = () => {
    leaveConfirmedRef.current = true;
    setShowLeaveWarning(false);
    const target = pendingNavRef.current;
    pendingNavRef.current = null;
    navigate(target ?? -1);
  };

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
      materials: response?.materials || response?.workOrderMaterials || [],
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
      priority: response?.priority || 'NORMAL',
      allowBackflush: response?.allowBackflush ?? false,
      autoScheduled: response?.autoScheduled || false,
    };
  }, []);

  const reloadWorkOrder = useCallback(async () => {
    if (!workOrderId) {
      const stateBom = location.state?.bom;
      if (stateBom) {
        const itemInfo = stateBom.parentInventoryItem;
        const mappedItem = itemInfo ? {
          id: itemInfo.inventoryItemId,
          name: itemInfo.name,
          itemCode: itemInfo.itemCode,
          hsnCode: itemInfo.hsnCode,
          uom: itemInfo.uom,
        } : null;
        
        setInitialValues(prev => ({
          ...prev,
          bom: stateBom,
          selectedItem: mappedItem,
          inventoryItem: itemInfo
        }));
      }
      return;
    }
    try {
      const response = await getWorkOrder(workOrderId);
      setInitialValues(mapWorkOrderToInitialValues(response));
    } catch (error) {
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

    const bomId = formik.values.bom?.id;
    if (!bomId) return;

    // Auto-load operations from BOM routing (sync)
    loadOperationsFromBom({ force: true });
    // Auto-load materials from BOM API (async)
    loadMaterialsFromBom({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      id: position?.workOrderMaterialId ?? position?.positionId ?? position?.id ?? null,
      component,
      requiredQuantity: Number.isNaN(requiredQuantity) ? 0 : requiredQuantity,
      issuedQuantity: Number(position?.issuedQuantity ?? 0) || 0,
      scrappedQuantity: Number(position?.scrappedQuantity ?? 0) || 0,
      issueStatus: position?.issueStatus || 'NOT_ISSUED',
      workOrderOperationId:
        position?.workOrderOperationId ??
        position?.routingOperationId ??
        null,
      operationName:
        position?.operationName ||
        position?.routingOperationName ||
        null,
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
    if (!canManageWorkOrderAdminActions) {
      setError('You are not authorized to issue work orders.');
      return;
    }
    setIsReleaseConfirmOpen(true);
  };

  const handleReleaseConfirmClose = () => {
    if (isReleaseLoading) return;
    setIsReleaseConfirmOpen(false);
  };

  const handleReleaseConfirm = async () => {
    if (!workOrderId) return;
    if (!canManageWorkOrderAdminActions) {
      setError('You are not authorized to issue work orders.');
      return;
    }
    try {
      setIsReleaseLoading(true);
      await releaseWorkOrder(workOrderId);
      await reloadWorkOrder();

      // Build release summary from freshly-loaded operations
      setTimeout(() => {
        const freshOps = formik.values?.operations || [];
        const readyOps = freshOps
          .filter(op => op.status === 'READY')
          .map(op => ({
            seq: op.sequence ?? op.routingOperation?.sequenceNumber,
            name: op.operationName || op.routingOperation?.name || '',
          }));
        const waitingOps = freshOps
          .filter(op => op.status === 'WAITING_FOR_DEPENDENCY')
          .map(op => {
            const depSeqs = (op.dependsOnOperationIds || []).map(id => {
              const dep = freshOps.find(o => o.id === id);
              const seq = dep?.sequence ?? dep?.routingOperation?.sequenceNumber;
              return seq != null ? `Op ${seq}` : `#${id}`;
            });
            return {
              seq: op.sequence ?? op.routingOperation?.sequenceNumber,
              name: op.operationName || op.routingOperation?.name || '',
              blockedBy: depSeqs,
            };
          });

        if (readyOps.length > 0 || waitingOps.length > 0) {
          setReleaseResultDialog({ open: true, readyOps, waitingOps });
        } else if (setSnackbar) {
          setSnackbar('Work order issued successfully.', 'success');
        }
      }, 300);
    } catch (error) {
      setError(error?.response?.data?.error || 'Failed to issue work order. Please try again.');
    } finally {
      setIsReleaseLoading(false);
      setIsReleaseConfirmOpen(false);
    }
  };

  const openWorkOrderActionDialog = (action) => {
    if ((action === 'cancel' || action === 'short_close') && !canManageWorkOrderAdminActions) {
      setError('You are not authorized to perform this action.');
      return;
    }
    if (action === 'short_close') {
      setShortCloseDialog({ open: true, remarks: '' });
      return;
    }
    setWorkOrderActionDialog({ open: true, action });
  };

  const closeWorkOrderActionDialog = () => {
    if (isWorkOrderActionLoading) return;
    setWorkOrderActionDialog({ open: false, action: '' });
  };

  const handleConfirmWorkOrderAction = async () => {
    if (!workOrderId || !workOrderActionDialog.action) return;
    const action = workOrderActionDialog.action;
    if (action === 'cancel' && !canManageWorkOrderAdminActions) {
      setError('You are not authorized to cancel work orders.');
      setWorkOrderActionDialog({ open: false, action: '' });
      return;
    }

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
      setError(error?.response?.data?.error || defaultError);
    } finally {
      setIsWorkOrderActionLoading(false);
      setWorkOrderActionDialog({ open: false, action: '' });
    }
  };

  const handleConfirmShortClose = async () => {
    if (!workOrderId) return;
    if (!canManageWorkOrderAdminActions) {
      setError('You are not authorized to short-close work orders.');
      setShortCloseDialog({ open: false, remarks: '' });
      return;
    }

    try {
      setIsWorkOrderActionLoading(true);
      await shortCloseWorkOrder(workOrderId, shortCloseDialog.remarks);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Work order short-closed successfully.', 'success');
    } catch (error) {
      setError(error?.response?.data?.error || 'Failed to short-close work order.');
    } finally {
      setIsWorkOrderActionLoading(false);
      setShortCloseDialog({ open: false, remarks: '' });
    }
  };

  const handleIssueMaterials = async (materialsPayload = []) => {
    if (!workOrderId) return false;
    if (!Array.isArray(materialsPayload) || materialsPayload.length === 0) {
      setError('Enter move-to-floor or scrap quantity for at least one material.');
      return false;
    }

    const normalizedMaterials = materialsPayload.map((material) => {
      const normalized = {
        workOrderMaterialId: Number(material?.workOrderMaterialId ?? material?.id ?? 0),
        issuedQuantity: Number(material?.quantity ?? material?.issuedQuantity ?? 0),
        scrappedQuantity: Number(material?.scrappedQuantity ?? 0),
      };

      if (Array.isArray(material?.overrideInstanceIds) && material.overrideInstanceIds.length > 0) {
        normalized.overrideInstanceIds = material.overrideInstanceIds;
        normalized.overrideReason = material?.overrideReason || 'Manual Override';
      }

      return normalized;
    });

    const hasInvalidPayload = normalizedMaterials.some((material) =>
      !material.workOrderMaterialId ||
      Number.isNaN(material.issuedQuantity) ||
      Number.isNaN(material.scrappedQuantity) ||
      material.issuedQuantity < 0 ||
      material.scrappedQuantity < 0 ||
      material.issuedQuantity + material.scrappedQuantity <= 0
    );

    if (hasInvalidPayload) {
      setError('Move-to-floor quantities must be valid positive values.');
      return false;
    }

    try {
      setMaterialIssueState({ loading: true });
      await issueWorkOrderMaterials(workOrderId, normalizedMaterials);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Materials moved to floor successfully.', 'success');
      return true;
    } catch (error) {
      const apiError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        '';
      const normalizedError = typeof apiError === 'string' ? apiError : '';
      const looksLikeOperationGateError =
        /operation/i.test(normalizedError) &&
        /(ready|in_progress|in progress|active)/i.test(normalizedError);
      const materialById = new Map(
        (formik.values?.materials || []).map((material) => [
          Number(material?.id ?? material?.workOrderMaterialId),
          material,
        ])
      );
      const blockedMaterial = materialsPayload
        .map((material) => materialById.get(Number(material?.workOrderMaterialId)))
        .find((material) => material?.operationName);

      if (looksLikeOperationGateError && blockedMaterial?.operationName) {
        setError(
          `This material can only be issued once the '${blockedMaterial.operationName}' operation is active.`
        );
      } else {
        setError(normalizedError || 'Failed to issue materials.');
      }
      return false;
    } finally {
      setMaterialIssueState({ loading: false });
    }
  };

  const handleStartOperation = async (operationId) => {
    if (!operationId) return false;
    const operations = formik.values?.operations || [];
    const operation = operations.find(op => op.id === operationId);
    const status = operation?.status;

    // Allow starting if READY or WAITING_FOR_DEPENDENCY
    // The backend now handles the specific 1-unit readiness gate.
    if (status !== 'READY' && status !== 'WAITING_FOR_DEPENDENCY') {
       return false;
    }

    // READY — check for parallel siblings already IN_PROGRESS
    if (status === 'READY') {
      const inProgressSiblings = operations.filter(
        op => op.id !== operationId && op.status === 'IN_PROGRESS'
      );
      if (inProgressSiblings.length > 0) {
        const opName = operation?.operationName || operation?.routingOperation?.name || `Op ${operation?.sequence}`;
        const parallelOps = inProgressSiblings.map(op => {
          const seq = op.sequence ?? op.routingOperation?.sequenceNumber;
          const name = op.operationName || op.routingOperation?.name || '';
          return `Op ${seq}${name ? ` — ${name}` : ''}`;
        });
        setStartConfirmDialog({ open: true, operationId, opName, parallelOps });
        return false; // wait for confirmation
      }
    }

    // Proceed with start
    return _doStartOperation(operationId);
  };

  const _doStartOperation = async (operationId) => {
    if (!operationId) return false;
    try {
      setOperationActionState({ loading: true, operationId, action: 'start' });
      await startOperation(operationId);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Operation started successfully.', 'success');
      return true;
    } catch (error) {
      setError(error?.response?.data?.error || 'Failed to start operation.');
      return false;
    } finally {
      setOperationActionState({ loading: false, operationId: null, action: '' });
    }
  };

  const handleCompleteOperation = async (operationId, completionPayload = {}) => {
    if (!operationId) return false;
    const completedQuantity = Number(completionPayload?.completedQuantity ?? 0);
    const scrappedQuantity  = Number(completionPayload?.scrappedQuantity  ?? 0);
    const rejectedQuantity  = Number(completionPayload?.rejectedQuantity  ?? 0);
    if (
      Number.isNaN(completedQuantity) || Number.isNaN(scrappedQuantity) || Number.isNaN(rejectedQuantity) ||
      completedQuantity < 0 || scrappedQuantity < 0 || rejectedQuantity < 0
    ) {
      setError('All quantities must be zero or greater.');
      return false;
    }

    if (completedQuantity + scrappedQuantity + rejectedQuantity <= 0) {
      setError('Enter at least one quantity greater than zero.');
      return false;
    }

    // Snapshot WAITING ops before complete, so we can detect newly-READY ones after reload
    const prevWaitingOps = (formik.values?.operations || []).filter(
      op => op.id !== operationId && op.status === 'WAITING_FOR_DEPENDENCY'
    );

    try {
      setOperationActionState({ loading: true, operationId, action: 'complete' });
      const response = await completeOperationPartial(operationId, {
        completedQuantity,
        scrappedQuantity,
        rejectedQuantity,
        rejectionReasonCode: completionPayload?.rejectionReasonCode || '',
        scrapReasonCode:     completionPayload?.scrapReasonCode     || '',
        remarks:             completionPayload?.remarks             || '',
      });
      await reloadWorkOrder();

      // Detect newly unlocked READY operations
      const newOps = formik.values?.operations || [];
      // Use a small delay to let React re-render after reloadWorkOrder sets initial values
      setTimeout(() => {
        const freshOps = formik.values?.operations || [];
        const newlyReady = prevWaitingOps.filter(prev => {
          const updated = freshOps.find(op => op.id === prev.id);
          return updated && updated.status === 'READY';
        });
        if (newlyReady.length > 0 && setSnackbar) {
          const names = newlyReady.map(op => {
            const seq = op.sequence ?? op.routingOperation?.sequenceNumber;
            const name = op.operationName || op.routingOperation?.name || '';
            return `Op ${seq}${name ? ` (${name})` : ''}`;
          }).join(', ');
          setSnackbar(`Operation recorded. ${names} is now READY to start.`, 'success');
        } else if (setSnackbar) {
          setSnackbar('Operation progress recorded successfully.', 'success');
        }
      }, 300);

      return response?.data ?? true;
    } catch (error) {
      const apiError = error?.response?.data;
      const errMsg = apiError?.error || '';
      if (errMsg.toLowerCase().includes('material') || apiError?.errorCode === 'MATERIAL_GATE_FAILED') {
        setError(`Material gate: ${errMsg || 'Required materials have not been fully issued for this operation.'}`);
      } else if (errMsg.toLowerCase().includes('previous operation') || errMsg.toLowerCase().includes('input') || apiError?.errorCode === 'INPUT_GATE_FAILED') {
        setError(`Input gate: ${errMsg || 'Previous operation has not forwarded sufficient quantity.'}`);
      } else {
        setError(errMsg || 'Failed to record operation progress.');
      }
      return false;
    } finally {
      setOperationActionState({ loading: false, operationId: null, action: '' });
    }
  };

  const workOrderStatus = formik.values.status || 'CREATED';
  const materials = Array.isArray(formik.values?.materials) ? formik.values.materials : [];
  const operations = Array.isArray(formik.values?.operations) ? formik.values.operations : [];
  const materialRequiredQuantity = materials.reduce(
    (total, material) => total + Number(material?.netRequiredQuantity || material?.requiredQuantity || 0),
    0
  );
  const materialIssuedQuantity = materials.reduce(
    (total, material) => total + Number(material?.issuedQuantity || 0) + Number(material?.scrappedQuantity || 0),
    0
  );
  const materialProgress = materialRequiredQuantity > 0
    ? Math.min((materialIssuedQuantity / materialRequiredQuantity) * 100, 100)
    : 0;
  const completedOperations = operations.filter((operation) =>
    ['COMPLETED', 'CLOSED'].includes(String(operation?.status || '').toUpperCase())
  ).length;
  const operationProgress = operations.length > 0
    ? (completedOperations / operations.length) * 100
    : 0;
  const canIssueWorkOrder = ['CREATED', 'SCHEDULED'].includes(workOrderStatus);
  const canScheduleWorkOrder = ['CREATED', 'SCHEDULED'].includes(workOrderStatus);
  const canCompleteWorkOrderStatus = ['RELEASED', 'IN_PROGRESS', 'READY'].includes(workOrderStatus);
  const canCloseWorkOrderStatus = workOrderStatus === 'COMPLETED';
  const canCancelWorkOrderStatus = ['CREATED', 'SCHEDULED', 'RELEASED', 'IN_PROGRESS','MATERIAL_PENDING','READY_FOR_PRODUCTION','PARTIALLY_READY'].includes(workOrderStatus);
  const canShortCloseWorkOrderStatus = ['RELEASED', 'IN_PROGRESS','PARTIALLY_READY'].includes(workOrderStatus);
  const isPurchasedOnly = formik.values.bom?.parentInventoryItem?.purchased && !formik.values.bom?.parentInventoryItem?.manufactured;
  const isUpdateDisabled = isPurchasedOnly || (Boolean(workOrderId) && !['DRAFT', 'CREATED', 'SCHEDULED'].includes(workOrderStatus));

  const handleAutoSchedule = async () => {
    if (!workOrderId) return;
    try {
      setIsScheduleLoading(true);
      setError('');
      const result = await scheduleWorkOrder(workOrderId);
      setScheduleResult(result);
      setScheduleDialogOpen(true);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Work order scheduled successfully.', 'success');
    } catch (error) {
      setError(error?.response?.data?.error || error?.response?.data?.message || 'Failed to schedule work order.');
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!workOrderId || !rescheduleDate) return;
    try {
      setIsScheduleLoading(true);
      setError('');
      const result = await rescheduleWorkOrder(workOrderId, rescheduleDate);
      setScheduleResult(result);
      setRescheduleDialogOpen(false);
      setScheduleDialogOpen(true);
      await reloadWorkOrder();
      if (setSnackbar) setSnackbar('Work order rescheduled successfully.', 'success');
    } catch (error) {
      setError(error?.response?.data?.error || error?.response?.data?.message || 'Failed to reschedule work order.');
    } finally {
      setIsScheduleLoading(false);
    }
  };
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

  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const actionsMenuOpen = Boolean(actionsMenuAnchor);

  return (
    <Box sx={{
      fontFamily: "'Inter', system-ui",
      background: '#f8fafc',
      p: { xs: 1, sm: 2, md: 3 },
      borderRadius: 2,
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      overflowX: 'hidden',
    }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(2,12,27,.06)',
          backgroundColor: '#ffffff',
          minHeight: '500px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >

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
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: '#1e293b' }}>
                {workOrderId ? 'Work Order Management' : 'Create New Work Order'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                {workOrderId && (() => {
                  const WO_STATUS_CHIP = {
                    DRAFT:        { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
                    CREATED:      { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
                    SCHEDULED:    { bg: '#eef4fb', color: '#2a6496', border: '#c8dcf0' },
                    RELEASED:     { bg: '#eef4fb', color: '#2a6496', border: '#c8dcf0' },
                    IN_PROGRESS:      { bg: '#f0edf9', color: '#5b3b9e', border: '#d4caea' },
                    MATERIAL_REORDER: { bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
                    READY:            { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
                    COMPLETED:    { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
                    CLOSED:       { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
                    CANCELLED:    { bg: '#fdf0f0', color: '#b84040', border: '#f0c8c8' },
                    SHORT_CLOSED: { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
                  };
                  const s = WO_STATUS_CHIP[workOrderStatus] || WO_STATUS_CHIP.CREATED;
                  return (
                    <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '9px', py: '3px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {workOrderStatus.replace(/_/g, ' ')}
                    </Box>
                  );
                })()}
                {formik.values.priority && (() => {
                  const PRIORITY_CHIP = {
                    URGENT: { bg: '#fdf0f0', color: '#b84040', border: '#f0c8c8' },
                    HIGH:   { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
                    NORMAL: { bg: '#eef4fb', color: '#2a6496', border: '#c8dcf0' },
                    LOW:    { bg: '#f4f6f8', color: '#5a6474', border: '#dde3ec' },
                  };
                  const p = PRIORITY_CHIP[formik.values.priority] || PRIORITY_CHIP.NORMAL;
                  return (
                    <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '9px', py: '3px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', bgcolor: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                      {formik.values.priority}
                    </Box>
                  );
                })()}
                {formik.values.autoScheduled && (
                  <Chip size="small" label="Auto-Scheduled" color="info" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem', px: 0.5 }} />
                )}
              </Box>
            </Box>
            {workOrderId && (
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, mt: 0.5, display: 'block' }}>
                ID: {formik.values.workOrderNumber || '-'}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, fontWeight: 500 }}>
              {`${formik.values.selectedItem?.name || 'Item'} | Qty: ${formik.values.plannedQuantity ?? '-'} | Due: ${formik.values.dueDate ? dayjs(formik.values.dueDate).format('DD MMM YYYY') : '-'}`}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {workOrderId && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<KeyboardArrowDown fontSize="small" />}
                  onClick={(e) => setActionsMenuAnchor(e.currentTarget)}
                  sx={{ ...compactButtonSx, borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#1565c0', color: '#1565c0', bgcolor: '#f0f7ff' } }}
                >
                  Actions
                </Button>
                <Menu
                  anchorEl={actionsMenuAnchor}
                  open={actionsMenuOpen}
                  onClose={() => setActionsMenuAnchor(null)}
                  PaperProps={{ elevation: 0, sx: { border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 16px rgba(2,12,27,.08)', minWidth: 180, mt: '4px' } }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem dense onClick={() => { setActionsMenuAnchor(null); }} sx={{ fontSize: '0.8125rem', color: '#475569', gap: 1 }}>
                    <FileDownload fontSize="small" /> Export Excel
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <Tooltip title={!canScheduleWorkOrder ? `Only available when status is CREATED or SCHEDULED (current: ${workOrderStatus})` : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isScheduleLoading || !canScheduleWorkOrder}
                        onClick={() => { setActionsMenuAnchor(null); handleAutoSchedule(); }}
                        sx={{ fontSize: '0.8125rem', color: '#1565c0', gap: 1 }}>
                        <Schedule fontSize="small" /> Auto Schedule
                      </MenuItem>
                    </span>
                  </Tooltip>
                  <Tooltip title={!canScheduleWorkOrder ? `Only available when status is CREATED or SCHEDULED (current: ${workOrderStatus})` : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isScheduleLoading || !canScheduleWorkOrder}
                        onClick={() => { setActionsMenuAnchor(null); setRescheduleDialogOpen(true); }}
                        sx={{ fontSize: '0.8125rem', color: '#475569', gap: 1 }}>
                        <EventRepeat fontSize="small" /> Reschedule
                      </MenuItem>
                    </span>
                  </Tooltip>
                  <Divider sx={{ my: 0.5 }} />
                  <Tooltip title={!canIssueWorkOrder ? `Must be CREATED or SCHEDULED to issue (current: ${workOrderStatus})` : !canManageWorkOrderAdminActions ? 'Admin role required' : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isReleaseLoading || !canIssueWorkOrder || !canManageWorkOrderAdminActions}
                        onClick={() => { setActionsMenuAnchor(null); handleRelease(); }}
                        sx={{ fontSize: '0.8125rem', color: '#475569', gap: 1 }}>
                        Issue WO
                      </MenuItem>
                    </span>
                  </Tooltip>
                  <Tooltip title={!canCompleteWorkOrderStatus ? `Must be RELEASED or IN_PROGRESS to complete (current: ${workOrderStatus})` : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isWorkOrderActionLoading || !canCompleteWorkOrderStatus}
                        onClick={() => { setActionsMenuAnchor(null); openWorkOrderActionDialog('complete'); }}
                        sx={{ fontSize: '0.8125rem', color: '#475569', gap: 1 }}>
                        Complete WO
                      </MenuItem>
                    </span>
                  </Tooltip>
                  <Tooltip title={!canCloseWorkOrderStatus ? `Must be COMPLETED before closing (current: ${workOrderStatus})` : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isWorkOrderActionLoading || !canCloseWorkOrderStatus}
                        onClick={() => { setActionsMenuAnchor(null); openWorkOrderActionDialog('close'); }}
                        sx={{ fontSize: '0.8125rem', color: '#475569', gap: 1 }}>
                        Close WO
                      </MenuItem>
                    </span>
                  </Tooltip>
                  <Divider sx={{ my: 0.5 }} />
                  <Tooltip title={!canCancelWorkOrderStatus ? `Cannot cancel — current status: ${workOrderStatus}` : !canManageWorkOrderAdminActions ? 'Admin role required' : ''} placement="left">
                    <span>
                      <MenuItem dense disabled={isWorkOrderActionLoading || !canCancelWorkOrderStatus || !canManageWorkOrderAdminActions}
                        onClick={() => { setActionsMenuAnchor(null); openWorkOrderActionDialog('cancel'); }}
                        sx={{ fontSize: '0.8125rem', color: '#b84040', gap: 1 }}>
                        Cancel WO
                      </MenuItem>
                    </span>
                  </Tooltip>
                  {canShortCloseWorkOrderStatus && canManageWorkOrderAdminActions && (
                    <MenuItem dense disabled={isWorkOrderActionLoading}
                      onClick={() => { setActionsMenuAnchor(null); openWorkOrderActionDialog('short_close'); }}
                      sx={{ fontSize: '0.8125rem', color: '#8a4a1c', gap: 1 }}>
                      Short Close
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="small"
              sx={{
                ...compactButtonSx,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.22)',
              }}
              onClick={workOrderId ? formik.handleSubmit : () => setIsCreateConfirmOpen(true)}
              disabled={isUpdateDisabled}
            >
              {workOrderId ? 'Update' : 'Create'}
            </Button>


          </Stack>
        </Box>

        <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />

        {/* ── PRODUCTION PROGRESS STRIP ── */}
        {workOrderId && (
          <Box sx={{
            display: 'flex', gap: '20px', flexWrap: 'wrap',
            px: '16px', py: '10px', mb: 2,
            bgcolor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '6px',
          }}>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Materials Issued</Typography>
                <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{Math.round(materialProgress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={materialProgress}
                sx={{ height: 5, borderRadius: '9999px', bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: '9999px', bgcolor: materialProgress === 100 ? '#10b981' : '#4a8fc0' } }} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Operations Complete</Typography>
                <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{Math.round(operationProgress)}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={operationProgress}
                sx={{ height: 5, borderRadius: '9999px', bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: '9999px', bgcolor: operationProgress === 100 ? '#10b981' : '#7c5cbf' } }} />
            </Box>
          </Box>
        )}

        {/* ── Compact Schedule Card (shown when WO is SCHEDULED or a result exists) ── */}
        {workOrderId && (formik.values.status === 'SCHEDULED' || scheduleResult) && (
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5,
              px: 2, py: 1, mb: 1.5, borderRadius: 1.5,
              bgcolor: '#f0f7ff', borderColor: '#91caff',
            }}
          >
            <Chip size="small" label="SCHEDULED" color="info" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
            {(formik.values.plannedStartDate || formik.values.plannedEndDate) && (
              <Typography variant="body2" fontWeight={600} color="#0d47a1" sx={{ fontSize: '0.8rem' }}>
                {formik.values.plannedStartDate
                  ? dayjs(formik.values.plannedStartDate).format('DD MMM YYYY')
                  : '–'}
                {' → '}
                {formik.values.plannedEndDate
                  ? dayjs(formik.values.plannedEndDate).format('DD MMM YYYY')
                  : '–'}
              </Typography>
            )}
            {formik.values.estimatedProductionMinutes > 0 && (
              <Typography variant="caption" color="text.secondary">
                {Math.round(formik.values.estimatedProductionMinutes / 60 * 10) / 10} hrs
              </Typography>
            )}
            {formik.values.estimatedTotalCost > 0 && (
              <Typography variant="caption" color="text.secondary">
                ₹{Number(formik.values.estimatedTotalCost).toLocaleString('en-IN')}
              </Typography>
            )}
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              {scheduleResult && (
                <Button size="small" variant="outlined" color="info"
                  sx={{ textTransform: 'none', fontSize: '0.74rem', py: 0.25, px: 1 }}
                  onClick={() => setScheduleDialogOpen(true)}>
                  View Full Schedule
                </Button>
              )}
              {canManageWorkOrderAdminActions && canScheduleWorkOrder && (
                <Button size="small" variant="text" color="info" startIcon={<EventRepeat fontSize="small" />}
                  sx={{ textTransform: 'none', fontSize: '0.74rem', py: 0.25, px: 1 }}
                  onClick={() => setRescheduleDialogOpen(true)}
                  disabled={isScheduleLoading}>
                  Reschedule
                </Button>
              )}
            </Box>
          </Paper>
        )}

        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange} 
          sx={{ 
            mb: 3,
            minHeight: 44,
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
              bgcolor: '#1565c0'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#64748b',
              minHeight: 44,
              '&.Mui-selected': {
                color: '#1565c0'
              }
            }
          }} 
          variant="scrollable" 
          scrollButtons="auto"
        >
          <Tab label="Production Details" />
          <Tab label="Materials & Scrap" />
          <Tab label="Operations Log" />
          <Tab label="Attachments" />
          <Tab label="Timeline & History" />
          <Tab label="Quality Control" />
          {workOrderId && <Tab label="Rejections & Yield" />}
        </Tabs>

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ width: '100%', minWidth: 0, overflow: 'hidden', flex: 1 }}>

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
              materials={formik.values.materials}
            />
          )}
          {selectedTab === 3 && (
            <WorkOrderAttachmentsTab
              workOrderId={workOrderId}
              setError={setError}
              setSnackbar={setSnackbar}
            />
          )}
          {selectedTab === 4 && (
            <WorkOrderHistoryTab
              rows={workOrderHistory}
              loading={isHistoryLoading}
              isAddMode={!workOrderId}
            />
          )}
          {selectedTab === 5 && workOrderId && (
            <WorkOrderQCTab
              workOrderId={workOrderId}
              setError={setError}
              setSnackbar={setSnackbar}
            />
          )}
          {selectedTab === 6 && workOrderId && (
            <WorkOrderRejectionsTab
              workOrderId={workOrderId}
              setError={setError}
              setSnackbar={setSnackbar}
            />
          )}
        </Box>
      </Paper>

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

      <Dialog
        open={shortCloseDialog.open}
        onClose={() => !isWorkOrderActionLoading && setShortCloseDialog({ open: false, remarks: '' })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#92400e' }}>
          Short Close Work Order
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently close the work order before full completion. The system will:
          </DialogContentText>
          <Box component="ul" sx={{ pl: 2, mb: 2, '& li': { mb: 0.5, fontSize: '0.875rem' } }}>
            <li>Accept the partial completed quantity as final output</li>
            <li>Add finished goods to inventory if any were produced</li>
            <li>Return unused issued materials back to store</li>
            <li>Cancel all remaining inventory reservations</li>
            <li>Cancel all pending operations</li>
          </Box>
          {formik.values.allowBackflush && (
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Backflush is enabled. Materials will be auto-consumed proportional to completed quantity before closure.
            </Alert>
          )}
          <TextField
            label="Reason for Short Closure"
            placeholder="e.g. Tool breakage, Priority changed, Material shortage..."
            fullWidth
            multiline
            rows={2}
            size="small"
            value={shortCloseDialog.remarks}
            onChange={(e) => setShortCloseDialog(prev => ({ ...prev, remarks: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShortCloseDialog({ open: false, remarks: '' })}
            disabled={isWorkOrderActionLoading}
            sx={{ textTransform: 'none', color: '#374151' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmShortClose}
            variant="contained"
            disabled={isWorkOrderActionLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#92400e',
              '&:hover': { bgcolor: '#78350f' },
            }}
          >
            {isWorkOrderActionLoading ? 'Processing...' : 'Confirm Short Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Result Dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        result={scheduleResult}
      />

      {/* Unsaved Changes Warning */}
      <Dialog open={showLeaveWarning} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. If you leave now, your changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveWarning(false)}>Stay</Button>
          <Button variant="contained" color="error" onClick={handleLeaveAnyway}>
            Leave anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Work Order Confirmation */}
      <Dialog
        open={isCreateConfirmOpen}
        onClose={() => setIsCreateConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Create Work Order?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once created, the <strong>BOM</strong> and <strong>Reference Document</strong> cannot be changed.
            Make sure these are correct before proceeding.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateConfirmOpen(false)}>Go Back</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => { setIsCreateConfirmOpen(false); formik.handleSubmit(); }}
          >
            Create Work Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onClose={() => !isScheduleLoading && setRescheduleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Reschedule Work Order</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Select a new start date for this work order. The scheduler will recalculate all operation timings.</DialogContentText>
          <TextField
            type="date"
            label="New Start Date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: dayjs().format('YYYY-MM-DD') }}
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRescheduleDialogOpen(false)} disabled={isScheduleLoading} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleReschedule} variant="contained" color="info" disabled={isScheduleLoading || !rescheduleDate} sx={{ textTransform: 'none' }}>
            {isScheduleLoading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Blocked Operation Dialog (WAITING_FOR_DEPENDENCY) ── */}
      <Dialog open={blockedOpDialog.open} onClose={() => setBlockedOpDialog({ open: false, blockingNames: [] })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#d46b08', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠ Cannot Start — Waiting for Dependencies
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            This operation cannot start yet. The following operations must complete first:
          </DialogContentText>
          <Box sx={{ bgcolor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 1.5, p: 1.5 }}>
            {blockedOpDialog.blockingNames.length > 0 ? (
              blockedOpDialog.blockingNames.map((name, i) => (
                <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fa8c16', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{name}</Typography>
                </Box>
              ))
            ) : (
              <Typography sx={{ fontSize: '0.82rem', color: '#8c8c8c' }}>
                Dependency details not available. Check the Operations tab.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setBlockedOpDialog({ open: false, blockingNames: [] })}>
            OK, Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Parallel Start Confirmation Dialog (READY with parallel siblings) ── */}
      <Dialog open={startConfirmDialog.open} onClose={() => setStartConfirmDialog({ open: false, operationId: null, opName: '', parallelOps: [] })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f2744' }}>
          Start Operation — Running in Parallel
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            You are about to start <strong>{startConfirmDialog.opName}</strong>.
          </DialogContentText>
          <Box sx={{ bgcolor: '#f0f7ff', border: '1px solid #91caff', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#1677ff', mb: 0.75 }}>
              ⚡ Currently running in parallel:
            </Typography>
            {startConfirmDialog.parallelOps.map((name, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#52c41a', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{name}</Typography>
              </Box>
            ))}
          </Box>
          <DialogContentText sx={{ fontSize: '0.82rem' }}>
            This operation can run simultaneously (parallel execution). Proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartConfirmDialog({ open: false, operationId: null, opName: '', parallelOps: [] })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              const opId = startConfirmDialog.operationId;
              setStartConfirmDialog({ open: false, operationId: null, opName: '', parallelOps: [] });
              await _doStartOperation(opId);
            }}
          >
            Start in Parallel
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Release Summary Dialog ── */}
      <Dialog
        open={releaseResultDialog.open}
        onClose={() => setReleaseResultDialog({ open: false, readyOps: [], waitingOps: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#0f2744', pb: 0.5 }}>
          Work Order Issued Successfully ✓
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5, fontSize: '0.85rem' }}>
            Operations have been set based on routing dependencies:
          </DialogContentText>

          {releaseResultDialog.readyOps.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#52c41a' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#237804' }}>
                  {releaseResultDialog.readyOps.length} operation(s) ready to start now
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 1.5, p: 1.25 }}>
                {releaseResultDialog.readyOps.map((op, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={1}
                    mb={i < releaseResultDialog.readyOps.length - 1 ? 0.5 : 0}>
                    <Typography sx={{ fontSize: '0.8rem' }}>
                      <strong>Op {op.seq}</strong>{op.name ? ` — ${op.name}` : ''}
                    </Typography>
                    <Chip size="small" label="READY"
                      sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#1677ff', color: '#fff' }} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {releaseResultDialog.waitingOps.length > 0 && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fa8c16' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#d46b08' }}>
                  {releaseResultDialog.waitingOps.length} operation(s) waiting for dependencies
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 1.5, p: 1.25 }}>
                {releaseResultDialog.waitingOps.map((op, i) => (
                  <Box key={i} mb={i < releaseResultDialog.waitingOps.length - 1 ? 1 : 0}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      Op {op.seq}{op.name ? ` — ${op.name}` : ''}
                    </Typography>
                    {op.blockedBy.length > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', color: '#8c8c8c', ml: 1 }}>
                        Waiting for: {op.blockedBy.join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setReleaseResultDialog({ open: false, readyOps: [], waitingOps: [] })}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
