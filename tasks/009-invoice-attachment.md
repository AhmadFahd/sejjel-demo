# 009: Invoice attachment

Use case: UC-11. Status: done in prototype.

## Merchant side

- Optional field on the new purchase screen: الفاتورة / الإيصال (اختياري).
- Dashed dropzone, hidden file input, images and PDF.
- Once picked it becomes a preview chip: thumbnail for images, a document icon for PDF, filename, and a remove button.
- Files over 4 MB are rejected with a message.

## Both sides

- The attachment rides along with the approval request, so the customer sees a link to it before approving.
- After the scan confirms, the file is stored against the transaction.
- Transaction rows on both sides show a gold paperclip tag that opens the file in an overlay inside the phone frame.
- PDFs show a placeholder card, not a rendered page. A real app would preview it.

## Acceptance

- The attachment survives the whole path: pick, approve, scan, transaction row, viewer.
- Starting a new purchase or cancelling a pending one clears the staged file.

## Open for MVP

Storage and retention, more than one file per purchase, camera capture, PDF preview, and who is allowed to delete an attached invoice.
