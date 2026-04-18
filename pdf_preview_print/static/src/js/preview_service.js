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
 */

import { registry } from "@web/core/registry";
import { download } from "@web/core/network/download";
import { PreviewDialog } from "./preview_dialog";

function pdfPreviewHandler(action, options, env) {
    if (action.report_type && action.report_type !== "qweb-pdf") {
        return false;
    }

    const activeIds = getActiveIds(action);
    if (!activeIds.length) {
        return false;
    }

    const reportUrl = `/report/pdf/${action.report_name}/${activeIds.join(",")}`;

    env.services.dialog.add(PreviewDialog, {
        reportUrl,
        reportName: action.name || action.display_name || "",
        async onDownload() {
            const context = { ...env.services.user.context, ...action.context };
            env.services.ui.block();
            try {
                await download({
                    url: "/report/download",
                    data: {
                        data: JSON.stringify([reportUrl, "qweb-pdf"]),
                        context: JSON.stringify(context),
                    },
                });
            } finally {
                env.services.ui.unblock();
            }
        },
    });

    return true;
}

/**
 * Extract record IDs from the various places Odoo puts them.
 */
function getActiveIds(action) {
    if (action.context?.active_ids?.length) {
        return action.context.active_ids;
    }
    if (action.context?.active_id) {
        return [action.context.active_id];
    }
    if (action.data?.ids?.length) {
        return action.data.ids;
    }
    if (action.data?.id) {
        return [action.data.id];
    }
    return [];
}

registry
    .category("ir.actions.report handlers")
    .add("pdf_preview_print", pdfPreviewHandler);
