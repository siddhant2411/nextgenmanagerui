import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { Button } from 'bootstrap'
import React, { useState } from 'react'

export default function DuplicateBomDilogue({ duplicateDialogOpen, setDuplicateDialogOpen, duplicating, handleConfirmDuplicate }) {




    return (
        <Dialog
            open={duplicateDialogOpen}
            onClose={() => setDuplicateDialogOpen(false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Duplicate BOM</DialogTitle>

            <DialogContent>
                <Typography variant="body2">
                    This will create a new BOM as a draft using the current BOM structure.
                    <br />
                    Are you sure you want to continue?
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => setDuplicateDialogOpen(false)}
                    disabled={duplicating}
                >
                    Cancel
                </Button>

                <Button
                    variant="contained"
                    color="primary"
                    disabled={duplicating}
                    onClick={handleConfirmDuplicate}
                >
                    {duplicating ? "Duplicating…" : "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
