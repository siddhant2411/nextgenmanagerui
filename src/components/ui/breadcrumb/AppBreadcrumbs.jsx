import { Breadcrumbs, Typography, Link as MuiLink, Tooltip } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Link, useLocation } from "react-router-dom";
import { breadcrumbNameMap, breadcrumbGroupPaths } from "../../../utils/breadcrumbConfig";

// URL words that describe what the page does, not a page you can open on its own.
const ACTION_LABELS = { add: "New", new: "New", edit: "Edit", view: "View", detail: "View" };
const ACRONYMS = new Set(["bom", "gst", "tds", "hsn", "oee", "coa", "crm", "ai", "gl", "po", "so"]);

const isId = (segment) =>
    /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

const humanize = (segment) =>
    decodeURIComponent(segment)
        .split(/[-_]/)
        .filter(Boolean)
        .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(" ");

function buildCrumbs(pathname) {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const to = "/" + segments.slice(0, i + 1).join("/");
        const action = ACTION_LABELS[segment.toLowerCase()];

        if (action) {
            // "edit/5" reads as one crumb: "Edit #5"; "view/7" as "#7".
            const next = segments[i + 1];
            if (next && isId(next)) {
                crumbs.push({ label: action === "View" ? `#${next}` : `${action} #${next}`, to: null });
                i++;
            } else {
                crumbs.push({ label: action, to: null });
            }
            continue;
        }

        if (isId(segment)) {
            crumbs.push({ label: `#${segment}`, to });
            continue;
        }

        crumbs.push({
            label: breadcrumbNameMap[to] || humanize(segment),
            to: breadcrumbGroupPaths.has(to) ? null : to,
        });
    }

    // A page that repeats its parent's name (e.g. a module home) is shown once.
    return crumbs.filter((crumb, index) => index === 0 || crumb.label !== crumbs[index - 1].label);
}

const crumbTextSx = { fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 };

export default function AppBreadcrumbs() {
    const location = useLocation();
    const crumbs = buildCrumbs(location.pathname);

    return (
        <Breadcrumbs
            aria-label="breadcrumb"
            maxItems={5}
            itemsBeforeCollapse={2}
            itemsAfterCollapse={2}
            separator={<NavigateNextIcon sx={{ fontSize: 16, color: "text.disabled" }} />}
            sx={{
                minWidth: 0,
                "& .MuiBreadcrumbs-ol": { flexWrap: "nowrap" },
                "& .MuiBreadcrumbs-li": { display: "flex", alignItems: "center", minWidth: 0 },
                "& .MuiBreadcrumbs-separator": { mx: 0.5 },
            }}
        >
            {crumbs.length === 0 ? (
                <Typography color="text.primary" sx={{ ...crumbTextSx, display: "flex", alignItems: "center", gap: 0.5 }}>
                    <HomeOutlinedIcon sx={{ fontSize: 18 }} />
                    Home
                </Typography>
            ) : (
                <Tooltip title="Home">
                    <MuiLink
                        component={Link}
                        to="/"
                        color="text.secondary"
                        aria-label="Home"
                        sx={{ display: "flex", alignItems: "center", "&:hover": { color: "primary.main" } }}
                    >
                        <HomeOutlinedIcon sx={{ fontSize: 18 }} />
                    </MuiLink>
                </Tooltip>
            )}
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                const key = `${index}-${crumb.label}`;

                if (isLast) {
                    return (
                        <Typography key={key} color="text.primary" fontWeight={600} sx={crumbTextSx} title={crumb.label}>
                            {crumb.label}
                        </Typography>
                    );
                }
                if (!crumb.to) {
                    return (
                        <Typography key={key} color="text.secondary" sx={crumbTextSx} title={crumb.label}>
                            {crumb.label}
                        </Typography>
                    );
                }
                return (
                    <MuiLink
                        key={key}
                        component={Link}
                        to={crumb.to}
                        underline="hover"
                        color="text.secondary"
                        sx={crumbTextSx}
                        title={crumb.label}
                    >
                        {crumb.label}
                    </MuiLink>
                );
            })}
        </Breadcrumbs>
    );
}
