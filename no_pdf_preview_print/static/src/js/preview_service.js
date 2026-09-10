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
 */

import { registry } from "@web/core/registry";
import { download } from "@web/core/network/download";
import { PreviewDialog } from "./preview_dialog";

/**
 * Odoo 16 has no web/webclient/actions/reports/utils.js at all - no
 * downloadReport, no getReportUrl, and its wkhtmltopdf probe lives in a
 * closure inside the action-service factory (action_service.js:1144) rather
 * than on an exported function the way downloadReport.wkhtmltopdfStatusProm
 * does from 17 onwards. There is nothing to reuse, so cache our own: one
 * extra RPC per browser session, and only ever for PDF reports.
 * Exported as an object rather than a bare variable so tests can seed and
 * reset it, which is exactly why core hangs its own copy off the
 * downloadReport function ("we can reset it between tests to test multiple
 * statuses" - utils.js, 17+).
 */
export const wkhtmltopdfCache = { prom: null };

async function canRenderPdf(env) {
    try {
        wkhtmltopdfCache.prom ||= env.services.rpc("/report/check_wkhtmltopdf");
        const status = await wkhtmltopdfCache.prom;
        return ["ok", "upgrade"].includes(status);
    } catch {
        // Status unknown: assume it works rather than disabling the module
        // over a failed probe.
        return true;
    }
}

/**
 * Extract record IDs from the various places Odoo puts them.
 */
export function getActiveIds(action) {
    const ctx = action.context || {};
    if (ctx.active_ids && ctx.active_ids.length) {
        return ctx.active_ids;
    }
    if (ctx.active_id) {
        return [ctx.active_id];
    }
    if (action.data && action.data.ids && action.data.ids.length) {
        return action.data.ids;
    }
    if (action.data && action.data.id) {
        return [action.data.id];
    }
    return [];
}

/**
 * Build the report URL.
 *
 * Kept local because Odoo 16 exports no equivalent. It mirrors what core does
 * internally: a report carrying `action.data` (a wizard passing options) needs
 * the query-string form, everything else the plain /IDS path.
 */
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

export async function pdfPreviewHandler(action, options, env) {
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

    // If the server cannot render PDFs, do NOT intercept. Core's own path
    // shows the wkhtmltopdf notification and falls back to the HTML report,
    // and neither is reproducible from here: _executeReportClientAction is a
    // closure inside the action-service factory, not an export. Previewing
    // anyway would show a 500 page and leave Download doing nothing at all.
    if (!(await canRenderPdf(env))) {
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
                return { success: true };
            } catch {
                // 17+ get {success, message} from core's downloadReport. On 16
                // download() rejects instead, so convert to the shape the
                // dialog expects. No message: the only failures that reach
                // here are transport-level, and a raw exception string is not
                // something to put in front of a user.
                return { success: false };
            } finally {
                env.services.ui.unblock();
            }
        },
    });

    // Returning true tells core the report was handled.
    //
    // Unlike 18.0 and 19.0, Odoo 16 does NOTHING else here - its handler loop
    // is `if (result) { return result; }` (action_service.js:1133-1138), with
    // no onClose() call and no close_on_report_download branch. So the
    // early-close behaviour those series document as a known limitation does
    // not exist on this one, and must not be documented here.
    return true;
}

registry
    .category("ir.actions.report handlers")
    .add("no_pdf_preview_print", pdfPreviewHandler);
