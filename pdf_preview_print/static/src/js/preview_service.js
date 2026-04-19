/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

/**
 * PDF Preview Report Handler
 *
 * Registers a handler in Odoo 16's "ir.actions.report handlers" registry
 * to intercept qweb-pdf report actions. Instead of the browser downloading
 * the file immediately, a full-screen preview dialog is shown first.
 *
 * The user can then Print, Download, or Close from the dialog.
 *
 * Note: Odoo 16 does not expose a `downloadReport` helper the way 17+ does,
 * so the download is performed directly against `/report/download` using the
 * shared `download` network utility (same approach as the core action
 * service's internal `_triggerDownload`).
 *
 * The preview URL is built with `getReportUrl` which mirrors the core v16
 * `_getReportUrl` byte-for-byte — this matters for reports whose action
 * carries wizard options in `action.data` (e.g. Customer Invoices, which
 * encode the reconciled payments flag there). A naive `/report/pdf/<name>/<ids>`
 * URL skips those options and can trigger server-side validation errors
 * such as "Only invoices could be printed." on otherwise valid selections.
 */

import { registry } from "@web/core/registry";
import { download } from "@web/core/network/download";
import { PreviewDialog } from "./preview_dialog";

export function getReportUrl(action, type, userContext) {
    let url = `/report/${type}/${action.report_name}`;
    const actionContext = action.context || {};
    if (action.data && JSON.stringify(action.data) !== "{}") {
        const options = encodeURIComponent(JSON.stringify(action.data));
        const context = encodeURIComponent(JSON.stringify(actionContext));
        url += `?options=${options}&context=${context}`;
    } else if (actionContext.active_ids) {
        url += `/${actionContext.active_ids.join(",")}`;
    }
    return url;
}

export function pdfPreviewHandler(action, options, env) {
    if (action.report_type && action.report_type !== "qweb-pdf") {
        return false;
    }

    const actionContext = action.context || {};
    const hasIds =
        (action.data && JSON.stringify(action.data) !== "{}") ||
        (actionContext.active_ids && actionContext.active_ids.length);
    if (!hasIds) {
        return false;
    }

    const userContext = { ...env.services.user.context, ...actionContext };
    const reportUrl = getReportUrl(action, "pdf", userContext);

    env.services.dialog.add(PreviewDialog, {
        reportUrl,
        reportName: action.name || action.display_name || "",
        async onDownload() {
            env.services.ui.block();
            try {
                await download({
                    url: "/report/download",
                    data: {
                        data: JSON.stringify([reportUrl, "qweb-pdf"]),
                        context: JSON.stringify(userContext),
                    },
                });
            } finally {
                env.services.ui.unblock();
            }
        },
    });

    return true;
}

registry
    .category("ir.actions.report handlers")
    .add("pdf_preview_print", pdfPreviewHandler);
