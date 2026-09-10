/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

/**
 * PDF Preview Report Handler
 *
 * Registers a handler in Odoo 17's "ir.actions.report handlers" registry
 * to intercept qweb-pdf report actions. Instead of the browser downloading
 * the file immediately, a full-screen preview dialog is shown first.
 *
 * The user can then Print, Download, or Close from the dialog.
 */

import { registry } from "@web/core/registry";
import { PreviewDialog } from "./preview_dialog";
import { downloadReport } from "@web/webclient/actions/reports/utils";

/**
 * Can this server actually produce a PDF?
 *
 * Reuses core's own cached promise (see downloadReport in
 * web/webclient/actions/reports/utils.js), so this costs no extra RPC beyond
 * the one core would make anyway.
 *
 * Takes `env` rather than importing `rpc`: the singleton imports
 * @web/core/user and @web/core/network/rpc arrived in Odoo 18. On 17 these
 * are still service-registry entries, so env.services.* is the idiom.
 */
async function canRenderPdf(env) {
    try {
        downloadReport.wkhtmltopdfStatusProm ||= env.services.rpc(
            "/report/check_wkhtmltopdf",
        );
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
    if (!(await canRenderPdf(env))) {
        return false;
    }

    const reportUrl = `/report/pdf/${action.report_name}/${activeIds.join(",")}`;

    env.services.dialog.add(PreviewDialog, {
        reportUrl,
        reportName: action.name || action.display_name || "",
        onDownload() {
            // In Odoo 17 both `user` and `rpc` are still service-registry
            // entries; the singleton imports arrived in 18.
            //
            // RETURN the promise: the dialog needs {success, message} so it
            // can surface a failure instead of closing over it.
            const ctx = { ...env.services.user.context, ...action.context };
            return downloadReport(env.services.rpc, action, "pdf", ctx);
        },
    });

    // Returning true tells core the report was handled.
    //
    // Unlike 18.0 and 19.0, Odoo 17 does NOTHING else here - its handler loop
    // is `if (result) { return result; }` (action_service.js:1085-1089), with
    // no onClose() call and no close_on_report_download branch. So the
    // early-close behaviour those series document as a known limitation does
    // not exist on this one, and must not be documented here.
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
