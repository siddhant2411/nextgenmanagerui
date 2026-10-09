// Opens a pre-filled email from the browser: Gmail compose, the PC's default mail app, or a draft file
// that already carries the PDF. A browser cannot attach a file to Gmail or to a mail app's compose
// window, so for those two the PDF is downloaded alongside for the user to drag in.

const FROM_KEY = 'emailSendFrom';

export const getSendFrom = () => {
    try { return localStorage.getItem(FROM_KEY) || ''; } catch { return ''; }
};

// Contact's own email first, then the primary person, then anyone else on file.
export const contactEmails = (contact) => {
    const persons = [...(contact?.personDetails ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    const all = [contact?.email, ...persons.map(p => p.emailId)].map(e => (e || '').trim()).filter(Boolean);
    return [...new Set(all)];
};

export const safeFileName = (name) => String(name).replace(/[\\/:*?"<>|]/g, '-');

export const saveBlob = (blob, fileName) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

const b64Lines = (b64) => b64.match(/.{1,76}/g).join('\r\n');
const utf8B64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const blobB64 = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
});

// An unsent (X-Unsent) message file: desktop mail apps open it as a ready-to-send draft, PDF included.
const buildDraft = async ({ to, subject, body, pdf, pdfName }) => {
    const boundary = `----draft-${Date.now()}`;
    return new Blob([[
        `To: ${to}`,
        `Subject: =?UTF-8?B?${utf8B64(subject)}?=`,
        'X-Unsent: 1',
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64Lines(utf8B64(body)),
        `--${boundary}`,
        `Content-Type: application/pdf; name="${pdfName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${pdfName}"`,
        '',
        b64Lines(await blobB64(pdf)),
        `--${boundary}--`,
        '',
    ].join('\r\n')], { type: 'message/rfc822' });
};

/**
 * via: 'gmail' | 'app' | 'draft'. Call it straight from the click handler, before any await —
 * the browser blocks a compose window opened later.
 * fetchPdf (optional) resolves to the PDF blob; the returned promise rejects if the PDF could not be prepared.
 */
export const sendEmail = async (via, { to, subject, body, from }, fetchPdf, pdfName) => {
    if (via === 'gmail') {
        const sender = (from || '').trim();
        try { localStorage.setItem(FROM_KEY, sender); } catch { /* remembered only when storage is available */ }
        const compose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        // Gmail otherwise composes from whichever account signed in first; with no sender named, Google asks.
        window.open(sender
            ? `${compose}&authuser=${encodeURIComponent(sender)}`
            : `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(compose)}`, '_blank');
    } else if (via === 'app') {
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    if (!fetchPdf) return;

    const pdf = await fetchPdf();
    if (via === 'draft') {
        saveBlob(await buildDraft({ to, subject, body, pdf, pdfName }), pdfName.replace(/\.pdf$/, '.eml'));
    } else {
        saveBlob(pdf, pdfName);
    }
};
