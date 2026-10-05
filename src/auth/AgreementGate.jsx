import React, { useCallback, useState } from "react";
import { useAuth } from "./AuthContext";
import UserAgreementPage from "../pages/UserAgreementPage";

// Holds back the application until the signed-in user has accepted the current user agreement.
// /auth/me reports acceptance; when it hasn't answered (agreementAccepted undefined) the agreement
// page asks the server itself and lets the user straight through if they had already accepted.
export default function AgreementGate({ children }) {
    const { user, logout, refreshCurrentUser } = useAuth();
    const [acceptedHere, setAcceptedHere] = useState(false);

    const handleAccepted = useCallback(() => {
        setAcceptedHere(true);
        refreshCurrentUser().catch(() => {
            // The local flag already lets the user in; the next /auth/me will catch up.
        });
    }, [refreshCurrentUser]);

    if (user?.agreementAccepted === true || acceptedHere) {
        return children;
    }

    return <UserAgreementPage onAccepted={handleAccepted} onDecline={logout} />;
}
