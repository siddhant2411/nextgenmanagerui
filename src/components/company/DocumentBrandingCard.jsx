import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    Grid,
    Paper,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import { apiClient, apiClientFile, resolveApiErrorMessage } from "../../services/apiService";

const MODES = [
    {
        value: "NONE",
        label: "Company name as text",
        description: "The company name and address are printed as text. This is how documents print until you choose otherwise.",
    },
    {
        value: "LOGO",
        label: "Logo beside the company name",
        description: "Your logo is printed to the left of the company name and address. It takes no extra room on the page.",
        needs: "LOGO",
    },
    {
        value: "LETTERHEAD",
        label: "Letterhead image",
        description:
            "Your letterhead replaces the company name and address at the top of the page. GSTIN, PAN and CIN are printed on one line beneath it.",
        needs: "LETTERHEAD",
    },
    {
        value: "PREPRINTED",
        label: "Pre-printed letterhead paper",
        description:
            "The top 30 mm of the page is left blank for the letterhead already printed on your paper. GSTIN, PAN and CIN are printed on one line beneath it.",
    },
];

const IMAGES = [
    {
        kind: "LOGO",
        title: "Logo",
        hint: "Printed up to 45 mm wide and 18 mm tall. PNG or JPEG, up to 2 MB, at least 150 px on its longer side.",
        has: "hasLogo",
        width: "logoWidthPx",
        height: "logoHeightPx",
    },
    {
        kind: "LETTERHEAD",
        title: "Letterhead",
        hint: "A wide strip, printed across the full width of the page and up to 40 mm tall. PNG or JPEG, up to 2 MB, at least 800 px wide and three times as wide as it is tall. A deeper letterhead leaves room for fewer item rows per page.",
        has: "hasLetterhead",
        width: "letterheadWidthPx",
        height: "letterheadHeightPx",
    },
];

export default function DocumentBrandingCard({ canEdit }) {
    const [branding, setBranding] = useState(null);
    const [selectedMode, setSelectedMode] = useState("NONE");
    const [thumbnails, setThumbnails] = useState({});
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputs = useRef({});
    const thumbnailUrls = useRef({});

    const loadThumbnail = useCallback(async (kind, present) => {
        if (thumbnailUrls.current[kind]) {
            URL.revokeObjectURL(thumbnailUrls.current[kind]);
            delete thumbnailUrls.current[kind];
        }
        if (present) {
            try {
                const res = await apiClient.get("/company/branding/image", { params: { kind }, responseType: "blob" });
                thumbnailUrls.current[kind] = URL.createObjectURL(res.data);
            } catch {
                // The settings still work without the thumbnail.
            }
        }
        setThumbnails({ ...thumbnailUrls.current });
    }, []);

    // `refresh` names the images whose thumbnail must be fetched again; the rest are left alone.
    const apply = useCallback(
        (data, refresh = []) => {
            setBranding(data);
            setSelectedMode(data.mode || "NONE");
            IMAGES.filter((image) => refresh.includes(image.kind)).forEach((image) =>
                loadThumbnail(image.kind, Boolean(data[image.has]))
            );
        },
        [loadThumbnail]
    );

    useEffect(() => {
        const urls = thumbnailUrls.current;
        apiClient
            .get("/company/branding")
            .then((res) => apply(res.data, ["LOGO", "LETTERHEAD"]))
            .catch((err) => setError(resolveApiErrorMessage(err, "Failed to load the document branding settings.")));
        return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    }, [apply]);

    const run = async (name, action, doneMessage) => {
        setBusy(name);
        setError("");
        setSuccess("");
        try {
            await action();
            if (doneMessage) setSuccess(doneMessage);
        } catch (err) {
            setError(resolveApiErrorMessage(err, "That did not work. Please try again."));
        } finally {
            setBusy("");
        }
    };

    const handleFile = (kind) => (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        run(
            `upload-${kind}`,
            async () => {
                const formData = new FormData();
                formData.append("file", file);
                const res = await apiClientFile.post("/company/branding/image", formData, { params: { kind } });
                apply(res.data, [kind]);
            },
            kind === "LOGO" ? "Logo uploaded." : "Letterhead uploaded."
        );
    };

    const handleRemove = (kind) =>
        run(
            `remove-${kind}`,
            async () => {
                const res = await apiClient.delete("/company/branding/image", { params: { kind } });
                apply(res.data, [kind]);
            },
            kind === "LOGO" ? "Logo removed." : "Letterhead removed."
        );

    const handleApplyMode = () =>
        run(
            "mode",
            async () => {
                const res = await apiClient.put("/company/branding/mode", { mode: selectedMode });
                apply(res.data);
            },
            "Documents will now print with this header."
        );

    const handlePreview = () =>
        run("preview", async () => {
            const res = await apiClient.get("/company/branding/preview", {
                params: { mode: selectedMode },
                responseType: "blob",
            });
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            window.open(url, "_blank", "noopener");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        });

    const isAvailable = (mode) => !mode.needs || Boolean(branding?.[IMAGES.find((i) => i.kind === mode.needs).has]);
    const savedMode = branding?.mode || "NONE";

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 2, md: 4 },
                mt: 3,
                background: "#fff",
            }}
        >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Document Branding
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                How the top of your printed documents is headed: quotations, order acknowledgements, proforma and tax
                invoices, delivery challans, packing lists, purchase orders, job-work challans and customer price lists.
                Shop-floor sheets always carry the company name, with the logo beside it once branding is on.
                {!canEdit && " Contact an admin to make changes."}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Images
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {IMAGES.map((image) => {
                    const present = Boolean(branding?.[image.has]);
                    return (
                        <Grid item xs={12} sm={6} key={image.kind}>
                            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, height: "100%" }}>
                                <Typography sx={{ fontWeight: 700, mb: 1 }}>{image.title}</Typography>
                                <Box
                                    sx={{
                                        height: 84,
                                        mb: 1.5,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "1px dashed",
                                        borderColor: "divider",
                                        borderRadius: 1,
                                        background: "#fff",
                                        overflow: "hidden",
                                    }}
                                >
                                    {present && thumbnails[image.kind] ? (
                                        <img
                                            src={thumbnails[image.kind]}
                                            alt={image.title}
                                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            {present ? "Loading…" : "Not uploaded"}
                                        </Typography>
                                    )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                                    {image.hint}
                                    {present && ` Stored at ${branding[image.width]} × ${branding[image.height]} px.`}
                                </Typography>
                                {canEdit && (
                                    <Box sx={{ display: "flex", gap: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg"
                                            hidden
                                            ref={(el) => (fileInputs.current[image.kind] = el)}
                                            onChange={handleFile(image.kind)}
                                        />
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            disabled={Boolean(busy)}
                                            onClick={() => fileInputs.current[image.kind]?.click()}
                                        >
                                            {busy === `upload-${image.kind}` ? "Uploading..." : present ? "Replace" : "Upload"}
                                        </Button>
                                        {present && (
                                            <Button
                                                size="small"
                                                color="error"
                                                disabled={Boolean(busy)}
                                                onClick={() => handleRemove(image.kind)}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Header
            </Typography>
            <RadioGroup value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} sx={{ mb: 3 }}>
                {MODES.map((mode) => {
                    const available = isAvailable(mode);
                    return (
                        <FormControlLabel
                            key={mode.value}
                            value={mode.value}
                            disabled={!canEdit || !available}
                            control={<Radio size="small" />}
                            sx={{ alignItems: "flex-start", mb: 1, "& .MuiRadio-root": { pt: 0.5 } }}
                            label={
                                <Box>
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {mode.label}
                                        {mode.value === savedMode && (
                                            <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
                                                In use
                                            </Typography>
                                        )}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {mode.description}
                                        {!available && ` Upload a ${mode.needs === "LOGO" ? "logo" : "letterhead"} first.`}
                                    </Typography>
                                </Box>
                            }
                        />
                    );
                })}
            </RadioGroup>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {canEdit && (
                    <Button
                        variant="contained"
                        disabled={Boolean(busy) || selectedMode === savedMode}
                        onClick={handleApplyMode}
                    >
                        {busy === "mode" ? "Saving..." : "Use This Header"}
                    </Button>
                )}
                <Button variant="outlined" disabled={Boolean(busy) || !branding} onClick={handlePreview}>
                    {busy === "preview" ? "Preparing..." : "Preview Sample Page"}
                </Button>
            </Box>
        </Paper>
    );
}
