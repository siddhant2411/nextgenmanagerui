import { Autocomplete, TextField } from "@mui/material";
import { breadcrumbOptions } from "../../../../utils/breadcrumbConfig";

export default function SearchBar() {
    return (
        <Autocomplete
            options={breadcrumbOptions}
            getOptionLabel={(option) => option.breadcrumb}
            renderInput={(params) => (
                <TextField {...params} placeholder="Search..." variant="outlined" size="small" />
            )}
            onChange={(event, value) => {
                if (value) {
                    window.location.href = value.path; // navigate to selected path
                }
            }}
            sx={{ width: 400 }}
        />
    );
}
