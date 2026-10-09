import React from 'react';
import { Button, TextField } from '@mui/material';
import { AttachFile, Email, OpenInNew } from '@mui/icons-material';

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } };
const buttonSx = { textTransform: 'none', fontWeight: 700, borderRadius: 2 };

/** The Gmail account Open in Gmail composes from; utils/emailCompose remembers the last one used. */
export const SendFromField = ({ value, onChange, sx }) => (
    <TextField fullWidth size="small" label="Send from (your Gmail address)" type="email"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="you@yourcompany.com"
        helperText="Used by Open in Gmail. Leave blank to pick the account each time."
        sx={{ ...fieldSx, ...sx }} />
);

export const EMAIL_SEND_HINT = 'Gmail and Email App open the message filled in and download the PDF — drag it '
    + 'into the email before sending. Draft with PDF downloads a ready message with the PDF already attached; '
    + 'open it in Outlook and press Send.';

/** onSend(via) with via 'gmail' | 'app' | 'draft'; withPdf adds the draft-file option. */
export const EmailSendButtons = ({ onSend, disabled, busy, withPdf }) => (
    <>
        {withPdf && (
            <Button variant="outlined" disabled={disabled} startIcon={<AttachFile />}
                onClick={() => onSend('draft')} sx={buttonSx}>
                Draft with PDF
            </Button>
        )}
        <Button variant="outlined" disabled={disabled} startIcon={<Email />}
            onClick={() => onSend('app')} sx={buttonSx}>
            Email App
        </Button>
        <Button variant="contained" disableElevation disabled={disabled} startIcon={<OpenInNew />}
            onClick={() => onSend('gmail')}
            sx={{ ...buttonSx, px: 3, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>
            {busy ? 'Opening...' : 'Open in Gmail'}
        </Button>
    </>
);
