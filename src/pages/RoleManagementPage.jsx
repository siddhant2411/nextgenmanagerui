import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { createRole, deleteRole, listRoles, updateRole } from "../services/authService";
import { resolveApiErrorMessage } from "../services/apiService";
import { useAuth } from "../auth/AuthContext";
import { ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_USER } from "../auth/roles";

const EMPTY_FORM = {
    name: "",
    description: "",
};

const isSystemName = (name) => [ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_USER].includes(name);

const normalizeRole = (role) => {
    if (!role) {
        return null;
    }
    if (typeof role === "string") {
        return {
            id: role,
            name: role,
            description: "",
            isSystem: isSystemName(role),
            assignedCount: null,
        };
    }
    const name =
        role.name ||
        role.roleName ||
        role.code ||
        role.authority ||
        "";
    const id = role.id ?? role.roleId ?? name;
    const description =
        role.description ||
        role.details ||
        role.summary ||
        "";
    const assignedCount =
        role.assignedCount ??
        role.userCount ??
        role.assignedUsers ??
        role.memberCount ??
        role.membersCount ??
        null;
    const assignedCountNumber = Number(assignedCount);
    const isSystem =
        Boolean(
            role.isSystem ??
                role.system ??
                role.systemRole ??
                role.protected ??
                role.builtIn
        ) || isSystemName(name);
    return {
        id,
        name,
        description,
        isSystem,
        assignedCount: Number.isFinite(assignedCountNumber) ? assignedCountNumber : null,
    };
};

const mapRoleError = (error, fallback) =>
    resolveApiErrorMessage(error, fallback || "Unable to process role request.");

export default function RoleManagementPage() {
    const { isSuperAdmin } = useAuth();
    const isSuperAdminUser = isSuperAdmin();

    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [rolesError, setRolesError] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_FORM);
    const [createErrors, setCreateErrors] = useState({});
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const [editDialog, setEditDialog] = useState({ open: false, role: null });
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [editErrors, setEditErrors] = useState({});
    const [editError, setEditError] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState({ open: false, role: null });
    const [deleteError, setDeleteError] = useState("");
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    const fetchRoles = useCallback(async () => {
        setLoadingRoles(true);
        setRolesError("");
        try {
            const response = await listRoles();
            const normalized = (Array.isArray(response) ? response : [])
                .map(normalizeRole)
                .filter(Boolean);
            setRoles(normalized);
        } catch (error) {
            setRolesError(mapRoleError(error, "Failed to load roles."));
        } finally {
            setLoadingRoles(false);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleCreateChange = (field) => (event) => {
        const value = event.target.value;
        setCreateForm((prev) => ({ ...prev, [field]: value }));
        setCreateErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const validateRoleForm = (form) => {
        const errors = {};
        if (!form.name.trim()) {
            errors.name = "Role name is required.";
        }
        return errors;
    };

    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        setCreateError("");
        setCreateSuccess("");

        const errors = validateRoleForm(createForm);
        setCreateErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setCreateSubmitting(true);
        try {
            await createRole({
                name: createForm.name.trim(),
                description: createForm.description.trim() || null,
            });
            setCreateSuccess(`Role "${createForm.name.trim()}" created successfully.`);
            setCreateForm(EMPTY_FORM);
            setIsCreateOpen(false);
            await fetchRoles();
        } catch (error) {
            setCreateError(mapRoleError(error, "Unable to create role."));
        } finally {
            setCreateSubmitting(false);
        }
    };

    const handleEditOpen = (role) => {
        setEditDialog({ open: true, role });
        setEditForm({
            name: role?.name || "",
            description: role?.description || "",
        });
        setEditErrors({});
        setEditError("");
    };

    const handleEditChange = (field) => (event) => {
        const value = event.target.value;
        setEditForm((prev) => ({ ...prev, [field]: value }));
        setEditErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleEditSubmit = async () => {
        if (!editDialog.role) {
            return;
        }
        if (editDialog.role.id === null || editDialog.role.id === undefined || editDialog.role.id === "") {
            setEditError("Role identifier is missing.");
            return;
        }
        const errors = validateRoleForm(editForm);
        setEditErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setEditSubmitting(true);
        try {
            await updateRole(editDialog.role.id, {
                name: editForm.name.trim(),
                description: editForm.description.trim() || null,
            });
            setEditDialog({ open: false, role: null });
            await fetchRoles();
        } catch (error) {
            setEditError(mapRoleError(error, "Unable to update role."));
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDeleteOpen = (role) => {
        setDeleteDialog({ open: true, role });
        setDeleteError("");
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.role) {
            return;
        }
        if (deleteDialog.role.id === null || deleteDialog.role.id === undefined || deleteDialog.role.id === "") {
            setDeleteError("Role identifier is missing.");
            return;
        }
        setDeleteSubmitting(true);
        try {
            await deleteRole(deleteDialog.role.id);
            setDeleteDialog({ open: false, role: null });
            await fetchRoles();
        } catch (error) {
            setDeleteError(mapRoleError(error, "Unable to delete role."));
        } finally {
            setDeleteSubmitting(false);
        }
    };

    const hasRoles = roles.length > 0;

    const sortedRoles = useMemo(() => {
        return [...roles].sort((a, b) => a.name.localeCompare(b.name));
    }, [roles]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1.5}
                sx={{ mb: 2 }}
            >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Role Management
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchRoles}
                        disabled={loadingRoles}
                    >
                        Refresh
                    </Button>
                    {isSuperAdminUser ? (
                        <Button
                            variant={isCreateOpen ? "outlined" : "contained"}
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setIsCreateOpen((prev) => !prev);
                                setCreateError("");
                                setCreateSuccess("");
                            }}
                        >
                            {isCreateOpen ? "Close Form" : "Create Role"}
                        </Button>
                    ) : null}
                </Stack>
            </Stack>

            {createSuccess ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {createSuccess}
                </Alert>
            ) : null}

            {isSuperAdminUser ? (
                <Collapse in={isCreateOpen} timeout="auto" unmountOnExit>
                    <Card sx={{ borderRadius: 3, mb: 2, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                Create Role
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Define a new role name and optional description.
                            </Typography>

                            {createError ? (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {createError}
                                </Alert>
                            ) : null}

                            <Box component="form" onSubmit={handleCreateSubmit}>
                                <Stack spacing={2.2}>
                                    <TextField
                                        label="Role Name"
                                        value={createForm.name}
                                        onChange={handleCreateChange("name")}
                                        error={Boolean(createErrors.name)}
                                        helperText={createErrors.name}
                                        size="small"
                                        required
                                    />

                                    <TextField
                                        label="Description (optional)"
                                        value={createForm.description}
                                        onChange={handleCreateChange("description")}
                                        size="small"
                                    />

                                    <Box sx={{ display: "flex", gap: 1.5, pt: 0.5 }}>
                                        <Button type="submit" variant="contained" disabled={createSubmitting}>
                                            {createSubmitting ? "Creating..." : "Create Role"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            disabled={createSubmitting}
                                            onClick={() => {
                                                setCreateForm(EMPTY_FORM);
                                                setCreateErrors({});
                                                setCreateError("");
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </Box>
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                </Collapse>
            ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Role creation and updates are restricted to super admins.
                </Alert>
            )}

            <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Roles
                    </Typography>

                    {rolesError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {rolesError}
                        </Alert>
                    ) : null}

                    {loadingRoles ? (
                        <Box sx={{ py: 4, display: "grid", placeItems: "center" }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : null}

                    {!loadingRoles && !rolesError && !hasRoles ? (
                        <Alert severity="info">No roles found.</Alert>
                    ) : null}

                    {!loadingRoles && !rolesError && hasRoles ? (
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Role</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell>System</TableCell>
                                        <TableCell>Assigned Users</TableCell>
                                        {isSuperAdminUser ? <TableCell>Actions</TableCell> : null}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedRoles.map((role) => {
                                        const isSystemRole = role.isSystem;
                                        const hasValidId =
                                            role.id !== null &&
                                            role.id !== undefined &&
                                            role.id !== "";
                                        const hasAssignments =
                                            typeof role.assignedCount === "number" && role.assignedCount > 0;
                                        return (
                                            <TableRow key={role.id || role.name}>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {role.name || "-"}
                                                        </Typography>
                                                        {isSystemRole ? <Chip size="small" label="System" /> : null}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{role.description || "-"}</TableCell>
                                                <TableCell>{isSystemRole ? "Yes" : "No"}</TableCell>
                                                <TableCell>
                                                    {typeof role.assignedCount === "number"
                                                        ? role.assignedCount
                                                        : "-"}
                                                </TableCell>
                                                {isSuperAdminUser ? (
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip
                                                                title={
                                                                    !hasValidId
                                                                        ? "Role identifier is missing."
                                                                        : isSystemRole
                                                                            ? "System roles cannot be modified."
                                                                            : "Edit role"
                                                                }
                                                            >
                                                                <span>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleEditOpen(role)}
                                                                        disabled={!hasValidId || isSystemRole}
                                                                    >
                                                                        <EditOutlinedIcon fontSize="small" />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                            <Tooltip
                                                                title={
                                                                    !hasValidId
                                                                        ? "Role identifier is missing."
                                                                        : isSystemRole
                                                                            ? "System roles cannot be deleted."
                                                                            : hasAssignments
                                                                                ? "Roles with assigned users cannot be deleted."
                                                                                : "Delete role"
                                                                }
                                                            >
                                                                <span>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleDeleteOpen(role)}
                                                                        disabled={!hasValidId || isSystemRole || hasAssignments}
                                                                    >
                                                                        <DeleteOutlineIcon fontSize="small" />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </Stack>
                                                    </TableCell>
                                                ) : null}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : null}
                </CardContent>
            </Card>

            <Dialog
                open={editDialog.open}
                onClose={() => {
                    setEditDialog({ open: false, role: null });
                    setEditError("");
                    setEditErrors({});
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Edit Role</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {editError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {editError}
                        </Alert>
                    ) : null}
                    <Stack spacing={2}>
                        <TextField
                            label="Role Name"
                            value={editForm.name}
                            onChange={handleEditChange("name")}
                            error={Boolean(editErrors.name)}
                            helperText={editErrors.name}
                            size="small"
                            required
                        />
                        <TextField
                            label="Description (optional)"
                            value={editForm.description}
                            onChange={handleEditChange("description")}
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setEditDialog({ open: false, role: null });
                            setEditError("");
                            setEditErrors({});
                        }}
                    >
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleEditSubmit} disabled={editSubmitting}>
                        {editSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDialog.open}
                onClose={() => {
                    setDeleteDialog({ open: false, role: null });
                    setDeleteError("");
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Delete Role</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {deleteError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {deleteError}
                        </Alert>
                    ) : null}
                    <Typography variant="body2">
                        Are you sure you want to delete role{" "}
                        <strong>{deleteDialog.role?.name}</strong>? This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => {
                            setDeleteDialog({ open: false, role: null });
                            setDeleteError("");
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteConfirm}
                        disabled={deleteSubmitting}
                    >
                        {deleteSubmitting ? "Deleting..." : "Delete Role"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
