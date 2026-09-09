/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

/**
 * PDF Preview Report Handler
 *
 * Registers a handler in Odoo 18's "ir.actions.report handlers" registry
 * to intercept qweb-pdf report actions. Instead of the browser downloading
 * the file immediately, a full-screen preview dialog is shown first.
 *
 * The user can then Print, Download, or Close from the dialog.
 */

import { registry } from "@web/core/registry";
import { user } from "@web/core/user";
import { rpc } from "@web/core/network/rpc";
import { PreviewDialog } from "./preview_dialog";
import { downloadReport } from "@web/webclient/actions/reports/utils";

/**
 * Can this server actually produce a PDF?
 *
 * Reuses core's own cached promise (see downloadReport in
 * web/webclient/actions/reports/utils.js), so this costs no extra RPC beyond
 * the one core would make anyway.
 */
async function canRenderPdf() {
    try {
        downloadReport.wkhtmltopdfStatusProm ||= rpc("/report/check_wkhtmltopdf");
        const status = await downloadReport.wkhtmltopdfStatusProm;
        return ["ok", "upgrade"].includes(status);
    } catch {
        // Status unknown: assume it works rather than disabling the module
        // over a failed probe.
        return true;
    }
}

export async function pdfPreviewHandler(action, options, env) {
    if (action.report_type && action.report_type !== "qweb-pdf") {
        return false;
    }

    const activeIds = getActiveIds(action);
    if (!activeIds.length) {
        return false;
    }

    // If the server cannot render PDFs, do NOT intercept. Core's own path
    // shows the wkhtmltopdf notification and falls back to the HTML report,
    // and neither is reproducible from here: _executeReportClientAction is a
    // closure inside the action-service factory, not an export. Previewing
    // anyway would show a 500 page and leave Download doing nothing at all.
    if (!(await canRenderPdf())) {
        return false;
    }

    const reportUrl = `/report/pdf/${action.report_name}/${activeIds.join(",")}`;

    env.services.dialog.add(PreviewDialog, {
        reportUrl,
        reportName: action.name || action.display_name || "",
        onDownload() {
            // Both `user` and `rpc` became singleton imports in Odoo 18+
            // (no longer service-registry entries), so env.services.user
            // and env.services.rpc are undefined. downloadReport's first
            // arg is the rpc function itself.
            //
            // RETURN the promise: the dialog needs {success, message} so it
            // can surface a failure instead of closing over it.
            const ctx = { ...user.context, ...action.context };
            return downloadReport(rpc, action, "pdf", ctx);
        },
    });

    // Returning true tells core the report was handled. Core then runs the
    // action's onClose() immediately (action_service.js:1298), so a wizard with
    // close_on_report_download shuts as the preview opens rather than after the
    // user downloads. That is deliberate: deferring it would mean holding this
    // promise open until the dialog closes, which blocks the action manager
    // behind a modal the user may leave open indefinitely. Documented in the
    // README and the storefront limitations rather than worked around.
    return true;
}

/**
 * Extract record IDs from the various places Odoo puts them.
 */
export function getActiveIds(action) {
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
    .add("no_pdf_preview_print", pdfPreviewHandler);
