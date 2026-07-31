import { useCallback, useEffect, useRef, useState } from "react";

/**
 * List view-state preservation.
 *
 * Keeps a list's *query arguments* (filters, sort, page, page size) alive while
 * the user navigates around the SPA, so returning from a detail screen does not
 * blank an applied filter set.
 *
 * Design notes:
 *  - The backing store is a plain module-level Map, i.e. in-memory only. It dies
 *    on a hard reload, which is the intended "reload resets the tab" behaviour.
 *    Do NOT move this to session/localStorage without revisiting that contract.
 *  - Only query arguments belong here. Never store fetched rows, row selection,
 *    or anything holding a closure/DOM reference: the store outlives every
 *    component, so whatever goes in is retained until an explicit reset.
 *    `assertPersistable` polices this in development.
 *  - Consumers must still refetch on mount. This hook restores what to ask for,
 *    never what came back.
 */

/** namespace -> { [field]: value } */
const store = new Map();
/** namespace -> Set<() => void> */
const listeners = new Map();

const isPlainObject = (value) =>
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/**
 * Development-only guard against retaining non-serializable values. Reports
 * loudly rather than throwing so a bad call site is obvious without taking the
 * whole dev session down.
 */
const assertPersistable = (value, namespace, field, seen) => {
    if (process.env.NODE_ENV === "production") return;

    const visited = seen || new Set();
    const type = typeof value;

    if (value === null || value === undefined) return;
    if (type === "string" || type === "number" || type === "boolean") return;

    if (type !== "object") {
        // functions, symbols, bigint
        console.error(
            `[useViewState] "${namespace}.${field}" received a ${type}. Only JSON-serializable ` +
            `values may be preserved — anything else is retained for the lifetime of the page.`
        );
        return;
    }

    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((entry) => assertPersistable(entry, namespace, field, visited));
        return;
    }

    if (isPlainObject(value)) {
        Object.values(value).forEach((entry) => assertPersistable(entry, namespace, field, visited));
        return;
    }

    console.error(
        `[useViewState] "${namespace}.${field}" received a ${value?.constructor?.name || "non-plain object"}. ` +
        `Store plain values only (a Set of ids, a dayjs object or a DOM node will leak). ` +
        `Convert it to a primitive, array or plain object first.`
    );
};

/** A reset for "/purchase" also clears "/purchase/requisitions" etc. */
const matchesNamespace = (namespace, prefix) =>
    namespace === prefix || namespace.startsWith(`${prefix}/`);

const writeToStore = (namespace, field, value) => {
    let bucket = store.get(namespace);
    if (!bucket) {
        bucket = {};
        store.set(namespace, bucket);
    }
    bucket[field] = value;
};

const notify = (predicate) => {
    listeners.forEach((callbacks, namespace) => {
        if (!predicate(namespace)) return;
        // Copy: a callback may unsubscribe during iteration.
        Array.from(callbacks).forEach((callback) => callback());
    });
};

/** Subscribe to resets for a namespace. Returns an unsubscribe function. */
const subscribe = (namespace, callback) => {
    let callbacks = listeners.get(namespace);
    if (!callbacks) {
        callbacks = new Set();
        listeners.set(namespace, callbacks);
    }
    callbacks.add(callback);

    return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
            listeners.delete(namespace);
        }
    };
};

/**
 * Drop preserved state for a route namespace and every namespace beneath it,
 * snapping any currently mounted list back to its defaults.
 */
export function resetViewState(prefix) {
    if (!prefix) return;
    Array.from(store.keys())
        .filter((namespace) => matchesNamespace(namespace, prefix))
        .forEach((namespace) => store.delete(namespace));
    notify((namespace) => matchesNamespace(namespace, prefix));
}

/** Wipe everything. Called on logout so filters never leak between users. */
export function resetAllViewState() {
    store.clear();
    notify(() => true);
}

/**
 * Drop-in replacement for `useState`, scoped to a route namespace and field.
 *
 *   const [filters, setFilters] = useViewState(NS, 'filters', DEFAULT_FILTERS);
 *
 * `initialValue` supports a lazy initializer, is evaluated once, and is what the
 * field reverts to on reset. Keep it a module-level constant or a lazy function
 * — an inline literal re-created each render is fine for correctness but makes
 * the reset value harder to reason about.
 */
export function useViewState(namespace, field, initialValue) {
    const [initial] = useState(() =>
        typeof initialValue === "function" ? initialValue() : initialValue
    );

    const [value, setStoredValue] = useState(() => {
        const bucket = store.get(namespace);
        if (bucket && Object.prototype.hasOwnProperty.call(bucket, field)) {
            return bucket[field];
        }
        return initial;
    });

    // Mirrors `value` so functional updates resolve without putting a store
    // write inside a state updater (which StrictMode would double-invoke).
    const valueRef = useRef(value);
    valueRef.current = value;

    const setValue = useCallback(
        (next) => {
            const resolved = typeof next === "function" ? next(valueRef.current) : next;
            assertPersistable(resolved, namespace, field);
            writeToStore(namespace, field, resolved);
            valueRef.current = resolved;
            setStoredValue(resolved);
        },
        [namespace, field]
    );

    useEffect(() => subscribe(namespace, () => {
        valueRef.current = initial;
        setStoredValue(initial);
    }), [namespace, initial]);

    return [value, setValue];
}

/**
 * A counter that increments whenever `namespace` is reset. Starts at 0.
 *
 * Restoring the query is only half the job — a list also has to re-run its fetch
 * when the user clears it from the nav. Because every reset callback fires in one
 * synchronous pass, React batches them, so an effect keyed on this signal observes
 * the already-reverted filter/sort/page values:
 *
 *   const resetSignal = useViewStateResetSignal(NS);
 *   useEffect(() => {
 *     if (!resetSignal) return;          // nothing to do on first mount
 *     fetchList(filters, page, sortBy);  // reads post-reset defaults
 *   }, [resetSignal]);
 */
export function useViewStateResetSignal(namespace) {
    const [signal, setSignal] = useState(0);

    useEffect(() => subscribe(namespace, () => {
        setSignal((previous) => previous + 1);
    }), [namespace]);

    return signal;
}

export default useViewState;
