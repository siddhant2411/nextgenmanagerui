export const AUTH_FORBIDDEN_EVENT = "ngm:auth:forbidden";

export const emitForbiddenEvent = (message = "Not authorized to perform this action.") => {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(
        new CustomEvent(AUTH_FORBIDDEN_EVENT, {
            detail: {
                message,
                timestamp: Date.now(),
            },
        })
    );
};

