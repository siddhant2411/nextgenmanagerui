import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

/**
 * Asks before leaving a page that has unsaved changes.
 *
 * `beforeunload` only covers the browser leaving the page (closing the tab, reloading, typing an
 * address). Moving inside the app — a Back arrow, the sidebar, a link, the browser's Back button —
 * never unloads the page, so without this the changes were dropped silently.
 *
 * The app runs on <BrowserRouter>, where React Router's own useBlocker is not available (it needs a
 * data router). So this wraps the router's navigator for links and navigate(), and catches the
 * browser's Back/Forward in the capture phase before the router sees it.
 *
 * Usage:
 *   const { guardDialog, leaveWithoutPrompt } = useUnsavedChangesGuard(isDirty);
 *   ...
 *   {guardDialog}
 *   // a navigation the page makes on purpose right after saving:
 *   leaveWithoutPrompt(() => navigate(`/bom/edit/${id}`));
 */
export default function useUnsavedChangesGuard(when, {
    title = 'Leave without saving?',
    message = 'You have unsaved changes on this page. If you leave now they will be lost.',
} = {}) {
    const { navigator } = useContext(UNSAFE_NavigationContext);
    // The pending navigation, run if the user chooses to leave.
    const [pending, setPending] = useState(null);

    const whenRef = useRef(when);
    whenRef.current = when;
    // Set while a navigation is allowed through: the user chose to leave, or the page is moving on
    // after a save in the same tick it cleared its dirty flag.
    const bypassRef = useRef(false);
    // Set when the user chose to leave after pressing Back/Forward: the replayed history move must
    // reach the router. A one-shot flag, because history moves complete asynchronously.
    const allowNextPopRef = useRef(false);

    const leaveWithoutPrompt = useCallback((go) => {
        bypassRef.current = true;
        try {
            go();
        } finally {
            // Browser history moves asynchronously; keep the door open until that popstate is through.
            setTimeout(() => { bypassRef.current = false; }, 0);
        }
    }, []);

    // Links and navigate() go through the router's navigator.
    useEffect(() => {
        if (!when) return undefined;
        const { push, replace } = navigator;
        const guard = (original) => (...args) => {
            if (bypassRef.current || !whenRef.current) return original.apply(navigator, args);
            setPending(() => () => original.apply(navigator, args));
            return undefined;
        };
        navigator.push = guard(push);
        navigator.replace = guard(replace);
        return () => {
            navigator.push = push;
            navigator.replace = replace;
        };
    }, [navigator, when]);

    // Browser Back/Forward. The router stores a running index in history.state; the difference
    // tells how far the user moved, so the move can be undone and replayed if they choose to leave.
    useEffect(() => {
        if (!when) return undefined;
        let currentIdx = window.history.state?.idx;
        let restoring = false;
        const onPopState = (event) => {
            if (restoring) {
                // The step back to this page that undid the user's move.
                restoring = false;
                event.stopImmediatePropagation();
                return;
            }
            if (allowNextPopRef.current) {
                allowNextPopRef.current = false;
                return;
            }
            if (bypassRef.current || !whenRef.current) return;
            const targetIdx = event.state?.idx;
            if (typeof currentIdx !== 'number' || typeof targetIdx !== 'number') return;
            const delta = targetIdx - currentIdx;
            if (delta === 0) return;
            event.stopImmediatePropagation();
            restoring = true;
            window.history.go(-delta);
            setPending(() => () => {
                allowNextPopRef.current = true;
                window.history.go(delta);
            });
        };
        // Capture phase, so this runs before the router's own popstate listener.
        window.addEventListener('popstate', onPopState, true);
        return () => window.removeEventListener('popstate', onPopState, true);
    }, [when]);

    // Closing the tab, reloading, typing an address: only the browser's own prompt can stop these.
    useEffect(() => {
        if (!when) return undefined;
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [when]);

    const stay = () => setPending(null);
    const leave = () => {
        const go = pending;
        setPending(null);
        if (go) leaveWithoutPrompt(go);
    };

    const guardDialog = (
        <Dialog open={!!pending} onClose={stay} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>{title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary">{message}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={leave} color="error" sx={{ textTransform: 'none' }}>Leave without saving</Button>
                <Button onClick={stay} variant="contained" autoFocus sx={{ textTransform: 'none' }}>Stay on page</Button>
            </DialogActions>
        </Dialog>
    );

    return { guardDialog, leaveWithoutPrompt };
}
