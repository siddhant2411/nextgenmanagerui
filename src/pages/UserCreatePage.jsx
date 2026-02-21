import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select,
    Stack,
    Switch,
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
import LockResetIcon from "@mui/icons-material/LockReset";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
    createUser,
    deleteUser,
    listRoles,
    listUsers,
    resetUserPassword,
    updateUserRoles,
    updateUserStatus,
} from "../services/authService";
import { useAuth } from "../auth/AuthContext";
import { CREATE_USER_ROLE_OPTIONS, ROLE_ADMIN, ROLE_SUPER_ADMIN } from "../auth/roles";
import { resolveApiErrorMessage } from "../services/apiService";

const EMPTY_FORM = {
    username: "",
    password: "",
    email: "",
    roleNames: [],
};

const formatDateTime = (value) => {
    if (!value) {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString();
};

const validateForm = (form) => {
    const errors = {};
    if (!form.username.trim()) {
        errors.username = "Username is required.";
    }
    if (!form.password) {
        errors.password = "Password is required.";
    }
    if (!Array.isArray(form.roleNames) || form.roleNames.length === 0) {
        errors.roleNames = "Select at least one role.";
    }
    return errors;
};

const mapCreateUserError = (error) => {
    const status = error?.response?.status;
    const message = resolveApiErrorMessage(error, "");

    if (status === 409) {
        return "Username or email already exists.";
    }
    if (status === 403) {
        return "You are not allowed to create users.";
    }
    if (status === 401) {
        return "Session expired or invalid token. Please log in again.";
    }
    if (status === 400) {
        if (typeof message === "string" && message.trim()) {
            return message;
        }
        return "Invalid user data or role selection.";
    }
    if (typeof message === "string" && message.trim()) {
        return message;
    }
    return "Unable to create user right now. Please try again.";
};

const mapListUsersError = (error) => {
    const status = error?.response?.status;
    if (status === 403) {
        return "You are not allowed to view user management.";
    }
    if (status === 401) {
        return "Session expired or invalid token. Please log in again.";
    }
    return resolveApiErrorMessage(error, "Failed to load users. Please retry.");
};

const mapUserActionError = (error, fallback) => {
    return resolveApiErrorMessage(error, fallback || "Unable to update user right now.");
};

const normalizeRoleName = (role) => {
    if (!role) {
        return "";
    }
    if (typeof role === "string") {
        return role;
    }
    return role.name || role.roleName || role.code || role.authority || "";
};

export default function UserCreatePage() {
    const { canManageAdminRoles: canManageAdminRolesFn } = useAuth();
    const canManageAdminRoles = canManageAdminRolesFn();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [rolesCatalog, setRolesCatalog] = useState([]);
    const [rolesError, setRolesError] = useState("");

    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const [resetPasswordNotice, setResetPasswordNotice] = useState("");
    const [pendingAction, setPendingAction] = useState({ type: "", userId: null });

    const [roleDialog, setRoleDialog] = useState({ open: false, user: null, roles: [] });
    const [roleDialogError, setRoleDialogError] = useState("");
    const [roleDialogSubmitting, setRoleDialogSubmitting] = useState(false);

    const [resetDialog, setResetDialog] = useState({ open: false, user: null });
    const [resetDialogError, setResetDialogError] = useState("");
    const [resetDialogSubmitting, setResetDialogSubmitting] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
    const [deleteDialogError, setDeleteDialogError] = useState("");
    const [deleteDialogSubmitting, setDeleteDialogSubmitting] = useState(false);

    const selectedRoles = useMemo(() => form.roleNames || [], [form.roleNames]);

    const availableRoleOptions = useMemo(() => {
        const baseRoles = rolesCatalog.length > 0 ? rolesCatalog : CREATE_USER_ROLE_OPTIONS;
        const uniqueRoles = Array.from(new Set(baseRoles.map(normalizeRoleName).filter(Boolean)));
        return uniqueRoles.filter((role) => {
            if (role === ROLE_SUPER_ADMIN) {
                return false;
            }
            if (!canManageAdminRoles && role === ROLE_ADMIN) {
                return false;
            }
            return true;
        });
    }, [rolesCatalog, canManageAdminRoles]);

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        setUsersError("");
        try {
            const response = await listUsers();
            setUsers(Array.isArray(response) ? response : []);
        } catch (error) {
            setUsersError(mapListUsersError(error));
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        setRolesError("");
        try {
            const response = await listRoles();
            const roleNames = (Array.isArray(response) ? response : [])
                .map(normalizeRoleName)
                .filter(Boolean);
            setRolesCatalog(Array.from(new Set(roleNames)));
        } catch (error) {
            setRolesCatalog([]);
            setRolesError(resolveApiErrorMessage(error, "Failed to load roles list."));
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [fetchUsers, fetchRoles]);

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleRolesChange = (event) => {
        const value = event.target.value;
        const roles = Array.isArray(value) ? value : String(value).split(",");
        const safeRoles = roles.filter((role) => {
            if (role === ROLE_SUPER_ADMIN) {
                return false;
            }
            if (!canManageAdminRoles && role === ROLE_ADMIN) {
                return false;
            }
            return true;
        });
        setForm((prev) => ({ ...prev, roleNames: [...new Set(safeRoles)] }));
        setFormErrors((prev) => {
            if (!prev.roleNames) {
                return prev;
            }
            const next = { ...prev };
            delete next.roleNames;
            return next;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError("");
        setSuccessMessage("");

        const errors = validateForm(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        const payload = {
            username: form.username.trim(),
            password: form.password,
            email: form.email.trim() ? form.email.trim() : null,
            roleNames: form.roleNames.filter((role) => {
                if (role === ROLE_SUPER_ADMIN) {
                    return false;
                }
                if (!canManageAdminRoles && role === ROLE_ADMIN) {
                    return false;
                }
                return true;
            }),
        };

        setSubmitting(true);
        try {
            await createUser(payload);
            setSuccessMessage(`User "${payload.username}" created successfully.`);
            setForm(EMPTY_FORM);
            setIsCreateOpen(false);
            await fetchUsers();
        } catch (error) {
            setSubmitError(mapCreateUserError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const updateUserInState = useCallback((userId, updates) => {
        setUsers((prev) =>
            prev.map((user) => (user.id === userId ? { ...user, ...updates } : user))
        );
    }, []);

    const startUserAction = (type, userId) => {
        setPendingAction({ type, userId });
        setActionError("");
        setActionSuccess("");
        setResetPasswordNotice("");
    };

    const clearUserAction = () => {
        setPendingAction({ type: "", userId: null });
    };

    const handleStatusToggle = async (user, field) => {
        if (user?.id === null || user?.id === undefined) {
            return;
        }
        const nextStatus = {
            isActive: Boolean(user.isActive),
            isLocked: Boolean(user.isLocked),
            [field]: !Boolean(user[field]),
        };
        startUserAction("status", user.id);
        try {
            await updateUserStatus(user.id, nextStatus);
            updateUserInState(user.id, nextStatus);
            setActionSuccess(`Updated status for ${user.username || "user"}.`);
        } catch (error) {
            setActionError(mapUserActionError(error, "Unable to update user status."));
        } finally {
            clearUserAction();
        }
    };

    const handleOpenRoleDialog = (user) => {
        if (!user) {
            return;
        }
        setRoleDialog({
            open: true,
            user,
            roles: Array.isArray(user.roles) ? [...user.roles] : [],
        });
        setRoleDialogError("");
    };

    const handleRoleDialogClose = () => {
        setRoleDialog({ open: false, user: null, roles: [] });
        setRoleDialogError("");
        setRoleDialogSubmitting(false);
    };

    const roleDialogOptions = useMemo(() => {
        const existing = Array.isArray(roleDialog.roles) ? roleDialog.roles : [];
        const combined = new Set([...availableRoleOptions, ...existing]);
        return Array.from(combined).filter((role) => {
            if (role === ROLE_SUPER_ADMIN) {
                return false;
            }
            if (!canManageAdminRoles && role === ROLE_ADMIN) {
                return false;
            }
            return true;
        });
    }, [availableRoleOptions, roleDialog.roles, canManageAdminRoles]);

    const handleRoleSelectionChange = (event) => {
        const value = event.target.value;
        const roles = Array.isArray(value) ? value : String(value).split(",");
        const safeRoles = roles.filter((role) => {
            if (role === ROLE_SUPER_ADMIN) {
                return false;
            }
            if (!canManageAdminRoles && role === ROLE_ADMIN) {
                return false;
            }
            return true;
        });
        setRoleDialogError("");
        setRoleDialog((prev) => ({
            ...prev,
            roles: [...new Set(safeRoles)],
        }));
    };

    const handleRoleDialogSubmit = async () => {
        if (roleDialog.user?.id === null || roleDialog.user?.id === undefined) {
            return;
        }
        const nextRoles = (roleDialog.roles || []).filter((role) => {
            if (role === ROLE_SUPER_ADMIN) {
                return false;
            }
            if (!canManageAdminRoles && role === ROLE_ADMIN) {
                return false;
            }
            return true;
        });
        if (nextRoles.length === 0) {
            setRoleDialogError("Select at least one role.");
            return;
        }
        setRoleDialogSubmitting(true);
        setRoleDialogError("");
        try {
            await updateUserRoles(roleDialog.user.id, { roleNames: nextRoles });
            updateUserInState(roleDialog.user.id, { roles: nextRoles });
            setActionSuccess(`Roles updated for ${roleDialog.user.username || "user"}.`);
            handleRoleDialogClose();
        } catch (error) {
            setRoleDialogError(mapUserActionError(error, "Unable to update user roles."));
        } finally {
            setRoleDialogSubmitting(false);
        }
    };

    const handleOpenResetDialog = (user) => {
        if (!user) {
            return;
        }
        setResetPasswordNotice("");
        setResetDialog({ open: true, user });
        setResetDialogError("");
    };

    const handleResetDialogClose = () => {
        setResetDialog({ open: false, user: null });
        setResetDialogError("");
        setResetDialogSubmitting(false);
    };

    const handleResetPasswordConfirm = async () => {
        if (resetDialog.user?.id === null || resetDialog.user?.id === undefined) {
            return;
        }
        setResetDialogSubmitting(true);
        setResetDialogError("");
        try {
            const response = await resetUserPassword(resetDialog.user.id);
            const tempPassword =
                response?.temporaryPassword ||
                response?.tempPassword ||
                response?.password ||
                "";
            if (tempPassword) {
                setResetPasswordNotice(
                    `Temporary password for ${resetDialog.user.username || "user"}: ${tempPassword}`
                );
            } else {
                setResetPasswordNotice(
                    `Temporary password reset for ${resetDialog.user.username || "user"}.`
                );
            }
            setActionSuccess(`Password reset for ${resetDialog.user.username || "user"}.`);
            handleResetDialogClose();
        } catch (error) {
            setResetDialogError(mapUserActionError(error, "Unable to reset password."));
        } finally {
            setResetDialogSubmitting(false);
        }
    };

    const handleOpenDeleteDialog = (user) => {
        if (!user) {
            return;
        }
        setDeleteDialog({ open: true, user });
        setDeleteDialogError("");
    };

    const handleDeleteDialogClose = () => {
        setDeleteDialog({ open: false, user: null });
        setDeleteDialogError("");
        setDeleteDialogSubmitting(false);
    };

    const handleDeleteConfirm = async () => {
        if (deleteDialog.user?.id === null || deleteDialog.user?.id === undefined) {
            return;
        }
        setDeleteDialogSubmitting(true);
        setDeleteDialogError("");
        try {
            await deleteUser(deleteDialog.user.id);
            setUsers((prev) => prev.filter((user) => user.id !== deleteDialog.user.id));
            setActionSuccess(`Deleted user ${deleteDialog.user.username || ""}.`);
            handleDeleteDialogClose();
        } catch (error) {
            setDeleteDialogError(mapUserActionError(error, "Unable to delete user."));
        } finally {
            setDeleteDialogSubmitting(false);
        }
    };

    const hasUsers = users.length > 0;

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
                    User Management
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                            fetchUsers();
                            fetchRoles();
                        }}
                        disabled={loadingUsers}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant={isCreateOpen ? "outlined" : "contained"}
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setIsCreateOpen((prev) => !prev);
                            setSubmitError("");
                            setSuccessMessage("");
                        }}
                    >
                        {isCreateOpen ? "Close Form" : "Create User"}
                    </Button>
                </Stack>
            </Stack>

            {successMessage ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {successMessage}
                </Alert>
            ) : null}
            {actionSuccess ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {actionSuccess}
                </Alert>
            ) : null}
            {resetPasswordNotice ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {resetPasswordNotice}
                </Alert>
            ) : null}
            {actionError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {actionError}
                </Alert>
            ) : null}

            <Collapse in={isCreateOpen} timeout="auto" unmountOnExit>
                <Card sx={{ borderRadius: 3, mb: 2, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            Create User
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Username, password, and at least one role are required.
                        </Typography>

                        {rolesError ? (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                {rolesError}
                            </Alert>
                        ) : null}

                        {!canManageAdminRoles ? (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Admin role assignment is restricted to super admins. Super admin roles cannot be assigned here.
                            </Alert>
                        ) : null}

                        {submitError ? (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {submitError}
                            </Alert>
                        ) : null}

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2.2}>
                                <TextField
                                    label="Username"
                                    value={form.username}
                                    onChange={handleChange("username")}
                                    error={Boolean(formErrors.username)}
                                    helperText={formErrors.username}
                                    size="small"
                                    required
                                />

                                <TextField
                                    label="Password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange("password")}
                                    error={Boolean(formErrors.password)}
                                    helperText={formErrors.password}
                                    size="small"
                                    required
                                />

                                <TextField
                                    label="Email (optional)"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange("email")}
                                    size="small"
                                />

                                <FormControl size="small" error={Boolean(formErrors.roleNames)} required>
                                    <InputLabel id="create-user-roles-label">Roles</InputLabel>
                                    <Select
                                        labelId="create-user-roles-label"
                                        multiple
                                        value={selectedRoles}
                                        onChange={handleRolesChange}
                                        input={<OutlinedInput label="Roles" />}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                {selected.map((role) => (
                                                    <Chip key={role} size="small" label={role} />
                                                ))}
                                            </Box>
                                        )}
                                    >
                                    {availableRoleOptions.map((role) => (
                                        <MenuItem key={role} value={role}>
                                            <Checkbox checked={selectedRoles.includes(role)} />
                                            <ListItemText primary={role} />
                                        </MenuItem>
                                    ))}
                                    </Select>
                                    {formErrors.roleNames ? (
                                        <Typography variant="caption" color="error" sx={{ mt: 0.75, ml: 1.75 }}>
                                            {formErrors.roleNames}
                                        </Typography>
                                    ) : null}
                                </FormControl>

                                <Box sx={{ display: "flex", gap: 1.5, pt: 0.5 }}>
                                    <Button type="submit" variant="contained" disabled={submitting}>
                                        {submitting ? "Creating..." : "Create User"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outlined"
                                        disabled={submitting}
                                        onClick={() => {
                                            setForm(EMPTY_FORM);
                                            setFormErrors({});
                                            setSubmitError("");
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

            <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(6, 39, 66, 0.08)" }}>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Users
                    </Typography>

                    {usersError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {usersError}
                        </Alert>
                    ) : null}

                    {loadingUsers ? (
                        <Box sx={{ py: 4, display: "grid", placeItems: "center" }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : null}

                    {!loadingUsers && !usersError && !hasUsers ? (
                        <Alert severity="info">No users found.</Alert>
                    ) : null}

                    {!loadingUsers && !usersError && hasUsers ? (
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Username</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Roles</TableCell>
                                        <TableCell>Active</TableCell>
                                        <TableCell>Locked</TableCell>
                                        <TableCell>Last Login</TableCell>
                                        <TableCell>Created On</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => {
                                        const userId = user.id;
                                        const hasValidId = userId !== null && userId !== undefined;
                                        const roles = Array.isArray(user.roles) ? user.roles : [];
                                        const hasAdminRole = roles.includes(ROLE_ADMIN);
                                        const hasSuperAdminRole = roles.includes(ROLE_SUPER_ADMIN);
                                        const isPending = pendingAction.userId === userId;
                                        const disableActions = !hasValidId || isPending;
                                        const disableRoleEdit =
                                            hasSuperAdminRole || (!canManageAdminRoles && hasAdminRole);
                                        const roleEditTooltip = hasSuperAdminRole
                                            ? "Super admin roles cannot be modified here."
                                            : !canManageAdminRoles && hasAdminRole
                                                ? "Only super admins can modify admin role assignments."
                                                : "Edit roles";

                                        return (
                                            <TableRow key={user.id ?? user.username}>
                                                <TableCell>{user.username || "-"}</TableCell>
                                                <TableCell>{user.email || "-"}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                        {roles.map((role) => (
                                                            <Chip key={`${user.username}-${role}`} size="small" label={role} />
                                                        ))}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Switch
                                                            size="small"
                                                            checked={Boolean(user.isActive)}
                                                            onChange={() => handleStatusToggle(user, "isActive")}
                                                            disabled={disableActions}
                                                        />
                                                        <Typography variant="body2">
                                                            {user.isActive ? "Yes" : "No"}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Switch
                                                            size="small"
                                                            checked={Boolean(user.isLocked)}
                                                            onChange={() => handleStatusToggle(user, "isLocked")}
                                                            disabled={disableActions}
                                                        />
                                                        <Typography variant="body2">
                                                            {user.isLocked ? "Yes" : "No"}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{formatDateTime(user.lastLoginDate)}</TableCell>
                                                <TableCell>{formatDateTime(user.creationDate)}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title={roleEditTooltip}>
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenRoleDialog(user)}
                                                                    disabled={disableActions || disableRoleEdit}
                                                                >
                                                                    <EditOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Reset password">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenResetDialog(user)}
                                                                    disabled={disableActions}
                                                                >
                                                                    <LockResetIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Delete user">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenDeleteDialog(user)}
                                                                    disabled={disableActions}
                                                                >
                                                                    <DeleteOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
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
                open={roleDialog.open}
                onClose={handleRoleDialogClose}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Edit Roles</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {roleDialogError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {roleDialogError}
                        </Alert>
                    ) : null}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Update roles for {roleDialog.user?.username || "user"}.
                    </Typography>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="edit-user-roles-label">Roles</InputLabel>
                        <Select
                            labelId="edit-user-roles-label"
                            multiple
                            value={roleDialog.roles || []}
                            onChange={handleRoleSelectionChange}
                            input={<OutlinedInput label="Roles" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                    {selected.map((role) => (
                                        <Chip key={role} size="small" label={role} />
                                    ))}
                                </Box>
                            )}
                        >
                            {roleDialogOptions.map((role) => (
                                <MenuItem key={role} value={role}>
                                    <Checkbox checked={(roleDialog.roles || []).includes(role)} />
                                    <ListItemText primary={role} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleRoleDialogClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleRoleDialogSubmit}
                        disabled={roleDialogSubmitting}
                    >
                        {roleDialogSubmitting ? "Saving..." : "Save Roles"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={resetDialog.open}
                onClose={handleResetDialogClose}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {resetDialogError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {resetDialogError}
                        </Alert>
                    ) : null}
                    <Typography variant="body2">
                        Reset password for <strong>{resetDialog.user?.username}</strong>? A temporary password will be issued.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleResetDialogClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleResetPasswordConfirm}
                        disabled={resetDialogSubmitting}
                    >
                        {resetDialogSubmitting ? "Resetting..." : "Reset Password"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDialog.open}
                onClose={handleDeleteDialogClose}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {deleteDialogError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {deleteDialogError}
                        </Alert>
                    ) : null}
                    <Typography variant="body2">
                        Are you sure you want to delete user{" "}
                        <strong>{deleteDialog.user?.username}</strong>? This will remove access.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleDeleteDialogClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteConfirm}
                        disabled={deleteDialogSubmitting}
                    >
                        {deleteDialogSubmitting ? "Deleting..." : "Delete User"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
