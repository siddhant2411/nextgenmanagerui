import { Breadcrumbs, Typography, Link as MuiLink } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { breadcrumbNameMap } from "../../../utils/breadcrumbConfig";


export default function AppBreadcrumbs() {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <Breadcrumbs aria-label="breadcrumb" sx={{ p: 1 }}>
            <MuiLink component={Link} to="/" underline="hover" color="inherit">
                <img
                    src={process.env.PUBLIC_URL + '/NGM.png'}
                    alt="logo"
                    style={{ width: 20, height: 20 }} // adjust size as needed
                />
            </MuiLink>
            {pathnames.map((value, index) => {
                const to = `/${pathnames
                    .slice(0, index + 1)
                    .filter(p => p !== "edit")
                    .join("/")}`
                const isLast = index === pathnames.length - 1;
                const label = breadcrumbNameMap[to] || value;

                return isLast ? (
                    <Typography color="text.primary" key={to}>
                        {label}
                    </Typography>
                ) : (
                    <MuiLink
                        component={Link}
                        underline="hover"
                        color="inherit"
                        to={to}
                        key={to}
                    >
                        {label}
                    </MuiLink>
                );
            })}
        </Breadcrumbs>
    );
}
