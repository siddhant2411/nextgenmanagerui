import { useMemo } from "react";
import {
    getWorkCenterDisplayValue,
    parseNumberInput,
} from "./machineAssetsHelpers";

export default function useMachineFilters({
    machines,
    searchText,
    statusFilter,
    workCenterFilter,
    sortBy,
    sortDir,
}) {
    return useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase();

        const filtered = (machines || []).filter((machine) => {
            const workCenterText = getWorkCenterDisplayValue(machine?.workCenter);
            const matchesStatus = statusFilter === "ALL" || machine?.status === statusFilter;
            const matchesWorkCenter =
                workCenterFilter === "ALL" || workCenterText === workCenterFilter;
            const matchesSearch =
                !normalizedSearch ||
                [
                    machine?.machineCode,
                    machine?.machineName,
                    workCenterText,
                    machine?.description,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(normalizedSearch));

            return matchesStatus && matchesWorkCenter && matchesSearch;
        });

        const direction = sortDir === "asc" ? 1 : -1;
        return filtered.sort((a, b) => {
            if (sortBy === "costPerHour") {
                const left = parseNumberInput(a?.costPerHour) ?? 0;
                const right = parseNumberInput(b?.costPerHour) ?? 0;
                return left === right ? 0 : left > right ? direction : -direction;
            }
            if (sortBy === "workCenter") {
                const left = getWorkCenterDisplayValue(a?.workCenter).toLowerCase();
                const right = getWorkCenterDisplayValue(b?.workCenter).toLowerCase();
                if (left === right) {
                    return 0;
                }
                return left > right ? direction : -direction;
            }

            const left = String(a?.[sortBy] || "").toLowerCase();
            const right = String(b?.[sortBy] || "").toLowerCase();
            if (left === right) {
                return 0;
            }
            return left > right ? direction : -direction;
        });
    }, [machines, searchText, sortBy, sortDir, statusFilter, workCenterFilter]);
}
