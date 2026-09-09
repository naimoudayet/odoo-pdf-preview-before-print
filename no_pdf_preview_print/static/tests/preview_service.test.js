// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { beforeEach, describe, expect, test } from "@odoo/hoot";
import { downloadReport } from "@web/webclient/actions/reports/utils";
import {
    getActiveIds,
    pdfPreviewHandler,
} from "@no_pdf_preview_print/js/preview_service";

describe("no_pdf_preview_print / getActiveIds", () => {
    test("returns context.active_ids array", () => {
        expect(getActiveIds({ context: { active_ids: [1, 2, 3] } })).toEqual([1, 2, 3]);
    });
    test("wraps context.active_id in an array", () => {
        expect(getActiveIds({ context: { active_id: 42 } })).toEqual([42]);
    });
    test("falls back to data.ids", () => {
        expect(getActiveIds({ data: { ids: [7, 8] } })).toEqual([7, 8]);
    });
    test("falls back to data.id", () => {
        expect(getActiveIds({ data: { id: 99 } })).toEqual([99]);
    });
    test("returns empty array when nothing present", () => {
        expect(getActiveIds({})).toEqual([]);
    });
    test("context.active_ids takes precedence over data.ids", () => {
        expect(
            getActiveIds({
                context: { active_ids: [1] },
                data: { ids: [99] },
            }),
        ).toEqual([1]);
    });
    test("empty active_ids falls through to data.ids", () => {
        expect(
            getActiveIds({
                context: { active_ids: [] },
                data: { ids: [7] },
            }),
        ).toEqual([7]);
    });
    test("empty data.ids falls through to data.id", () => {
        expect(getActiveIds({ data: { ids: [], id: 7 } })).toEqual([7]);
    });
    test("preserves order of IDs", () => {
        expect(getActiveIds({ context: { active_ids: [3, 1, 2] } })).toEqual([3, 1, 2]);
    });
    test("large IDs preserved without truncation", () => {
        expect(getActiveIds({ context: { active_ids: [999999999] } })).toEqual([
            999999999,
        ]);
    });
    test("null context does not crash", () => {
        expect(getActiveIds({ context: null, data: { id: 5 } })).toEqual([5]);
    });
});

describe("no_pdf_preview_print / pdfPreviewHandler", () => {
    // The handler asks core whether the server can render PDFs at all, reusing
    // core's own cached promise. Seed it so the specs never hit the network and
    // never leak a status between tests.
    beforeEach(() => {
        downloadReport.wkhtmltopdfStatusProm = Promise.resolve("ok");
    });

    function makeEnv() {
        const added = [];
        return {
            added,
            services: {
                dialog: {
                    add(Component, props) {
                        added.push({ Component, props });
                    },
                },
                user: { context: {} },
                rpc: () => Promise.resolve(),
                ui: { block() {}, unblock() {} },
            },
        };
    }

    test("returns false for qweb-html reports", async () => {
        const env = makeEnv();
        expect(
            await pdfPreviewHandler(
                { report_type: "qweb-html", report_name: "x" },
                {},
                env,
            ),
        ).toBe(false);
        expect(env.added.length).toBe(0);
    });
    test("returns false for qweb-text reports", async () => {
        const env = makeEnv();
        expect(
            await pdfPreviewHandler(
                { report_type: "qweb-text", report_name: "x" },
                {},
                env,
            ),
        ).toBe(false);
    });
    test("returns false when no IDs present", async () => {
        const env = makeEnv();
        expect(
            await pdfPreviewHandler(
                { report_type: "qweb-pdf", report_name: "x", context: {} },
                {},
                env,
            ),
        ).toBe(false);
        expect(env.added.length).toBe(0);
    });
    test("opens dialog for valid qweb-pdf action", async () => {
        const env = makeEnv();
        const rc = await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "sale.report_saleorder",
                context: { active_ids: [1, 2] },
            },
            {},
            env,
        );
        expect(rc).toBe(true);
        expect(env.added.length).toBe(1);
    });
    test("reportUrl contains the report_name", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "sale.report_saleorder",
                context: { active_ids: [5] },
            },
            {},
            env,
        );
        expect(env.added[0].props.reportUrl).toInclude("sale.report_saleorder");
    });
    test("reportUrl contains comma-joined IDs", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [5, 6, 7] },
            },
            {},
            env,
        );
        expect(env.added[0].props.reportUrl).toInclude("5,6,7");
    });
    test("reportName prop uses action.name", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                name: "Invoice",
                context: { active_ids: [1] },
            },
            {},
            env,
        );
        expect(env.added[0].props.reportName).toBe("Invoice");
    });
    test("reportName falls back to display_name", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                display_name: "Quotation",
                context: { active_ids: [1] },
            },
            {},
            env,
        );
        expect(env.added[0].props.reportName).toBe("Quotation");
    });
    test("reportName defaults to empty string", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [1] },
            },
            {},
            env,
        );
        expect(env.added[0].props.reportName).toBe("");
    });
    test("onDownload prop is a callable function", async () => {
        const env = makeEnv();
        await pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [1] },
            },
            {},
            env,
        );
        expect(typeof env.added[0].props.onDownload).toBe("function");
    });
    test("action without report_type is treated as qweb-pdf", async () => {
        const env = makeEnv();
        const rc = await pdfPreviewHandler(
            { report_name: "x", context: { active_ids: [1] } },
            {},
            env,
        );
        expect(rc).toBe(true);
        expect(env.added.length).toBe(1);
    });

    test("does not intercept when wkhtmltopdf is unavailable", async () => {
        // Core shows its own notification and falls back to the HTML report;
        // neither is reproducible from a handler, so we must stand aside.
        downloadReport.wkhtmltopdfStatusProm = Promise.resolve("install");
        const env = makeEnv();
        const rc = await pdfPreviewHandler(
            { report_type: "qweb-pdf", report_name: "x", context: { active_ids: [1] } },
            {},
            env,
        );
        expect(rc).toBe(false);
        expect(env.added.length).toBe(0);
    });

    test("still intercepts when wkhtmltopdf only needs an upgrade", async () => {
        downloadReport.wkhtmltopdfStatusProm = Promise.resolve("upgrade");
        const env = makeEnv();
        const rc = await pdfPreviewHandler(
            { report_type: "qweb-pdf", report_name: "x", context: { active_ids: [1] } },
            {},
            env,
        );
        expect(rc).toBe(true);
        expect(env.added.length).toBe(1);
    });

    test("intercepts anyway when the status probe fails", async () => {
        // A failed probe must not disable the module.
        downloadReport.wkhtmltopdfStatusProm = Promise.reject(new Error("offline"));
        const env = makeEnv();
        const rc = await pdfPreviewHandler(
            { report_type: "qweb-pdf", report_name: "x", context: { active_ids: [1] } },
            {},
            env,
        );
        expect(rc).toBe(true);
    });

    test("onDownload prop returns the downloadReport promise", async () => {
        // The dialog needs {success, message} to report a failure instead of
        // closing over it, so the prop must not fire-and-forget.
        const env = makeEnv();
        await pdfPreviewHandler(
            { report_type: "qweb-pdf", report_name: "x", context: { active_ids: [1] } },
            {},
            env,
        );
        const returned = env.added[0].props.onDownload();
        expect(returned instanceof Promise).toBe(true);
        await returned.catch(() => {});
    });
});
