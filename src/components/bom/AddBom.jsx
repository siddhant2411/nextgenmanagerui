import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    Select,
    MenuItem,
    TextField,
    Typography,
    Tabs,
    Tab,
    Grid,
    Autocomplete,
    Snackbar,
    Alert,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Chip,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import apiService, { resolveApiErrorMessage } from "../../services/apiService";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DeleteOutline, FileDownload } from "@mui/icons-material";
import dayjs from "dayjs";
import BomRouting from "./BomRouting";
import BomPositionTable from "./BomPositionTable";
import BomStatusChangeDialog from "./BomStatusChangeDialog";
import { useAuth } from "../../auth/AuthContext";
import { ACTION_KEYS } from "../../auth/roles";
import BomCostBreakdown from "./BomCostBreakdown";
import {
    deleteBomAttachment,
    downloadBomAttachment,
    downloadBomExcel,
    duplicateBom,
    getActiveBomByItemid,
    getBomChangeLog,
    getBomCostBreakdown,
    getBomHistoryByInventoryItem,
    uploadBomAttachment,
} from "../../services/bomService";
import { getAllInventoryItems, searchInventoryItems } from "../../services/inventoryService";

const BORDER_COLOR = "#e5e7eb";
const CRITICAL_SAVE_STATUSES = ["ACTIVE", "APPROVED"];

const bomStatusOptions = [
    { key: "DRAFT", value: "Draft", color: "#e3f2fd", textColor: "#1565c0" },
    { key: "PENDING_APPROVAL", value: "Under Review", color: "#fff3e0", textColor: "#e65100" },
    { key: "APPROVED", value: "Approved", color: "#e8f5e9", textColor: "#2e7d32" },
    { key: "ACTIVE", value: "Active", color: "#e8f5e9", textColor: "#2e7d32" },
    { key: "INACTIVE", value: "Inactive", color: "#fafafa", textColor: "#757575" },
    { key: "OBSOLETE", value: "Obsolete", color: "#ffebee", textColor: "#c62828" },
    { key: "ARCHIVED", value: "Archived", color: "#fafafa", textColor: "#9e9e9e" },
];

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13.5 },
    "& .MuiInputLabel-root": { fontSize: 13.5, mt: 1 },
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.5,
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#90caf9" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1565c0" },
    },
};

const initialFormValues = {
    bomName: "",
    parentItemId: "",
    bomStatus: "DRAFT",
    isActive: true,
    isDefault: false,
    version: 1,
    revision: "",
    effectiveFrom: "",
    effectiveTo: "",
    description: "",
    components: [],
    productFinanceSettings: { stanadrCost: 0 },
};

const getPositionChildItemId = (position) =>
    position?.childInventoryItemId ?? position?.inventoryItemId ?? position?.childInventoryItem?.inventoryItemId ?? null;

const normalizeBomPosition = (position = {}) => ({
    ...position,
    childInventoryItemId: getPositionChildItemId(position),
});

const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const extractArray = (response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.content)) return response.content;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.content)) return response.data.content;
    return [];
};

const formatDate = (value) => {
    if (!value) return "-";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD MMM YYYY") : "-";
};


const resolveOperationCost = (operation) => {
    const costType = operation?.costType || 'CALCULATED';
    if (costType === 'FIXED_RATE' || costType === 'SUB_CONTRACTED') {
        return toFiniteNumber(operation?.fixedCostPerUnit ?? 0);
    }
    const setupTime = toFiniteNumber(operation?.setupTime);
    const runTime = toFiniteNumber(operation?.runTime);
    const totalTime = setupTime + runTime;
    const machineCostRate = toFiniteNumber(
        operation?.machineDetails?.costPerHour ??
        operation?.workCenter?.machineCostPerHour ??
        0
    );
    const laborCostRate = toFiniteNumber(operation?.laborRole?.costPerHour ?? 0);
    const operators = toFiniteNumber(operation?.numberOfOperators ?? 1) || 1;
    const overheadPct = toFiniteNumber(operation?.workCenter?.overheadPercentage ?? 0);
    const machineCost = machineCostRate * totalTime;
    const laborCost = laborCostRate * operators * totalTime;
    const subtotal = machineCost + laborCost;
    return subtotal * (1 + overheadPct / 100);
};

const normalizeComponentForComparison = (component, index) => {
    const key = String(
        getPositionChildItemId(component) ??
        component?.itemCode ??
        `row-${index}`
    );
    return {
        key,
        itemCode:
            component?.itemCode ??
            "-",
        itemName:
            component?.itemName ??
            component?.name ??
            "-",
        quantity: toFiniteNumber(component?.quantity),
        scrapPercentage: toFiniteNumber(component?.scrapPercentage),
    };
};

const normalizeOperationForComparison = (operation, index) => {
    const key = String(
        operation?.id ??
        operation?._tempId ??
        operation?.operationId ??
        operation?.routingOperationId ??
        operation?.sequenceNumber ??
        `op-${index}`
    );
    return {
        key,
        name: operation?.name ?? operation?.operationName ?? `Operation ${index + 1}`,
        setupTime: toFiniteNumber(operation?.setupTime),
        runTime: toFiniteNumber(operation?.runTime),
        totalCost: resolveOperationCost(operation),
    };
};

const buildComponentDiff = (currentComponents, baseComponents) => {
    const currentMap = new Map(
        currentComponents
            .filter((component) => !component?.isChild)
            .map((component, index) => {
                const normalized = normalizeComponentForComparison(component, index);
                return [normalized.key, normalized];
            })
    );
    const baseMap = new Map(
        (baseComponents || []).map((component, index) => {
            const normalized = normalizeComponentForComparison(component, index);
            return [normalized.key, normalized];
        })
    );

    const added = [];
    const removed = [];
    const updated = [];

    currentMap.forEach((currentItem, key) => {
        const baseItem = baseMap.get(key);
        if (!baseItem) {
            added.push(currentItem);
            return;
        }
        if (
            currentItem.quantity !== baseItem.quantity ||
            currentItem.scrapPercentage !== baseItem.scrapPercentage
        ) {
            updated.push({
                itemCode: currentItem.itemCode,
                itemName: currentItem.itemName,
                fromQty: baseItem.quantity,
                toQty: currentItem.quantity,
                fromScrap: baseItem.scrapPercentage,
                toScrap: currentItem.scrapPercentage,
            });
        }
    });

    baseMap.forEach((baseItem, key) => {
        if (!currentMap.has(key)) {
            removed.push(baseItem);
        }
    });

    return { added, removed, updated };
};

const buildOperationDiff = (currentOperations, baseOperations) => {
    const currentMap = new Map(
        (currentOperations || []).map((operation, index) => {
            const normalized = normalizeOperationForComparison(operation, index);
            return [normalized.key, normalized];
        })
    );
    const baseMap = new Map(
        (baseOperations || []).map((operation, index) => {
            const normalized = normalizeOperationForComparison(operation, index);
            return [normalized.key, normalized];
        })
    );

    const added = [];
    const removed = [];
    const updated = [];

    currentMap.forEach((currentOperation, key) => {
        const baseOperation = baseMap.get(key);
        if (!baseOperation) {
            added.push(currentOperation);
            return;
        }
        if (
            currentOperation.setupTime !== baseOperation.setupTime ||
            currentOperation.runTime !== baseOperation.runTime ||
            currentOperation.totalCost !== baseOperation.totalCost
        ) {
            updated.push({
                name: currentOperation.name,
                fromSetup: baseOperation.setupTime,
                toSetup: currentOperation.setupTime,
                fromRun: baseOperation.runTime,
                toRun: currentOperation.runTime,
                fromHourlyCost: baseOperation.totalCost,
                toHourlyCost: currentOperation.totalCost,
            });
        }
    });

    baseMap.forEach((baseOperation, key) => {
        if (!currentMap.has(key)) {
            removed.push(baseOperation);
        }
    });

    return { added, removed, updated };
};

const buildDirtySignature = (values, operations) => {
    const normalizedValues = {
        bomName: values?.bomName ?? "",
        parentItemId: values?.parentItemId ?? "",
        bomStatus: values?.bomStatus ?? "DRAFT",
        isActive: Boolean(values?.isActive),
        isDefault: Boolean(values?.isDefault),
        revision: values?.revision ?? "",
        effectiveFrom: values?.effectiveFrom ?? "",
        effectiveTo: values?.effectiveTo ?? "",
        description: values?.description ?? "",
        components: (values?.components || [])
            .filter((component) => !component?.isChild)
            .map((component) => ({
                childInventoryItemId: getPositionChildItemId(component),
                position: toFiniteNumber(component?.position),
                quantity: toFiniteNumber(component?.quantity),
                scrapPercentage: toFiniteNumber(component?.scrapPercentage),
                routingOperationId: component?.routingOperationId ?? null,
            }))
            .sort((a, b) => a.position - b.position),
    };

    const normalizedOperations = (operations || []).map((operation, index) => ({
        key:
            operation?.id ??
            operation?._tempId ??
            operation?.operationId ??
            operation?.routingOperationId ??
            index,
        name: operation?.name ?? operation?.operationName ?? "",
        sequenceNumber: toFiniteNumber(operation?.sequenceNumber),
        setupTime: toFiniteNumber(operation?.setupTime),
        runTime: toFiniteNumber(operation?.runTime),
        inspection: Boolean(operation?.inspection),
        notes: operation?.notes ?? "",
        productionJobId: operation?.productionJob?.id ?? operation?.productionJobId ?? null,
        workCenterId: operation?.workCenter?.id ?? operation?.workCenterId ?? null,
    }));

    return JSON.stringify({ values: normalizedValues, operations: normalizedOperations });
};

const mapErrorTreeToTouched = (errorTree) => {
    if (Array.isArray(errorTree)) {
        return errorTree.map((entry) => mapErrorTreeToTouched(entry));
    }
    if (errorTree && typeof errorTree === "object") {
        return Object.keys(errorTree).reduce((accumulator, key) => {
            accumulator[key] = mapErrorTreeToTouched(errorTree[key]);
            return accumulator;
        }, {});
    }
    return true;
};

const AddBom = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parentItems, setParentItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchedItemList, setSearchedItemList] = useState([]);
    const [bomAttachments, setBomAttachments] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [bomDetails, setBomDetails] = useState(null);
    const [operations, setOperations] = useState([]);
    const [workCenters, setWorkCenters] = useState([]);
    const [laborRoles, setLaborRoles] = useState([]);
    const [machinesList, setMachinesList] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [activeBomForItem, setActiveBomForItem] = useState(null);
    const [routingOperationOptions, setRoutingOperationOptions] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [isDirty, setIsDirty] = useState(false);
    const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
    const [bomHistory, setBomHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [changeLogEntries, setChangeLogEntries] = useState([]);
    const [changeLogLoading, setChangeLogLoading] = useState(false);
    const [compareWithBomId, setCompareWithBomId] = useState("");
    const [compareBaseBom, setCompareBaseBom] = useState(null);
    const [compareLoading, setCompareLoading] = useState(false);
    const [costBreakdown, setCostBreakdown] = useState(null);
    const [costBreakdownLoading, setCostBreakdownLoading] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [nextStatus, setNextStatus] = useState(null);

    const { canAction } = useAuth();
    const canChangeBomStatus = canAction(ACTION_KEYS.BOM_STATUS_VERSION_WRITE);

    const debounceTimeout = useRef(null);
    const parentSearchRef = useRef("");
    const baselineSignatureRef = useRef(null);
    const pauseDirtyTrackingRef = useRef(false);
    const initialLoadRef = useRef({ bomId: null });
    const navigate = useNavigate();
    const { bomId } = useParams();
    const location = useLocation();

    const showSnackbar = useCallback((message, severity = "success") => {
        if (!message) return;
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleChangeStatus = (e) => {
        if (!canChangeBomStatus) {
            showSnackbar("You are not authorized to change BOM status.", "error");
            return;
        }
        setNextStatus(e.target.value);
        setStatusDialogOpen(true);
    };

    const handleStatusConfirm = async (payload) => {
        if (!canChangeBomStatus) {
            showSnackbar("You are not authorized to change BOM status.", "error");
            return;
        }
        const finalPayload = {
            bomId, nextStatus: payload.nextStatus, ecoNumber: payload.ecoNumber || "",
            changeReason: payload.changeReason || "", approvalComments: payload.approvalComments || ""
        };
        try {
            setLoading(true);
            const res = await apiService.post("/bom/changeStatus/" + bomId, finalPayload);
            showSnackbar("Status changed to: " + res.bomStatus);
            formik.setFieldValue("bomStatus", res.bomStatus);
            formik.setFieldValue("revision", res.revision);
            formik.setFieldValue("ecoNumber", res.ecoNumber);
            formik.setFieldValue("changeReason", res.changeReason);
            formik.setFieldValue("approvedBy", res.approvedBy);
            formik.setFieldValue("approvalDate", res.approvalDate);
            formik.setFieldValue("approvalComments", res.approvalComments);
            formik.setFieldValue("effectiveFrom", res.effectiveFrom);
            formik.setFieldValue("effectiveTo", res.effectiveTo);
            formik.setFieldValue("updatedDate", res.updatedDate);
        } catch (e) {
            showSnackbar(resolveApiErrorMessage(e, "Failed to change BOM status."), "error");
        }
        setLoading(false);
        setStatusDialogOpen(false);
    };

    const formik = useFormik({
        initialValues: initialFormValues,
        validationSchema: Yup.object({
            bomName: Yup.string().required("Required"),
            parentItemId: Yup.string().required("Required"),
        }),
        onSubmit: async (values, helpers) => {
            const sanitize = (objectValue) =>
                JSON.parse(
                    JSON.stringify(
                        objectValue,
                        (_, fieldValue) => (fieldValue === "" ? null : fieldValue)
                    )
                );

            const bomPayload = {
                id: bomId || null,
                bomName: values.bomName,
                parentInventoryItem: { inventoryItemId: values.parentItemId },
                description: values.description,
                isActive: values.isActive,
                isDefault: values.isDefault,
                revision: values.revision,
                effectiveFrom: values.effectiveFrom !== "Invalid Date" ? values.effectiveFrom : null,
                effectiveTo: values.effectiveTo !== "Invalid Date" ? values.effectiveTo : null,
                bomStatus: values.bomStatus || "DRAFT",
                positions: (values.components || [])
                    .filter((component) => !component?.isChild)
                    .filter((component) => Boolean(getPositionChildItemId(component)))
                    .map((component) => ({
                        childInventoryItem: { inventoryItemId: getPositionChildItemId(component) },
                        quantity: toFiniteNumber(component.quantity),
                        position: toFiniteNumber(component.position),
                        scrapPercentage: toFiniteNumber(component.scrapPercentage),
                        routingOperationId: component.routingOperationId ?? null,
                        routingOperationSequenceNumber: component.routingOperationSequenceNumber ?? null,
                    })),
            };

            const payload = sanitize({
                bom: bomPayload,
                routing: {
                    status: values.routing?.status,
                    createdBy: values.routing?.createdBy,
                    operations,
                },
            });

            try {
                helpers.setSubmitting(true);
                if (bomId) {
                    await apiService.put(`/bom/${bomId}`, payload);
                    showSnackbar("BOM updated successfully");
                } else {
                    await apiService.post("/bom", payload);
                    showSnackbar("BOM created successfully");
                }
                baselineSignatureRef.current = buildDirtySignature(values, operations);
                setIsDirty(false);
            } catch (errorResponse) {
                showSnackbar(
                    resolveApiErrorMessage(errorResponse, "Failed to save BOM."),
                    "error"
                );
            } finally {
                helpers.setSubmitting(false);
            }
        },
    });

    const parentItemId =
        formik.values.parentItemId || bomDetails?.bom?.parentInventoryItem?.inventoryItemId || null;

    const isCriticalStatus = CRITICAL_SAVE_STATUSES.includes(
        String(formik.values.bomStatus || "").toUpperCase()
    );

    const applyFormSnapshot = useCallback(
        (nextValues, nextOperations = []) => {
            pauseDirtyTrackingRef.current = true;
            formik.setValues(nextValues, false);
            setOperations(nextOperations);
            baselineSignatureRef.current = buildDirtySignature(nextValues, nextOperations);
            setIsDirty(false);
            setTimeout(() => {
                pauseDirtyTrackingRef.current = false;
            }, 0);
        },
        [formik.setValues]
    );

    const fetchInventoryItems = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: 0, size: 10, sortBy: "name", sortDir: "asc", query: search };
            const data = await searchInventoryItems(params);
            setSearchedItemList(data.content || []);
        } catch (fetchError) {
            setError(fetchError);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBomAttachments = useCallback(async () => {
        if (!bomId) return;
        setLoading(true);
        try {
            const response = await apiService.get(`/bom/${bomId}/attachments`);
            setBomAttachments(response || []);
        } catch (fetchError) {
            showSnackbar(
                resolveApiErrorMessage(fetchError, "Failed to fetch BOM attachments."),
                "error"
            );
        } finally {
            setLoading(false);
        }
    }, [bomId, showSnackbar]);

    const fetchParentItems = useCallback(async () => {
        try {
            const response = await getAllInventoryItems({ page: 0, size: 100 });
            setParentItems(response.content || []);
        } catch (fetchError) {
            showSnackbar("Failed to fetch parent items.", "error");
        }
    }, [showSnackbar]);

    const fetchBomDetails = useCallback(async () => {
        if (!bomId) return;
        try {
            const data = await apiService.get(`/bom/${bomId}`);
            const bom = data?.bom || {};
            const routing = data?.routing || {};
            const nextOperations = routing.operations || [];
            const nextValues = {
                ...initialFormValues,
                bomName: bom.bomName || "",
                parentItemId: bom.parentInventoryItem?.inventoryItemId || "",
                isActive: Boolean(bom.isActive),
                isDefault: Boolean(bom.isDefault),
                revision: bom.revision || "",
                effectiveFrom: dayjs(bom.effectiveFrom).isValid()
                    ? dayjs(bom.effectiveFrom).format("YYYY-MM-DD")
                    : "",
                effectiveTo: dayjs(bom.effectiveTo).isValid()
                    ? dayjs(bom.effectiveTo).format("YYYY-MM-DD")
                    : "",
                components: (bom.positions || []).map(normalizeBomPosition),
                operations: nextOperations,
                routingStatus: routing.status,
                routingCreatedBy: routing.createdBy,
                ecoNumber: bom.ecoNumber,
                bomStatus: bom.bomStatus || "DRAFT",
                creationDate: bom.creationDate,
                updatedDate: bom.updatedDate,
                approvalDate: bom.approvalDate,
                approvedBy: bom.approvedBy,
                description: bom.description || "",
            };
            setBomDetails(data);
            setSelectedItem(bom.parentInventoryItem || null);
            applyFormSnapshot(nextValues, nextOperations);
        } catch (fetchError) {
            showSnackbar(
                resolveApiErrorMessage(fetchError, "Failed to fetch BOM details."),
                "error"
            );
        }
    }, [applyFormSnapshot, bomId, showSnackbar]);

    const fetchRoutingByBom = useCallback(async () => {
        if (!bomId) {
            setRoutingOperationOptions([]);
            return;
        }
        try {
            const data = await apiService.get(`/routing/bom/${bomId}`);
            const operationsList =
                data?.operations || data?.routing?.operations || data?.routingOperations || [];
            const normalizedOperations = Array.isArray(operationsList)
                ? operationsList.map((operation) => ({
                    ...operation,
                    id:
                        operation?.id ??
                        operation?.operationId ??
                        operation?.routingOperationId ??
                        null,
                    name:
                        operation?.name ??
                        operation?.operationName ??
                        `Operation ${operation?.sequenceNumber ?? ""}`.trim(),
                }))
                : [];
            setRoutingOperationOptions(normalizedOperations);
        } catch (fetchError) {
            setRoutingOperationOptions([]);
        }
    }, [bomId]);

    const fetchProductionJob = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.get("/production/production-job", {
                page: 0,
                size: 5,
                sortBy: "jobName",
                sortDir: "asc",
                search,
            });
            setJobs(response.content || []);
        } catch (fetchError) {
            setError("Failed to fetch jobs");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchWorkCenter = useCallback(async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.get("/manufacturing/work-center/search", {
                page: 0,
                size: 5,
                sortBy: "centerName",
                sortDir: "asc",
                search,
            });
            setWorkCenters(response.content || []);
        } catch (fetchError) {
            showSnackbar("Failed to fetch work centers.", "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    const fetchCostBreakdown = useCallback(async () => {
        if (!bomId) return;
        setCostBreakdownLoading(true);
        try {
            const data = await getBomCostBreakdown(bomId);
            setCostBreakdown(data);
        } catch (fetchError) {
            showSnackbar("Failed to fetch cost breakdown.", "error");
        } finally {
            setCostBreakdownLoading(false);
        }
    }, [bomId, showSnackbar]);

    const fetchLaborRoles = useCallback(async (search = "") => {
        try {
            const response = await apiService.get("/production/labor-role", {
                page: 0,
                size: 100,
                sortBy: "roleName",
                sortDir: "asc",
                search,
            });
            setLaborRoles(response.content || []);
        } catch (fetchError) {
            // silent - labor roles are optional
        }
    }, []);

    const fetchMachines = useCallback(async () => {
        try {
            const response = await apiService.get("/machine-details");
            setMachinesList(response || []);
        } catch (fetchError) {
            // silent - machines are optional
        }
    }, []);

    const handleConfirmDuplicate = async () => {
        try {
            setDuplicating(true);
            const duplicated = await duplicateBom(bomId);
            showSnackbar("BOM duplicated successfully");
            setDuplicateDialogOpen(false);
            navigate(`/bom/edit/${duplicated?.bom?.id}`);
        } catch (duplicateError) {
            showSnackbar(
                resolveApiErrorMessage(duplicateError, "Failed to duplicate BOM."),
                "error"
            );
        } finally {
            setDuplicating(false);
        }
    };

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchInventoryItems(query), 300);
    };

    const handleParentItemSearch = (query, reason) => {
        if (reason && reason !== "input") return;
        const nextQuery = query ?? "";
        if (parentSearchRef.current === nextQuery) return;
        parentSearchRef.current = nextQuery;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => fetchInventoryItems(nextQuery), 300);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            showSnackbar("Please select a file", "warning");
            return;
        }
        try {
            setUploading(true);
            await uploadBomAttachment(bomId, selectedFile);
            showSnackbar("File uploaded successfully");
            setSelectedFile(null);
            await fetchBomAttachments();
        } catch (uploadError) {
            showSnackbar(
                resolveApiErrorMessage(uploadError, "File upload failed."),
                "error"
            );
        } finally {
            setUploading(false);
        }
    };

    const handleFileDelete = async (fileId) => {
        setLoading(true);
        try {
            await deleteBomAttachment(bomId, fileId);
            await fetchBomAttachments();
            showSnackbar("File deleted successfully");
        } catch (deleteError) {
            showSnackbar(
                resolveApiErrorMessage(deleteError, "Failed to delete file."),
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    const downloadAttachment = async (fileId, fileName) => {
        try {
            await downloadBomAttachment(fileId, fileName);
            showSnackbar("File downloaded");
        } catch (downloadError) {
            showSnackbar(
                resolveApiErrorMessage(downloadError, "Failed to download file."),
                "error"
            );
        }
    };

    const downloadExcel = async () => {
        try {
            await downloadBomExcel(bomId);
            showSnackbar("Excel downloaded");
        } catch (downloadError) {
            showSnackbar(
                resolveApiErrorMessage(downloadError, "Failed to download Excel."),
                "error"
            );
        }
    };

    const handleSubmitClick = async () => {
        const validationErrors = await formik.validateForm();
        if (Object.keys(validationErrors).length > 0) {
            formik.setTouched(mapErrorTreeToTouched(validationErrors), true);
            return;
        }
        setSaveConfirmOpen(true);
    };

    const confirmSave = async () => {
        setSaveConfirmOpen(false);
        await formik.submitForm();
    };

    const comparisonSummary = useMemo(() => {
        if (!compareBaseBom) return null;
        return {
            components: buildComponentDiff(
                formik.values.components || [],
                compareBaseBom?.bom?.positions || []
            ),
            operations: buildOperationDiff(
                operations || [],
                compareBaseBom?.routing?.operations || []
            ),
        };
    }, [compareBaseBom, formik.values.components, operations]);

    useEffect(() => {
        if (initialLoadRef.current.bomId === bomId) return;
        initialLoadRef.current.bomId = bomId ?? null;
        fetchParentItems();
        fetchRoutingByBom();
        if (bomId) {
            fetchBomDetails();
        }
    }, [bomId, fetchParentItems, fetchRoutingByBom, fetchBomDetails]);

    useEffect(() => {
        const duplicatedBom = location.state?.duplicateBom;
        const initialInventoryItem = location.state?.inventoryItem;

        if (duplicatedBom) {
            const nextValues = {
                ...initialFormValues,
                bomName: "",
                parentItemId: duplicatedBom.parentInventoryItem?.inventoryItemId || "",
                isActive: true,
                isDefault: false,
                revision: "",
                effectiveFrom: "",
                effectiveTo: "",
                components: (duplicatedBom.components || []).map((component, index) => ({
                    ...normalizeBomPosition(component),
                    quantity: component.quantity || 1,
                    position: component.position || (index + 1) * 10,
                    routingOperationId: component.routingOperationId ?? null,
                    routingOperationName: component.routingOperationName ?? null,
                })),
            };
            setBomDetails(duplicatedBom);
            setSelectedItem(duplicatedBom.parentInventoryItem || null);
            applyFormSnapshot(nextValues, []);
            window.history.replaceState({}, document.title);
        } else if (initialInventoryItem && !bomId && initialFormValues) {
            const nextValues = {
                ...initialFormValues,
                parentItemId: initialInventoryItem.inventoryItemId || initialInventoryItem.id || "",
            };
            setSelectedItem(initialInventoryItem);
            applyFormSnapshot(nextValues, []);
            window.history.replaceState({}, document.title);
        }
    }, [applyFormSnapshot, location.state, bomId]);

    useEffect(() => {
        const itemId = bomDetails?.bom?.parentInventoryItem?.inventoryItemId;
        if (!itemId) {
            setActiveBomForItem(null);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const response = await getActiveBomByItemid(itemId);
                if (!mounted) return;
                setActiveBomForItem(response?.bom || response || null);
            } catch (fetchError) {
                if (mounted) setActiveBomForItem(null);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [bomDetails?.bom?.parentInventoryItem?.inventoryItemId]);

    useEffect(() => {
        if (selectedTab === 2 && bomId && bomAttachments === null) {
            fetchBomAttachments();
        }
    }, [selectedTab, bomId, bomAttachments, fetchBomAttachments]);

    useEffect(() => {
        if (selectedTab === 3 && bomId) {
            fetchCostBreakdown();
        }
    }, [selectedTab, bomId, fetchCostBreakdown]);

    useEffect(() => {
        if (!parentItemId) {
            setBomHistory([]);
            setCompareWithBomId("");
            return;
        }
        let mounted = true;
        setHistoryLoading(true);
        (async () => {
            try {
                const response = await getBomHistoryByInventoryItem(parentItemId);
                if (!mounted) return;
                const history = extractArray(response)
                    .filter((entry) => entry?.id)
                    .filter((entry) => String(entry.id) !== String(bomId))
                    .sort(
                        (a, b) =>
                            new Date(b.updatedDate || b.creationDate || 0).getTime() -
                            new Date(a.updatedDate || a.creationDate || 0).getTime()
                    );
                setBomHistory(history);
                if (!history.some((entry) => String(entry.id) === String(compareWithBomId))) {
                    setCompareWithBomId("");
                }
            } catch (fetchError) {
                if (mounted) setBomHistory([]);
            } finally {
                if (mounted) setHistoryLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [parentItemId, bomId, compareWithBomId]);

    useEffect(() => {
        if (!bomId) {
            setChangeLogEntries([]);
            return;
        }
        let mounted = true;
        setChangeLogLoading(true);
        (async () => {
            try {
                const response = await getBomChangeLog(bomId);
                if (!mounted) return;
                setChangeLogEntries(extractArray(response));
            } catch (fetchError) {
                if (mounted) setChangeLogEntries([]);
            } finally {
                if (mounted) setChangeLogLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [bomId]);

    useEffect(() => {
        if (!compareWithBomId) {
            setCompareBaseBom(null);
            return;
        }
        let mounted = true;
        setCompareLoading(true);
        (async () => {
            try {
                const response = await apiService.get(`/bom/${compareWithBomId}`);
                if (!mounted) return;
                setCompareBaseBom(response);
            } catch (fetchError) {
                if (mounted) {
                    setCompareBaseBom(null);
                    showSnackbar("Failed to load selected revision for comparison.", "error");
                }
            } finally {
                if (mounted) setCompareLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [compareWithBomId, showSnackbar]);

    useEffect(() => {
        const signature = buildDirtySignature(formik.values, operations);
        if (baselineSignatureRef.current === null) {
            baselineSignatureRef.current = signature;
            setIsDirty(false);
            return;
        }
        if (pauseDirtyTrackingRef.current) return;
        setIsDirty(signature !== baselineSignatureRef.current);
    }, [formik.values, operations]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const currentStatusInfo = bomStatusOptions.find(s => s.key === formik.values.bomStatus);

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Box
                        sx={{
                            p: { xs: 1.5, sm: 2, md: 2.5 },
                            backgroundColor: "#fff",
                            borderRadius: 2,
                            border: `1px solid ${BORDER_COLOR}`,
                            minHeight: 500,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* ── Header Row 1: Title + Actions ── */}
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                            flexDirection={{ xs: "column", sm: "row" }}
                            gap={1}
                        >
                            <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                                <Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography
                                            variant="h5"
                                            fontWeight={700}
                                            sx={{ color: "#0f2744", fontSize: { xs: "1.2rem", md: "1.4rem" } }}
                                        >
                                            {bomId ? formik.values.bomName || "Edit BOM" : "New BOM"}
                                        </Typography>
                                        {bomId && formik.values.revision && (
                                            <Chip size="small" label={`Rev. ${formik.values.revision}`}
                                                sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: '#f0f4ff', color: '#1565c0' }} />
                                        )}
                                        {formik.values.ecoNumber && (
                                            <Chip size="small" label={`ECO: ${formik.values.ecoNumber}`} variant="outlined"
                                                sx={{ fontSize: '0.72rem', borderColor: BORDER_COLOR }} />
                                        )}
                                    </Box>
                                </Box>
                                {bomId &&
                                    activeBomForItem?.id &&
                                    String(activeBomForItem.id) !== String(bomId) && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => navigate(`/bom/edit/${activeBomForItem.id}`)}
                                            sx={{
                                                textTransform: "none",
                                                fontSize: "0.75rem",
                                                borderColor: BORDER_COLOR,
                                                color: "#374151",
                                            }}
                                        >
                                            Go to Active BOM
                                        </Button>
                                    )}
                            </Box>

                            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                                {bomId && (
                                    <>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<FileDownload />}
                                            onClick={downloadExcel}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 500,
                                                borderColor: BORDER_COLOR,
                                                color: "#374151",
                                            }}
                                        >
                                            Excel
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => setDuplicateDialogOpen(true)}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 500,
                                                borderColor: BORDER_COLOR,
                                                color: "#374151",
                                            }}
                                        >
                                            Duplicate
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => navigate('/production/work-order/add', { state: { bom: bomDetails?.bom || activeBomForItem } })}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 500,
                                                borderColor: BORDER_COLOR,
                                                color: "#374151",
                                            }}
                                        >
                                            Create Work Order
                                        </Button>
                                    </>
                                )}
                                <Button
                                    type="button"
                                    variant="contained"
                                    size="small"
                                    onClick={handleSubmitClick}
                                    disabled={formik.isSubmitting}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        px: 3,
                                        borderRadius: 1.5,
                                        bgcolor: "#1565c0",
                                        boxShadow: "0 2px 8px rgba(21,101,192,0.25)",
                                        "&:hover": { bgcolor: "#0d47a1" },
                                    }}
                                >
                                    {bomId ? "Update" : "Create"}
                                </Button>
                            </Box>
                        </Box>

                        {/* ── Header Row 2: Status + Metadata (only for existing BOMs) ── */}
                        {bomId && (
                            <Box
                                display="flex"
                                alignItems="center"
                                gap={2}
                                flexWrap="wrap"
                                mb={1.5}
                                sx={{ px: 0.5 }}
                            >
                                {/* Status selector */}
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <Select
                                        name="bomStatus"
                                        value={formik.values.bomStatus || ""}
                                        onChange={handleChangeStatus}
                                        disabled={!canChangeBomStatus || loading}
                                        sx={{
                                            borderRadius: 1.5,
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            bgcolor: currentStatusInfo?.color || '#fafafa',
                                            color: currentStatusInfo?.textColor || '#374151',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_COLOR },
                                            height: 32,
                                        }}
                                    >
                                        {bomStatusOptions.map((option) => (
                                            <MenuItem key={option.key} value={option.key} sx={{ fontSize: '0.8rem' }}>
                                                {option.value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                                {/* Created */}
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 500 }}>
                                        Created:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        {formatDate(formik.values.creationDate)}
                                    </Typography>
                                </Box>

                                {/* Updated */}
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 500 }}>
                                        Updated:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        {formatDate(formik.values.updatedDate)}
                                    </Typography>
                                </Box>

                                {/* Approved */}
                                {formik.values.approvalDate && (
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 500 }}>
                                            Approved:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                            {formatDate(formik.values.approvalDate)}
                                        </Typography>
                                        {formik.values.approvedBy && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                by {formik.values.approvedBy}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}

                        <Divider sx={{ mb: 2 }} />

                        {nextStatus && (
                            <BomStatusChangeDialog
                                open={statusDialogOpen}
                                onClose={() => { setStatusDialogOpen(false); setNextStatus(null); }}
                                onConfirm={handleStatusConfirm}
                                currentStatus={formik.values.bomStatus}
                                nextStatus={nextStatus}
                            />
                        )}

                        <Tabs
                            value={selectedTab}
                            onChange={(_, tab) => setSelectedTab(tab)}
                            sx={{
                                mb: 2,
                                "& .MuiTab-root": {
                                    textTransform: "none",
                                    fontWeight: 500,
                                    fontSize: "0.875rem",
                                    minHeight: 40,
                                },
                                "& .Mui-selected": { color: "#1565c0" },
                                "& .MuiTabs-indicator": { backgroundColor: "#1565c0", height: 2.5 },
                            }}
                        >
                            <Tab label="Basic Info" />
                            <Tab label="Operations" />
                            {bomId && <Tab label="Attachments" />}
                            {bomId && <Tab label="Cost Breakdown" />}
                        </Tabs>

                        <form
                            onSubmit={formik.handleSubmit}
                            style={{ flex: 1, display: "flex", flexDirection: "column" }}
                        >
                            {selectedTab === 0 && (
                                <Box sx={{ flex: 1, overflow: "auto", maxHeight: "calc(100vh - 320px)" }}>
                                    <Grid container spacing={2} mb={2}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField
                                                label="BOM Name"
                                                fullWidth
                                                size="small"
                                                {...formik.getFieldProps("bomName")}
                                                error={formik.touched.bomName && Boolean(formik.errors.bomName)}
                                                helperText={formik.touched.bomName && formik.errors.bomName}
                                                sx={fieldSx}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <FormControl fullWidth size="small">
                                                <Autocomplete
                                                    fullWidth
                                                    options={parentItems}
                                                    value={selectedItem || null}
                                                    getOptionLabel={(item) =>
                                                        `${item?.name || ""} - ${item?.itemCode || ""}`
                                                    }
                                                    onChange={(_, item) => {
                                                        setSelectedItem(item);
                                                        formik.setFieldValue("parentItemId", item?.inventoryItemId || "");
                                                    }}
                                                    sx={fieldSx}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            size="small"
                                                            placeholder="BOM Header Item"
                                                        />
                                                    )}
                                                    onInputChange={(_, value, reason) => handleParentItemSearch(value, reason)}
                                                    loading={loading}
                                                />
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField
                                                type="date"
                                                label="Effective From"
                                                fullWidth
                                                size="small"
                                                InputLabelProps={{ shrink: true }}
                                                {...formik.getFieldProps("effectiveFrom")}
                                                sx={fieldSx}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <TextField
                                                type="date"
                                                label="Effective To"
                                                fullWidth
                                                size="small"
                                                InputLabelProps={{ shrink: true }}
                                                {...formik.getFieldProps("effectiveTo")}
                                                sx={fieldSx}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                type="text"
                                                label="Description"
                                                fullWidth
                                                size="small"
                                                InputLabelProps={{ shrink: true }}
                                                {...formik.getFieldProps("description")}
                                                sx={fieldSx}
                                            />
                                        </Grid>
                                    </Grid>

                                    <BomPositionTable
                                        searchedItemList={searchedItemList}
                                        searchQuery={searchQuery}
                                        handleSearchChange={handleSearchChange}
                                        formik={formik}
                                        operations={
                                            routingOperationOptions?.length ? routingOperationOptions : operations
                                        }
                                    />
                                    {bomId && (
                                        <Box
                                            sx={{
                                                mt: 2,
                                                p: 2,
                                                borderRadius: 1.5,
                                                border: `1px solid ${BORDER_COLOR}`,
                                                bgcolor: "#fff",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={600}
                                                color="#0f2744"
                                                sx={{
                                                    fontSize: "0.8125rem",
                                                    textTransform: "uppercase",
                                                    letterSpacing: 0.8,
                                                    mb: 1.5,
                                                }}
                                            >
                                                Revision Compare
                                            </Typography>

                                            <FormControl fullWidth size="small" sx={{ maxWidth: 420 }}>
                                                <Select
                                                    displayEmpty
                                                    value={compareWithBomId}
                                                    onChange={(event) => setCompareWithBomId(event.target.value)}
                                                    sx={{ borderRadius: 1.5, fontSize: "0.8125rem" }}
                                                >
                                                    <MenuItem value="">Select revision to compare</MenuItem>
                                                    {historyLoading && (
                                                        <MenuItem disabled value="">
                                                            Loading history...
                                                        </MenuItem>
                                                    )}
                                                    {bomHistory.map((historyEntry) => (
                                                        <MenuItem
                                                            key={historyEntry.id}
                                                            value={String(historyEntry.id)}
                                                            sx={{ fontSize: "0.8125rem" }}
                                                        >
                                                            Rev {historyEntry.revision || "-"} - {historyEntry.bomStatus || "-"}
                                                            {" ("}
                                                            {formatDate(historyEntry.updatedDate || historyEntry.creationDate)}
                                                            {")"}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            {compareLoading && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                                    Loading selected revision...
                                                </Typography>
                                            )}

                                            {comparisonSummary && (
                                                <Box sx={{ mt: 1.5 }}>
                                                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                                                        <Chip
                                                            size="small"
                                                            label={`Components Added: ${comparisonSummary.components.added.length}`}
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={`Components Removed: ${comparisonSummary.components.removed.length}`}
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={`Components Updated: ${comparisonSummary.components.updated.length}`}
                                                            color="warning"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            size="small"
                                                            label={`Operations Updated: ${comparisonSummary.operations.updated.length}`}
                                                            color="info"
                                                            variant="outlined"
                                                        />
                                                    </Box>

                                                    <List dense sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
                                                        {comparisonSummary.components.updated.length === 0 && (
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary="No component quantity/scrap changes in comparison."
                                                                    primaryTypographyProps={{
                                                                        variant: "body2",
                                                                        color: "text.secondary",
                                                                    }}
                                                                />
                                                            </ListItem>
                                                        )}
                                                        {comparisonSummary.components.updated.slice(0, 10).map((entry, index) => (
                                                            <ListItem key={`${entry.itemCode}-${index}`} divider={index < 9}>
                                                                <ListItemText
                                                                    primary={`${entry.itemCode} - ${entry.itemName}`}
                                                                    secondary={`Qty ${entry.fromQty} -> ${entry.toQty}, Scrap ${entry.fromScrap}% -> ${entry.toScrap}%`}
                                                                />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </Box>
                                            )}

                                            <Divider sx={{ my: 2 }} />

                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={600}
                                                color="#0f2744"
                                                sx={{
                                                    fontSize: "0.8125rem",
                                                    textTransform: "uppercase",
                                                    letterSpacing: 0.8,
                                                    mb: 1,
                                                }}
                                            >
                                                Change Log
                                            </Typography>

                                            {changeLogLoading && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Loading change log...
                                                </Typography>
                                            )}

                                            {!changeLogLoading && changeLogEntries.length === 0 && (
                                                <Box
                                                    sx={{
                                                        py: 2,
                                                        textAlign: "center",
                                                        background: "#fafbfc",
                                                        borderRadius: 1.5,
                                                        border: `1px dashed ${BORDER_COLOR}`,
                                                    }}
                                                >
                                                    <Typography variant="body2" color="text.secondary">
                                                        No change log entries available.
                                                    </Typography>
                                                </Box>
                                            )}

                                            {!changeLogLoading && changeLogEntries.length > 0 && (
                                                <List
                                                    dense
                                                    sx={{
                                                        border: `1px solid ${BORDER_COLOR}`,
                                                        borderRadius: 1.5,
                                                        maxHeight: 260,
                                                        overflow: "auto",
                                                    }}
                                                >
                                                    {changeLogEntries.map((entry, index) => {
                                                        const eventDate =
                                                            entry?.changedAt ??
                                                            entry?.updatedAt ??
                                                            entry?.timestamp ??
                                                            entry?.createdAt;
                                                        const changedBy =
                                                            entry?.changedBy ??
                                                            entry?.updatedBy ??
                                                            entry?.user ??
                                                            entry?.userName ??
                                                            "-";
                                                        const action =
                                                            entry?.action ??
                                                            entry?.changeType ??
                                                            entry?.event ??
                                                            "Updated";
                                                        const details =
                                                            entry?.description ??
                                                            entry?.changeReason ??
                                                            entry?.comments ??
                                                            (entry?.fieldName
                                                                ? `${entry.fieldName}: ${entry.oldValue ?? "-"} -> ${entry.newValue ?? "-"}`
                                                                : "Structure updated");
                                                        return (
                                                            <ListItem
                                                                key={`${eventDate}-${index}`}
                                                                divider={index !== changeLogEntries.length - 1}
                                                            >
                                                                <ListItemText
                                                                    primary={`${action} by ${changedBy}`}
                                                                    secondary={`${formatDate(eventDate)} - ${details}`}
                                                                />
                                                            </ListItem>
                                                        );
                                                    })}
                                                </List>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {selectedTab === 1 && (
                                <BomRouting
                                    operations={operations}
                                    setOperations={setOperations}
                                    fetchProductionJob={fetchProductionJob}
                                    jobs={jobs}
                                    error={error}
                                    setError={setError}
                                    loading={loading}
                                    setLoading={setLoading}
                                    fetchWorkCenter={fetchWorkCenter}
                                    workCenters={workCenters}
                                    fetchLaborRoles={fetchLaborRoles}
                                    laborRoles={laborRoles}
                                    fetchMachines={fetchMachines}
                                    machines={machinesList}
                                    keepMounted
                                />
                            )}

                            {selectedTab === 2 && bomId && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                        color="#0f2744"
                                        sx={{
                                            fontSize: "0.8125rem",
                                            textTransform: "uppercase",
                                            letterSpacing: 0.8,
                                            mb: 1.5,
                                        }}
                                    >
                                        Attachments
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
                                        <Button
                                            component="label"
                                            variant="outlined"
                                            size="small"
                                            sx={{ textTransform: "none", borderColor: BORDER_COLOR, color: "#374151" }}
                                        >
                                            Choose File
                                            <input
                                                type="file"
                                                hidden
                                                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                                            />
                                        </Button>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
                                            {selectedFile ? selectedFile.name : "No file selected"}
                                        </Typography>
                                        <Button
                                            onClick={handleFileUpload}
                                            variant="contained"
                                            size="small"
                                            disabled={!selectedFile || uploading}
                                            sx={{ textTransform: "none", bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" } }}
                                        >
                                            {uploading ? "Uploading..." : "Upload"}
                                        </Button>
                                    </Box>

                                    {bomAttachments?.length === 0 && (
                                        <Box
                                            sx={{
                                                py: 4,
                                                textAlign: "center",
                                                background: "#fafbfc",
                                                borderRadius: 1.5,
                                                border: `1px dashed ${BORDER_COLOR}`,
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                No attachments uploaded
                                            </Typography>
                                        </Box>
                                    )}

                                    <List dense>
                                        {bomAttachments?.map((file) => (
                                            <ListItem
                                                key={file.id}
                                                sx={{
                                                    borderRadius: 1,
                                                    border: `1px solid ${BORDER_COLOR}`,
                                                    mb: 0.75,
                                                    bgcolor: "#fafbfc",
                                                    "&:hover": { bgcolor: "#f0f4f8" },
                                                }}
                                                secondaryAction={
                                                    <DeleteOutline
                                                        onClick={() => handleFileDelete(file.id)}
                                                        sx={{ cursor: "pointer", color: "#d32f2f", fontSize: 20 }}
                                                    />
                                                }
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={500}
                                                            sx={{ color: "#1565c0", cursor: "pointer" }}
                                                        >
                                                            {file.fileName?.replace(/^\d+_/, "")}
                                                        </Typography>
                                                    }
                                                    secondary={`Uploaded on ${new Date(file.uploadedAt).toLocaleDateString("en-GB")}`}
                                                    onClick={() => downloadAttachment(file.id, file.fileName)}
                                                    sx={{ cursor: "pointer" }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}

                            {selectedTab === 3 && bomId && (
                                <Box sx={{ mt: 1 }}>
                                    <BomCostBreakdown data={costBreakdown} loading={costBreakdownLoading} />
                                </Box>
                            )}
                        </form>

                        <Snackbar
                            open={snackbar.open}
                            autoHideDuration={3000}
                            onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))}
                            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        >
                            <Alert
                                onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))}
                                severity={snackbar.severity}
                                variant="filled"
                                sx={{ borderRadius: 1.5 }}
                            >
                                {snackbar.message}
                            </Alert>
                        </Snackbar>
                    </Box>
                </Grid>

            </Grid>

            <Dialog
                open={duplicateDialogOpen}
                onClose={() => setDuplicateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: "#0f2744" }}>Duplicate BOM</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        This will create a new BOM as draft using the current BOM structure. Are you sure you
                        want to continue?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDuplicateDialogOpen(false)}
                        disabled={duplicating}
                        sx={{ textTransform: "none", color: "#374151" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={duplicating}
                        onClick={handleConfirmDuplicate}
                        sx={{ textTransform: "none", bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" } }}
                    >
                        {duplicating ? "Duplicating..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={saveConfirmOpen}
                onClose={() => setSaveConfirmOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: "#0f2744" }}>
                    {bomId ? "Confirm BOM Update" : "Confirm BOM Create"}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {isCriticalStatus
                            ? "This BOM is in Approved/Active state. For Update create new DRAFT Revision?"
                            : "Do you want to save these BOM changes?"}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setSaveConfirmOpen(false)}
                        sx={{ textTransform: "none", color: "#374151" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={()=>isCriticalStatus? handleConfirmDuplicate(bomId): confirmSave()}
                        sx={{ textTransform: "none", bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" } }}
                    >
                       {isCriticalStatus
                            ? "Create Revision"
                            : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default AddBom;
