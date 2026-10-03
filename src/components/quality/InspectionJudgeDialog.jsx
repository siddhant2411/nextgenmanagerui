import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { Add, DeleteOutline } from "@mui/icons-material";

const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
const optNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const blankCheck = () => ({
    parameterName: "",
    minValue: "",
    maxValue: "",
    unit: "",
    observedValue: "",
    critical: false,
    verdict: "AUTO",
    remarks: "",
});

/** How the server will read one check: the inspector's verdict wins, otherwise a reading against its limits. */
const outcomeOf = (c) => {
    if (c.verdict === "PASS" || c.verdict === "FAIL") return c.verdict;
    const v = optNum(c.observedValue);
    const lo = optNum(c.minValue);
    const hi = optNum(c.maxValue);
    if (v == null || (lo == null && hi == null)) return "PENDING";
    if (lo != null && v < lo) return "FAIL";
    if (hi != null && v > hi) return "FAIL";
    return "PASS";
};

const OUTCOME_COLOR = { PASS: "#15803d", FAIL: "#b91c1c", PENDING: "#a16207" };

/**
 * Records the answer: how many accepted, how many rejected, and what was checked.
 *
 * A lot fails when a critical check fails or when nothing is accepted. A non-critical failure is
 * recorded and reported without stopping the goods. In-process lots show no sheet — the operator's
 * measurements already live on the operation, and a second place to type them is how one
 * inspection becomes two records that disagree.
 */
const InspectionJudgeDialog = ({ open, lot, onClose, onSubmit, saving, error }) => {
    const [accepted, setAccepted] = useState("");
    const [rejected, setRejected] = useState("0");
    const [inspectedBy, setInspectedBy] = useState("");
    const [remarks, setRemarks] = useState("");
    const [checks, setChecks] = useState([]);

    const hasSheet = lot?.source !== "IN_PROCESS";

    useEffect(() => {
        if (!open || !lot) return;
        setAccepted(String(lot.quantityOffered ?? ""));
        setRejected("0");
        setInspectedBy("");
        setRemarks("");
        setChecks(
            (lot.results || []).map((r) => ({
                parameterName: r.parameterName || "",
                minValue: r.minValue ?? "",
                maxValue: r.maxValue ?? "",
                unit: r.unit || "",
                observedValue: r.observedValue ?? "",
                critical: Boolean(r.critical),
                verdict: "AUTO",
                remarks: r.remarks || "",
            }))
        );
    }, [open, lot]);

    const setCheck = (i, key, value) =>
        setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));

    const problem = useMemo(() => {
        const a = toNum(accepted);
        const r = toNum(rejected);
        if (!Number.isFinite(a) || !Number.isFinite(r) || a < 0 || r < 0) return "Enter both quantities";
        if (a + r > Number(lot?.quantityOffered ?? 0))
            return `Accepted plus rejected is more than the ${lot?.quantityOffered} offered`;
        if (checks.some((c) => !c.parameterName.trim())) return "Every check needs a name";
        return null;
    }, [accepted, rejected, checks, lot]);

    const criticalFailure = checks.some((c) => c.critical && outcomeOf(c) === "FAIL");
    const willFail = criticalFailure || !(toNum(accepted) > 0);

    const handleSubmit = () => {
        if (problem) return;
        onSubmit({
            quantityAccepted: toNum(accepted),
            quantityRejected: toNum(rejected),
            inspectedBy: inspectedBy.trim() || undefined,
            remarks: remarks.trim() || undefined,
            checks: hasSheet
                ? checks.map((c) => ({
                      parameterName: c.parameterName.trim(),
                      minValue: optNum(c.minValue),
                      maxValue: optNum(c.maxValue),
                      unit: c.unit.trim() || null,
                      critical: c.critical,
                      observedValue: optNum(c.observedValue),
                      passed: c.verdict === "PASS" ? true : c.verdict === "FAIL" ? false : null,
                      remarks: c.remarks.trim() || null,
                  }))
                : undefined,
        });
    };

    if (!lot) return null;

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>Record result — {lot.lotNumber}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {lot.itemCode} — {lot.itemName} · {lot.quantityOffered} offered
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        type="number"
                        label="Accepted"
                        value={accepted}
                        onChange={(e) => setAccepted(e.target.value)}
                        inputProps={{ min: 0, step: "any" }}
                    />
                    <TextField
                        size="small"
                        type="number"
                        label="Rejected"
                        value={rejected}
                        onChange={(e) => setRejected(e.target.value)}
                        inputProps={{ min: 0, step: "any" }}
                    />
                    <TextField
                        size="small"
                        label="Inspected by"
                        value={inspectedBy}
                        onChange={(e) => setInspectedBy(e.target.value)}
                        helperText="Blank records the signed-in user"
                        sx={{ flex: 1 }}
                    />
                </Stack>

                {hasSheet ? (
                    <>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                Check sheet
                            </Typography>
                            <Button size="small" startIcon={<Add />} onClick={() => setChecks((p) => [...p, blankCheck()])}>
                                Add check
                            </Button>
                        </Stack>
                        {checks.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                                No checks listed. The lot is judged on the quantities alone — add a check to
                                record a reading against a limit.
                            </Typography>
                        ) : (
                            <Box sx={{ overflowX: "auto" }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ minWidth: 170 }}>Check</TableCell>
                                            <TableCell sx={{ width: 90 }}>Min</TableCell>
                                            <TableCell sx={{ width: 90 }}>Max</TableCell>
                                            <TableCell sx={{ width: 80 }}>Unit</TableCell>
                                            <TableCell sx={{ width: 100 }}>Observed</TableCell>
                                            <TableCell sx={{ width: 120 }}>Verdict</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="A failed critical check fails the whole lot">
                                                    <span>Critical</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {checks.map((c, i) => {
                                            const outcome = outcomeOf(c);
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            placeholder="e.g. Wall thickness"
                                                            value={c.parameterName}
                                                            onChange={(e) => setCheck(i, "parameterName", e.target.value)}
                                                        />
                                                    </TableCell>
                                                    {["minValue", "maxValue"].map((k) => (
                                                        <TableCell key={k}>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={c[k]}
                                                                onChange={(e) => setCheck(i, k, e.target.value)}
                                                                inputProps={{ step: "any" }}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            value={c.unit}
                                                            onChange={(e) => setCheck(i, "unit", e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={c.observedValue}
                                                            onChange={(e) => setCheck(i, "observedValue", e.target.value)}
                                                            inputProps={{ step: "any" }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            fullWidth
                                                            value={c.verdict}
                                                            onChange={(e) => setCheck(i, "verdict", e.target.value)}
                                                        >
                                                            <MenuItem value="AUTO">By limits</MenuItem>
                                                            <MenuItem value="PASS">Pass</MenuItem>
                                                            <MenuItem value="FAIL">Fail</MenuItem>
                                                        </TextField>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: OUTCOME_COLOR[outcome], fontWeight: 700 }}
                                                        >
                                                            {outcome === "PENDING" ? "Not decided" : outcome}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Checkbox
                                                            size="small"
                                                            checked={c.critical}
                                                            onChange={(e) => setCheck(i, "critical", e.target.checked)}
                                                            inputProps={{ "aria-label": "Critical check" }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Remove check"
                                                            onClick={() => setChecks((p) => p.filter((_, idx) => idx !== i))}
                                                        >
                                                            <DeleteOutline fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </>
                ) : (
                    <Alert severity="info">
                        In-process inspections carry no sheet of their own. The operator's readings are on
                        the work order operation; this records only how much was accepted.
                    </Alert>
                )}

                <TextField
                    size="small"
                    label="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    sx={{ mt: 2 }}
                />

                {problem ? (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        {problem}
                    </Alert>
                ) : (
                    <Alert severity={willFail ? "error" : "success"} sx={{ mt: 2 }}>
                        {willFail
                            ? criticalFailure
                                ? "A critical check failed — this lot will be recorded as FAILED."
                                : "Nothing accepted — this lot will be recorded as FAILED."
                            : "This lot will be recorded as PASSED."}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving || Boolean(problem)}>
                    {saving ? "Saving…" : "Record result"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InspectionJudgeDialog;
