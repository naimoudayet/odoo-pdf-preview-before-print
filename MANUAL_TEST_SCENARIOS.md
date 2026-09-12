# Manual Test Scenarios -- PDF Preview Before Print

Dev stack: `docker-compose up -d`, then open <http://localhost:2016> and use database `pdfprev16`.
Install `sale_management`, `contacts`, `account` and `project` with demo data so there are
real records to print.

## 1. The preview opens instead of a download
1. **Sales > Orders > Quotations**, open any quotation.
2. **Print > Quotation**.
3. A full-screen dialog opens with the rendered PDF. Nothing has been downloaded yet.

## 2. Print from inside the dialog
1. With the preview open, click **Print**.
2. The browser print dialog appears for that exact document.

## 3. Download from inside the dialog
1. With the preview open, click **Download**.
2. The PDF is saved with the same filename Odoo would normally have used.

## 4. Close leaves no trace
1. Open the preview, then click **Close** (and once more with the Escape key).
2. You are back on the record, nothing was downloaded, and no error appears in the console.

## 5. Multi-record printing
1. In the Quotations list, tick three records.
2. **Print > Quotation**: the preview shows the merged document containing all three.

## 6. Every report type
1. Repeat scenario 1 on an invoice (**Accounting > Customers > Invoices**), a delivery slip
   and a project report.
2. Each opens in the preview; none bypasses it.

## 7. Non-PDF reports are untouched
1. Print a report whose output is XLSX or CSV.
2. It downloads directly, with no preview dialog -- the module only intercepts PDF actions.

## 8. Translation
1. Switch your user language in **Preferences > Language** to German, then Arabic.
2. The dialog title and the Print / Download / Close buttons follow the language;
   Arabic renders right-to-left with the buttons correctly placed.

## 9. Browser PDF engine fallback
1. Open the preview in Chrome, then in Firefox.
2. Both render the document inline. If a browser cannot render it, the dialog shows the
   fallback message with a working Download button rather than a blank frame.

## 10. Uninstall is clean
1. **Apps > PDF Preview Before Print > Uninstall**.
2. Printing returns to the stock direct-download behaviour, with no leftover dialog or error.
