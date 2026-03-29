import { Autocomplete, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { breadcrumbOptions } from "../../../../utils/breadcrumbConfig";

export default function SearchBar() {
    const navigate = useNavigate();

    return (
        <Autocomplete
            options={breadcrumbOptions}
            getOptionLabel={(option) => option.breadcrumb}
            renderInput={(params) => (
                <TextField {...params} placeholder="Search..." variant="outlined" size="small" />
            )}
            onChange={(event, value) => {
                if (value) {
                    navigate(value.path);
                }
            }}
            sx={{ width: { xs: 160, sm: 240, md: 320 } }}
        />
    );
}
