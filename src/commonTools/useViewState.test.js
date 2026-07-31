import { act, renderHook } from "@testing-library/react";
import {
    resetAllViewState,
    resetViewState,
    useViewState,
    useViewStateResetSignal,
} from "./useViewState";

const NS = "/production/work-order";

afterEach(() => {
    resetAllViewState();
});

describe("useViewState", () => {
    it("returns the initial value when nothing is stored", () => {
        const { result } = renderHook(() => useViewState(NS, "page", 0));
        expect(result.current[0]).toBe(0);
    });

    it("preserves a value across unmount and remount", () => {
        const { result, unmount } = renderHook(() => useViewState(NS, "page", 0));
        act(() => result.current[1](3));
        expect(result.current[0]).toBe(3);
        unmount();

        const { result: remounted } = renderHook(() => useViewState(NS, "page", 0));
        expect(remounted.current[0]).toBe(3);
    });

    it("supports functional updates", () => {
        const { result } = renderHook(() => useViewState(NS, "page", 0));
        act(() => result.current[1]((previous) => previous + 1));
        act(() => result.current[1]((previous) => previous + 1));
        expect(result.current[0]).toBe(2);
    });

    it("keeps consecutive functional updates in one handler consistent", () => {
        const { result } = renderHook(() => useViewState(NS, "page", 0));
        act(() => {
            result.current[1]((previous) => previous + 1);
            result.current[1]((previous) => previous + 1);
        });
        expect(result.current[0]).toBe(2);
    });

    it("keeps namespaces isolated", () => {
        const { result: workOrder } = renderHook(() => useViewState(NS, "page", 0));
        const { result: bom } = renderHook(() => useViewState("/bom", "page", 0));

        act(() => workOrder.current[1](5));

        expect(workOrder.current[0]).toBe(5);
        expect(bom.current[0]).toBe(0);
    });

    it("preserves object and array values such as filter sets", () => {
        const initial = [];
        const applied = [{ field: "status", operator: "=", value: "READY" }];

        const { result, unmount } = renderHook(() => useViewState(NS, "filters", initial));
        act(() => result.current[1](applied));
        unmount();

        const { result: remounted } = renderHook(() => useViewState(NS, "filters", initial));
        expect(remounted.current[0]).toEqual(applied);
    });
});

describe("resetViewState", () => {
    it("reverts a mounted hook to its initial value", () => {
        const { result } = renderHook(() => useViewState(NS, "page", 0));
        act(() => result.current[1](4));
        expect(result.current[0]).toBe(4);

        act(() => resetViewState(NS));
        expect(result.current[0]).toBe(0);
    });

    it("clears stored state so a later mount starts fresh", () => {
        const { result, unmount } = renderHook(() => useViewState(NS, "page", 0));
        act(() => result.current[1](4));
        unmount();

        act(() => resetViewState(NS));

        const { result: remounted } = renderHook(() => useViewState(NS, "page", 0));
        expect(remounted.current[0]).toBe(0);
    });

    it("resets nested namespaces beneath the prefix", () => {
        const { result: orders } = renderHook(() => useViewState("/purchase", "page", 0));
        const { result: requisitions } = renderHook(() =>
            useViewState("/purchase/requisitions", "page", 0)
        );

        act(() => {
            orders.current[1](2);
            requisitions.current[1](7);
        });

        act(() => resetViewState("/purchase"));

        expect(orders.current[0]).toBe(0);
        expect(requisitions.current[0]).toBe(0);
    });

    it("does not reset a sibling namespace sharing a path prefix", () => {
        const { result: inventory } = renderHook(() => useViewState("/inventory", "page", 0));
        const { result: inventoryItem } = renderHook(() =>
            useViewState("/inventory-item", "page", 0)
        );

        act(() => {
            inventory.current[1](2);
            inventoryItem.current[1](9);
        });

        act(() => resetViewState("/inventory"));

        expect(inventory.current[0]).toBe(0);
        expect(inventoryItem.current[0]).toBe(9);
    });

    it("leaves unrelated namespaces untouched", () => {
        const { result: workOrder } = renderHook(() => useViewState(NS, "page", 0));
        const { result: bom } = renderHook(() => useViewState("/bom", "page", 0));

        act(() => {
            workOrder.current[1](2);
            bom.current[1](6);
        });

        act(() => resetViewState(NS));

        expect(workOrder.current[0]).toBe(0);
        expect(bom.current[0]).toBe(6);
    });
});

describe("resetAllViewState", () => {
    it("clears every namespace, as on logout", () => {
        const { result: workOrder } = renderHook(() => useViewState(NS, "page", 0));
        const { result: bom } = renderHook(() => useViewState("/bom", "page", 0));

        act(() => {
            workOrder.current[1](2);
            bom.current[1](6);
        });

        act(() => resetAllViewState());

        expect(workOrder.current[0]).toBe(0);
        expect(bom.current[0]).toBe(0);
    });
});

describe("useViewStateResetSignal", () => {
    it("starts at zero so mounting does not look like a reset", () => {
        const { result } = renderHook(() => useViewStateResetSignal(NS));
        expect(result.current).toBe(0);
    });

    it("increments when its namespace is reset", () => {
        const { result } = renderHook(() => useViewStateResetSignal(NS));

        act(() => resetViewState(NS));
        expect(result.current).toBe(1);

        act(() => resetViewState(NS));
        expect(result.current).toBe(2);
    });

    it("does not fire for an unrelated namespace", () => {
        const { result } = renderHook(() => useViewStateResetSignal(NS));
        act(() => resetViewState("/bom"));
        expect(result.current).toBe(0);
    });

    it("observes already-reverted values, so a refetch reads defaults", () => {
        // Mirrors how a list consumes this: the reset callbacks all fire in one
        // synchronous pass, so an effect keyed on the signal must not see stale
        // filters. Guards against a refetch that would re-apply cleared filters.
        const observed = [];
        const { result } = renderHook(() => {
            const [page, setPage] = useViewState(NS, "page", 0);
            const signal = useViewStateResetSignal(NS);
            observed.push({ signal, page });
            return { setPage };
        });

        act(() => result.current.setPage(5));
        act(() => resetViewState(NS));

        const afterReset = observed[observed.length - 1];
        expect(afterReset.signal).toBe(1);
        expect(afterReset.page).toBe(0);
    });
});

describe("leak guards", () => {
    it("stops notifying a hook once it unmounts", () => {
        const { result, unmount } = renderHook(() => useViewState(NS, "page", 0));
        act(() => result.current[1](3));
        unmount();

        // Would throw on a setState-after-unmount if the subscription leaked.
        expect(() => act(() => resetViewState(NS))).not.toThrow();
    });

    it("warns when handed a value that cannot be safely retained", () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => { });
        const { result } = renderHook(() => useViewState(NS, "selection", null));

        act(() => result.current[1](new Set([1, 2, 3])));

        expect(error).toHaveBeenCalledWith(expect.stringContaining("Set"));
        error.mockRestore();
    });

    it("accepts nested plain values without warning", () => {
        const error = jest.spyOn(console, "error").mockImplementation(() => { });
        const { result } = renderHook(() => useViewState(NS, "filters", []));

        act(() => result.current[1]([{ field: "status", operator: "=", value: "READY" }]));

        expect(error).not.toHaveBeenCalled();
        error.mockRestore();
    });
});
