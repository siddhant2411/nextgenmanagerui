import { Box, Button, Paper, Stack, Toolbar, Typography } from '@mui/material'
import React, { useState } from 'react'

export default function AddWorkCenter() {
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        <Box component="form"
            //   onSubmit={handleSubmit}
            sx={{
                p: 3,
                borderRadius: 2,
                minHeight: "100%",

            }}>
            <Paper elevation={3} sx={{ padding: 2, maxWidth: "100%", margin: "auto", borderRadius: 2, }}>
                <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1, pb: 1 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                        {isEditMode
                            ? "itemData.name"
                            : 'Add Work Center'}
                    </Typography>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>

                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" type="submit" sx={{ mt: 3 }}>Save</Button>
                        </Stack>
                    </Box>
                </Toolbar>
            </Paper>

        </Box>

    )
}

