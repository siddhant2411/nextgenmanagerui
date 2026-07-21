# BOM Costing / Routing / Work-Order Cost — Bugs & Gaps

Last updated: 2026-07-08
Scope: Review of the active `machine-details` branch changes (`BomCostBreakdown.jsx`, `BomRouting.jsx`, `WorkOrderCostTab.jsx`) plus the surrounding costing pipeline: `BomServiceImpl`, `MakeBuyAnalysisServiceImpl`, `CostOfProductionServiceImpl`, `RoutingServiceImpl`, and `BomPositionTable.jsx`.

The new `applyOverhead` feature (opt-in work-center overhead on `RATE_TIMES_QTY` piece-rate operations) is wired correctly end-to-end — migration (`V147__operation_apply_overhead.sql`), entity/DTO mapping (`RoutingOperationDto` / `RoutingOperationMapper`), and all three cost services (`BomServiceImpl`, `MakeBuyAnalysisServiceImpl`, `CostOfProductionServiceImpl`) apply the same opt-in logic consistently. The subcontract-cost card/bar additions in `WorkOrderCostTab.jsx` are also correct.

Everything below is what's broken or missing.

## Bugs

### 1. BOM cost vs. Work-Order cost disagree by 60× on time-based (CALCULATED) operations — highest priority

The routing editor labels time fields "Setup Time (min)" and "Run Time (min/unit)" ([BomRouting.jsx:496-505](../src/components/bom/BomRouting.jsx#L496-L505)), and all rates are per-hour (`machineCostPerHour`, `LaborRole.costPerHour`).

- **Work-Order cost report converts correctly**: `estHours = totalPlanned / 60` (`CostOfProductionServiceImpl.java:275`).
- **BOM cost breakdown does not convert**: `machineCost = machineCostRate.multiply(totalTime)` multiplies the hourly rate directly by raw minutes (`BomServiceImpl.java:1342-1345`).
- **Make-vs-Buy has the same bug**: `MakeBuyAnalysisServiceImpl.java:228,232`.

Net effect: the same CALCULATED routing operation shows a cost ~60× higher on the BOM Cost Breakdown tab than on the Work Order Cost tab, and Make-vs-Buy analysis is skewed heavily toward "buy" for any item with machine/labour time-based operations.

Secondary basis mismatch worth deciding explicitly: BOM cost uses `setup + run` for a single unit (full setup cost loaded onto one unit), while WO cost uses `setup + run × plannedQty` (setup amortized across the whole planned quantity). Need a decision on which basis "per-unit BOM cost" should represent before fixing the ×60 issue, since the fix will change the numbers either way.

**Fix location**: divide by 60 in `BomServiceImpl.calculateOperationCost` (~line 1342) and `MakeBuyAnalysisServiceImpl` (~line 228, 232), matching `CostOfProductionServiceImpl.java:275`.

### 2. Re-adding an existing BOM component concatenates quantity as a string instead of incrementing it

[BomPositionTable.jsx:143](../src/components/bom/BomPositionTable.jsx#L143):
```js
updated.quantity = components[index].quantity + 1;
```
The Qty cell stores `e.target.value` (a string) via `onChange` at [BomPositionTable.jsx:263](../src/components/bom/BomPositionTable.jsx#L263). So a component with quantity `"2"` becomes `"21"` (string concatenation) instead of `3` when re-added via search. The same block also mutates `formik.values.components` in place before calling `setFieldValue` with the same array reference, which can defeat formik's dirty-checking/re-render in some cases.

**Fix**: `updated.quantity = Number(components[index].quantity || 0) + 1;` and copy the array (`[...components]`) before mutating.

### 3. Piece-rate (`RATE_TIMES_QTY`) operations render as broken CALCULATED rows in the Work Order Cost tab

[WorkOrderCostTab.jsx:340](../src/components/production/workorder/tabs/WorkOrderCostTab.jsx#L340):
```js
const isFlat = op.costType === 'SUB_CONTRACTED' || op.costType === 'FIXED_RATE';
```
This omits `RATE_TIMES_QTY`, so piece-rate operations fall into the time-based column layout and display "Setup: 0.0m · Run: 0.00m/unit", 0 planned minutes, "₹0.00 × 0" labour, and the "no labour entries logged" warning asterisk — none of which apply to a piece-rate line. The backend does return the piece-rate fields needed (`subcontractRatePerUnit`, `overheadPercentage`) via `CostOfProductionServiceImpl.java:243`, but the UI never renders the rate × eaches structure for this cost type.

**Fix**: add a third branch (or extend `isFlat`-style rendering) for `RATE_TIMES_QTY` that shows rate/unit × quantity, matching the piece-rate rendering already present in `BomCostBreakdown.jsx:168-177`.

### 4. Phantom "Edit: undefined" operation panel opens on mount of the routing tab

[BomRouting.jsx:175-183](../src/components/bom/BomRouting.jsx#L175-L183) runs whenever `selectedJob` changes (including on mount, when both `selectedJob` and `selectedOperation` are `null`):
```js
useEffect(() => {
    if (!selectedOperation?.id) {
        setSelectedOperation({ ...selectedOperation, workCenter: selectedJob?.workCenter ?? null });
        setSelectedWorkCenter(selectedJob?.workCenter ?? null);
    }
}, [selectedJob]);
```
`{...null, workCenter: null}` produces a truthy object `{workCenter: null}`. The editor panel gates purely on truthiness (`{selectedOperation && (...)}` at [BomRouting.jsx:435](../src/components/bom/BomRouting.jsx#L435)), so it opens for an operation that doesn't exist and has no `name`. "Save" silently no-ops because `handleSaveOperation` matches by `id || _tempId`, which this phantom object has neither of.

**Fix**: guard the effect with `if (!selectedOperation) return;` before constructing the phantom object, or only run when there's a real operation selected.

### 5. `FIXED_RATE` operation with no `fixedCostPerUnit` silently falls through to time-based costing

[CostOfProductionServiceImpl.java:193](../../../../nextgenmanager/src/main/java/com/nextgenmanager/nextgenmanager/production/service/workorder/CostOfProductionServiceImpl.java#L193) requires `ro.getFixedCostPerUnit() != null` to take the flat-rate branch. If a `FIXED_RATE` operation is missing its rate, it falls through into the labour/machine/overhead time-based calculation instead of costing ₹0 — inconsistent with `SUB_CONTRACTED` (which stays in the flat branch and costs ₹0 for a null rate) and with the BOM-side behavior (`BomServiceImpl.java:1387-1390`, which treats null as `BigDecimal.ZERO` while staying in the flat branch).

**Fix**: drop the `fixedCostPerUnit != null` condition from the `FIXED_RATE` branch check and treat null as zero, same as `BomServiceImpl`.

## Gaps

### Actual costs aren't truly "actual"

- **Material actual cost** = standard cost × consumed quantity (`CostOfProductionServiceImpl.java:124`), not the real purchase price. Material cost variance can therefore never reflect price variance, even though vendor prices and GRNs exist elsewhere in the system.
- **Subcontract actual cost** = routing rate × completed quantity — the actual Job Work Challan dispatch/receipt amounts are never used, despite the Job Work Challan module already existing and tracking real subcontract transactions.

This is the largest functional gap: the "Cost of Production" report currently can't show true cost variance for material price or subcontract price, only quantity variance.

### Dead component

[WorkOrderCostDetails.jsx](../src/components/production/workorder/tabs/WorkOrderCostDetails.jsx) is not imported anywhere in the codebase. Likely superseded by `WorkOrderCostTab.jsx`; candidate for deletion.

### Silent no-op adding a duplicate consumable

[BomPositionTable.jsx:122](../src/components/bom/BomPositionTable.jsx#L122): adding a `CONSUMABLE` item that's already present in `costLines` does nothing, with no toast/feedback to the user that the action had no effect.

### Untracked `scripts/` directory

`scripts/seed_valve_boms.py` and its `__pycache__/` are untracked in git. The `__pycache__` should be gitignored regardless of whether the script itself gets committed.

### Minor: stale `applyOverhead` flag on cost-type switch

Switching a routing operation's cost type away from `RATE_TIMES_QTY` clears `costRate`/`costQuantity` but not `applyOverhead` ([BomRouting.jsx:511-521](../src/components/bom/BomRouting.jsx#L511-L521)). Harmless today since the backend only reads `applyOverhead` for `RATE_TIMES_QTY` operations, but it's a stale-state trap if that assumption ever changes.

## Verified clean

- V147 migration: valid Postgres syntax, table name matches project's camelCase convention (`routingOperation`).
- `applyOverhead` persists correctly on both create and update paths in `RoutingServiceImpl` (lines 167, 264).
- MapStruct read-back (`RoutingOperationMapper`) correctly surfaces `applyOverhead` to the frontend (no explicit `@Mapping` needed — MapStruct auto-maps by field name).
- Opt-in overhead math is identical across `BomServiceImpl`, `MakeBuyAnalysisServiceImpl`, and `CostOfProductionServiceImpl` for piece-rate operations.
- `BomCostBreakdown.jsx` piece-rate row column count is consistent between branches (13 columns total either way).
- New "Total Operation Cost" row in `WorkOrderCostTab.jsx` (summing `estimatedTotalCost`/`actualTotalCost` per line) correctly includes subcontract/fixed-rate/piece-rate lines with no double-counting.
- Subcontract cost card and breakdown-bar gating (`parseFloat(...) > 0`) in `WorkOrderCostTab.jsx` is correct.
