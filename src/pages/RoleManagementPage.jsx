import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { listRoles, listUsers } from "../services/authService";
import { resolveApiErrorMessage } from "../services/apiService";
import { ROLE_ADMIN, ROLE_SUPER_ADMIN, ROLE_USER } from "../auth/roles";

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
        role.roleDescription ||
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
            role.isSystemRole ??
                role.isSystem ??
                role.system ??
                role.systemRole ??
                role.protected ??
                role.builtIn
        ) || isSystemName(name);
    return {
        id,
        name,
        displayName: role.displayName || "",
        moduleName: role.moduleName || "",
        description,
        isSystem,
        assignedCount:
            assignedCount !== null && Number.isFinite(assignedCountNumber) ? assignedCountNumber : null,
    };
};

// The roles API carries no user count, so it is counted from the user list.
const countUsersByRole = (users) => {
    const counts = {};
    (Array.isArray(users) ? users : []).forEach((user) => {
        (Array.isArray(user?.roles) ? user.roles : []).forEach((roleName) => {
            counts[roleName] = (counts[roleName] || 0) + 1;
        });
    });
    return counts;
};

const mapRoleError = (error, fallback) =>
    resolveApiErrorMessage(error, fallback || "Unable to load roles.");

export default function RoleManagementPage() {
    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [rolesError, setRolesError] = useState("");

    const fetchRoles = useCallback(async () => {
        setLoadingRoles(true);
        setRolesError("");
        try {
            const [response, users] = await Promise.all([
                listRoles(),
                listUsers().catch(() => null),
            ]);
            const userCounts = users ? countUsersByRole(users) : null;
            const normalized = (Array.isArray(response) ? response : [])
                .map(normalizeRole)
                .filter(Boolean)
                .map((role) =>
                    role.assignedCount === null && userCounts
                        ? { ...role, assignedCount: userCounts[role.name] || 0 }
                        : role
                );
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
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchRoles}
                    disabled={loadingRoles}
                >
                    Refresh
                </Button>
            </Stack>

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
                                        <TableCell>Module</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell>System</TableCell>
                                        <TableCell>Assigned Users</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedRoles.map((role) => {
                                        const isSystemRole = role.isSystem;
                                        return (
                                            <TableRow key={role.id || role.name}>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {role.displayName || role.name || "-"}
                                                        </Typography>
                                                        {isSystemRole ? <Chip size="small" label="System" /> : null}
                                                    </Stack>
                                                    {role.displayName ? (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {role.name}
                                                        </Typography>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>{role.moduleName || "-"}</TableCell>
                                                <TableCell>{role.description || "-"}</TableCell>
                                                <TableCell>{isSystemRole ? "Yes" : "No"}</TableCell>
                                                <TableCell>
                                                    {typeof role.assignedCount === "number"
                                                        ? role.assignedCount
                                                        : "-"}
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
        </Box>
    );
}
