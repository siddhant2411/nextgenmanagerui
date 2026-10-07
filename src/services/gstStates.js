import { useEffect, useState } from 'react';
import apiService from './apiService';

/*
 * The GST state / UT codes. The list is fixed by law and held by the backend (GstState, seeded
 * into the gstState table), so it is fetched once per session and shared by every form.
 */
let cached = null;
let pending = null;

export const loadGstStates = () => {
    if (cached) return Promise.resolve(cached);
    if (!pending) {
        pending = apiService.get('/common/gst-states')
            .then((r) => { cached = r ?? []; return cached; })
            .catch(() => { pending = null; return []; });
    }
    return pending;
};

/* The list if it has already arrived, for code that cannot wait on a promise. */
export const gstStatesNow = () => cached ?? [];

export const useGstStates = () => {
    const [states, setStates] = useState(cached ?? []);
    useEffect(() => {
        let live = true;
        loadGstStates().then((r) => { if (live) setStates(r); });
        return () => { live = false; };
    }, []);
    return states;
};

const plain = (s) => (s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

/* Matches a state name as typed on an address, the way the backend does (GstState.fromName). */
export const stateCodeForName = (states, name) => {
    const n = plain(name);
    return n ? states.find((s) => plain(s.name) === n)?.code ?? '' : '';
};

export const stateNameForCode = (states, code) => states.find((s) => s.code === code)?.name ?? '';

/* The state a GSTIN is registered in: its first two characters, when they are a state code. */
export const stateCodeFromGstin = (states, gstin) => {
    const prefix = (gstin ?? '').trim().slice(0, 2);
    return states.some((s) => s.code === prefix) ? prefix : '';
};

/* "Gujarat (24)", or the raw code while the list is loading or for a code that is not a state. */
export const stateLabel = (states, code) => {
    if (!code) return '';
    const name = stateNameForCode(states, code);
    return name ? `${name} (${code})` : code;
};
