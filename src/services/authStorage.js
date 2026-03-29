const AUTH_STORAGE_KEY = "ngm.auth.session";

const parseTtlSeconds = (value) => {
    const ttl = Number(value);
    if (!Number.isFinite(ttl) || ttl <= 0) {
        return null;
    }
    return Math.floor(ttl);
};

const resolveExpiry = (expiresAtCandidate, expiresInCandidate) => {
    const expiresAt = Number(expiresAtCandidate);
    if (Number.isFinite(expiresAt) && expiresAt > 0) {
        return expiresAt;
    }
    const ttl = parseTtlSeconds(expiresInCandidate);
    if (ttl === null) {
        return null;
    }
    return Date.now() + ttl * 1000;
};

export const normalizeAuthSession = (session, fallback = null) => {
    if (!session || typeof session !== "object") {
        return null;
    }

    const accessToken =
        session.accessToken ||
        session.token ||
        fallback?.accessToken ||
        fallback?.token ||
        "";
    const refreshToken = session.refreshToken || fallback?.refreshToken || "";
    const tokenType = session.tokenType || fallback?.tokenType || "Bearer";

    const accessTokenExpiresIn = parseTtlSeconds(
        session.accessTokenExpiresIn ?? session.expiresIn ?? fallback?.accessTokenExpiresIn ?? fallback?.expiresIn
    );
    const refreshTokenExpiresIn = parseTtlSeconds(
        session.refreshTokenExpiresIn ?? fallback?.refreshTokenExpiresIn
    );

    const accessTokenExpiresAt = resolveExpiry(
        session.accessTokenExpiresAt ?? session.expiresAt ?? fallback?.accessTokenExpiresAt ?? fallback?.expiresAt,
        accessTokenExpiresIn
    );
    const refreshTokenExpiresAt = resolveExpiry(
        session.refreshTokenExpiresAt ?? fallback?.refreshTokenExpiresAt,
        refreshTokenExpiresIn
    );

    const roles = Array.isArray(session.roles)
        ? session.roles
        : Array.isArray(session.user?.roles)
            ? session.user.roles
            : Array.isArray(fallback?.roles)
                ? fallback.roles
                : Array.isArray(fallback?.user?.roles)
                    ? fallback.user.roles
                    : [];
    const username =
        session.user?.username ||
        session.username ||
        fallback?.user?.username ||
        fallback?.username ||
        "";
    const user = session.user && typeof session.user === "object"
        ? {
            ...session.user,
            username,
            roles,
        }
        : {
            username,
            roles,
        };

    return {
        accessToken,
        refreshToken,
        tokenType,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        user,
        roles,
        username,
        // Backward compatible aliases
        token: accessToken,
        expiresIn: accessTokenExpiresIn,
        expiresAt: accessTokenExpiresAt,
    };
};

const parseSession = (raw) => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw);
        return normalizeAuthSession(parsed);
    } catch (error) {
        return null;
    }
};

export const loadAuthSession = () => {
    if (typeof window === "undefined") {
        return null;
    }
    return parseSession(window.localStorage.getItem(AUTH_STORAGE_KEY));
};

export const saveAuthSession = (session) => {
    if (typeof window === "undefined") {
        return;
    }
    const normalized = normalizeAuthSession(session);
    if (!normalized) {
        return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
};

export const clearAuthSession = () => {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getAccessToken = () => {
    const session = loadAuthSession();
    return session?.accessToken || session?.token || "";
};

export const getRefreshToken = () => {
    const session = loadAuthSession();
    return session?.refreshToken || "";
};

export const saveTokenPayload = (payload, fallbackSession = null) => {
    const baseSession = fallbackSession || loadAuthSession() || {};
    const nextSession = normalizeAuthSession(
        {
            ...baseSession,
            accessToken: payload?.accessToken,
            refreshToken: payload?.refreshToken,
            tokenType: payload?.tokenType || baseSession?.tokenType,
            accessTokenExpiresIn: payload?.accessTokenExpiresIn,
            refreshTokenExpiresIn: payload?.refreshTokenExpiresIn,
            accessTokenExpiresAt: null,
            refreshTokenExpiresAt: null,
            user: {
                ...(baseSession?.user || {}),
                username: payload?.username || baseSession?.user?.username || baseSession?.username || "",
                roles: Array.isArray(payload?.roles)
                    ? payload.roles
                    : baseSession?.user?.roles || baseSession?.roles || [],
            },
            roles: Array.isArray(payload?.roles)
                ? payload.roles
                : baseSession?.roles || baseSession?.user?.roles || [],
        },
        baseSession
    );
    if (!nextSession) {
        return null;
    }
    saveAuthSession(nextSession);
    return nextSession;
};
