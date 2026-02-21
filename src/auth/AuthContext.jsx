import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMe, login as loginRequest, logout as logoutRequest } from "../services/authService";
import {
    clearAuthSession,
    loadAuthSession,
    normalizeAuthSession,
    saveAuthSession,
    saveTokenPayload,
} from "../services/authStorage";
import { setSessionRefreshedHandler, setUnauthorizedHandler } from "../services/apiService";
import {
    canAction as canActionUtil,
    canManageAdminRoles as canManageAdminRolesUtil,
    canModule as canModuleUtil,
    canPerformAction as canPerformActionUtil,
    hasAnyRole as hasAnyRoleUtil,
    hasRole as hasRoleUtil,
    isAdmin as isAdminUtil,
    isSuperAdmin as isSuperAdminUtil,
} from "./roles";

const AuthContext = createContext(null);

const normalizeRoles = (payload, fallbackRoles = []) => {
    if (Array.isArray(payload?.roles)) {
        return payload.roles;
    }
    if (Array.isArray(payload?.authorities)) {
        return payload.authorities;
    }
    return fallbackRoles;
};

const normalizeUser = (payload, fallback = {}) => ({
    username: payload?.username || payload?.userName || fallback?.username || "",
    roles: normalizeRoles(payload, fallback?.roles || []),
});

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [accessToken, setAccessToken] = useState("");
    const [refreshToken, setRefreshToken] = useState("");
    const [user, setUser] = useState(null);
    const [accessTokenExpiresIn, setAccessTokenExpiresIn] = useState(null);
    const [refreshTokenExpiresIn, setRefreshTokenExpiresIn] = useState(null);
    const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState(null);
    const [refreshTokenExpiresAt, setRefreshTokenExpiresAt] = useState(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const applySession = useCallback((session, persist = true) => {
        const normalizedSession = normalizeAuthSession(session);
        setAccessToken(normalizedSession?.accessToken || "");
        setRefreshToken(normalizedSession?.refreshToken || "");
        setUser(normalizedSession?.user || null);
        setAccessTokenExpiresIn(normalizedSession?.accessTokenExpiresIn ?? null);
        setRefreshTokenExpiresIn(normalizedSession?.refreshTokenExpiresIn ?? null);
        setAccessTokenExpiresAt(normalizedSession?.accessTokenExpiresAt ?? null);
        setRefreshTokenExpiresAt(normalizedSession?.refreshTokenExpiresAt ?? null);
        if (persist && normalizedSession?.accessToken) {
            saveAuthSession(normalizedSession);
        }
    }, []);

    const clearSession = useCallback((redirectToLogin = true, message = "") => {
        clearAuthSession();
        setAccessToken("");
        setRefreshToken("");
        setUser(null);
        setAccessTokenExpiresIn(null);
        setRefreshTokenExpiresIn(null);
        setAccessTokenExpiresAt(null);
        setRefreshTokenExpiresAt(null);
        if (redirectToLogin && location.pathname !== "/login") {
            navigate("/login", {
                replace: true,
                state: message
                    ? {
                        sessionExpired: true,
                        message,
                    }
                    : undefined,
            });
        }
    }, [location.pathname, navigate]);

    const refreshCurrentUser = useCallback(async (fallbackSession) => {
        const safeFallbackSession = normalizeAuthSession(fallbackSession || loadAuthSession() || {});
        const me = await getMe();
        const currentUser = normalizeUser(me, safeFallbackSession?.user);
        const nextSession = {
            ...safeFallbackSession,
            user: currentUser,
            roles: currentUser.roles,
        };
        applySession(nextSession);
        return nextSession;
    }, [applySession]);

    const login = useCallback(async ({ username, password }) => {
        setIsLoggingIn(true);
        try {
            const response = await loginRequest({ username, password });
            if (!response?.accessToken || !response?.refreshToken) {
                throw new Error("Login response did not include both access and refresh tokens");
            }
            const baseUser = normalizeUser(response, { username });
            const baseSession = saveTokenPayload(
                {
                    ...response,
                    username: baseUser.username,
                    roles: baseUser.roles,
                },
                {
                    user: baseUser,
                    roles: baseUser.roles,
                }
            );
            if (!baseSession) {
                throw new Error("Unable to initialize auth session");
            }

            applySession(baseSession, false);

            try {
                await refreshCurrentUser(baseSession);
            } catch (error) {
                const status = error?.response?.status;
                if (status !== 401 && status !== 403) {
                    console.error("Unable to enrich user profile from /auth/me", error);
                }
            }

            return baseSession;
        } finally {
            setIsLoggingIn(false);
        }
    }, [applySession, refreshCurrentUser]);

    const logout = useCallback(async () => {
        const tokenToRevoke = refreshToken || loadAuthSession()?.refreshToken || "";
        try {
            if (tokenToRevoke) {
                await logoutRequest(tokenToRevoke);
            }
        } catch (error) {
            console.error("Unable to revoke refresh token during logout", error);
        } finally {
            clearSession(true);
        }
    }, [clearSession, refreshToken]);

    const hasRole = useCallback(
        (role) => {
            return hasRoleUtil(user?.roles || [], role);
        },
        [user?.roles]
    );

    const hasAnyRole = useCallback(
        (requiredRoles = []) => hasAnyRoleUtil(user?.roles || [], requiredRoles),
        [user?.roles]
    );

    const canModule = useCallback(
        (moduleKey) => canModuleUtil(user?.roles || [], moduleKey),
        [user?.roles]
    );

    const canAction = useCallback(
        (actionKey) => canActionUtil(user?.roles || [], actionKey),
        [user?.roles]
    );

    const isAdmin = useCallback(
        () => isAdminUtil(user?.roles || []),
        [user?.roles]
    );

    const isSuperAdmin = useCallback(
        () => isSuperAdminUtil(user?.roles || []),
        [user?.roles]
    );

    const canManageAdminRoles = useCallback(
        () => canManageAdminRolesUtil(user?.roles || []),
        [user?.roles]
    );

    const canPerformAction = useCallback(
        (actionKey) => canPerformActionUtil(user?.roles || [], actionKey),
        [user?.roles]
    );

    useEffect(() => {
        const session = loadAuthSession();
        if (!session?.accessToken && !session?.token) {
            setIsBootstrapping(false);
            return;
        }

        const normalizedSession = normalizeAuthSession(session);
        applySession(normalizedSession, false);

        refreshCurrentUser(normalizedSession)
            .catch((error) => {
                const status = error?.response?.status;
                if (status === 401 || status === 403) {
                    clearSession(false);
                } else {
                    console.error("Unable to refresh auth user from /auth/me", error);
                }
            })
            .finally(() => {
                setIsBootstrapping(false);
            });
    }, [applySession, clearSession, refreshCurrentUser]);

    useEffect(() => {
        const onUnauthorized = (message) => {
            clearSession(true, message || "Session expired. Please sign in again.");
        };

        setUnauthorizedHandler(onUnauthorized);
        return () => setUnauthorizedHandler(null);
    }, [clearSession]);

    useEffect(() => {
        const onSessionRefreshed = (session) => {
            applySession(session, false);
        };
        setSessionRefreshedHandler(onSessionRefreshed);
        return () => setSessionRefreshedHandler(null);
    }, [applySession]);

    const value = useMemo(
        () => ({
            token: accessToken,
            accessToken,
            refreshToken,
            user,
            roles: user?.roles || [],
            expiresIn: accessTokenExpiresIn,
            expiresAt: accessTokenExpiresAt,
            accessTokenExpiresIn,
            refreshTokenExpiresIn,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            isAuthenticated: Boolean(accessToken),
            isBootstrapping,
            isLoggingIn,
            login,
            logout,
            hasRole,
            hasAnyRole,
            canModule,
            canAction,
            canPerformAction,
            isAdmin,
            isSuperAdmin,
            canManageAdminRoles,
            refreshCurrentUser,
        }),
        [
            accessToken,
            refreshToken,
            user,
            accessTokenExpiresIn,
            refreshTokenExpiresIn,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            isBootstrapping,
            isLoggingIn,
            login,
            logout,
            hasRole,
            hasAnyRole,
            canModule,
            canAction,
            canPerformAction,
            isAdmin,
            isSuperAdmin,
            canManageAdminRoles,
            refreshCurrentUser,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
};
