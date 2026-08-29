import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFeatures } from "../services/featureService";
import { useAuth } from "../auth/AuthContext";

/**
 * Optional features this server was configured with.
 *
 * Kept separate from AuthContext on purpose: that answers "who is this user and what may they
 * do", this answers "what does this installation have at all". A screen can need both — the AI
 * Lead Review desk is a sales screen (role) that only exists where an agent is configured
 * (deployment) — and collapsing the two would mean granting a role to make a missing service
 * appear.
 */

export const FEATURES = {
    AI_LEAD_AGENT: "aiLeadAgent",
};

const ServerFeaturesContext = createContext(null);

export function ServerFeaturesProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [features, setFeatures] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            // Nothing to know while signed out, and the endpoint is authenticated anyway. Clearing
            // also stops one user's deployment view leaking into the next sign-in on this tab.
            setFeatures({});
            return undefined;
        }

        let cancelled = false;
        setIsLoading(true);
        getFeatures()
            .then((response) => {
                if (!cancelled) {
                    setFeatures(response || {});
                }
            })
            .catch(() => {
                // An unreadable feature list means "assume nothing extra is installed". Showing a
                // tab we could not confirm would put the user in front of a screen that only
                // fails when clicked.
                if (!cancelled) {
                    setFeatures({});
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    // Unknown is treated as off, which is also what the brief window before the response looks
    // like — so an optional screen never appears and then disappears again a moment later.
    const isFeatureEnabled = useCallback(
        (key) => features?.[key] === true,
        [features]
    );

    const value = useMemo(
        () => ({ features, isFeatureEnabled, isLoading }),
        [features, isFeatureEnabled, isLoading]
    );

    return (
        <ServerFeaturesContext.Provider value={value}>{children}</ServerFeaturesContext.Provider>
    );
}

export const useServerFeatures = () => {
    const context = useContext(ServerFeaturesContext);
    if (!context) {
        throw new Error("useServerFeatures must be used inside ServerFeaturesProvider");
    }
    return context;
};
