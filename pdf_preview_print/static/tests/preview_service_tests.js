/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import {
    getActiveIds,
    pdfPreviewHandler,
} from "@pdf_preview_print/js/preview_service";

QUnit.module("pdf_preview_print / preview_service", {}, function () {
    // -------------------------------------------------------------------
    QUnit.module("getActiveIds");

    QUnit.test("returns context.active_ids array", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [1, 2, 3] } }),
            [1, 2, 3]
        );
    });
    QUnit.test("wraps context.active_id in an array", (assert) => {
        assert.deepEqual(getActiveIds({ context: { active_id: 42 } }), [42]);
    });
    QUnit.test("falls back to data.ids", (assert) => {
        assert.deepEqual(getActiveIds({ data: { ids: [7, 8] } }), [7, 8]);
    });
    QUnit.test("falls back to data.id", (assert) => {
        assert.deepEqual(getActiveIds({ data: { id: 99 } }), [99]);
    });
    QUnit.test("returns [] when nothing present", (assert) => {
        assert.deepEqual(getActiveIds({}), []);
    });
    QUnit.test("context.active_ids takes precedence over data.ids", (assert) => {
        assert.deepEqual(
            getActiveIds({
                context: { active_ids: [1] },
                data: { ids: [99] },
            }),
            [1]
        );
    });
    QUnit.test("empty active_ids array falls through to data.ids", (assert) => {
        assert.deepEqual(
            getActiveIds({
                context: { active_ids: [] },
                data: { ids: [7] },
            }),
            [7]
        );
    });
    QUnit.test("empty data.ids falls through to data.id", (assert) => {
        assert.deepEqual(
            getActiveIds({ data: { ids: [], id: 7 } }),
            [7]
        );
    });
    QUnit.test("preserves order of IDs", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [3, 1, 2] } }),
            [3, 1, 2]
        );
    });
    QUnit.test("large IDs preserved without truncation", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [999999999] } }),
            [999999999]
        );
    });
    QUnit.test("null context does not crash", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: null, data: { id: 5 } }),
            [5]
        );
    });

    // -------------------------------------------------------------------
    QUnit.module("pdfPreviewHandler");

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

    QUnit.test("returns false for qweb-html reports", (assert) => {
        const env = makeEnv();
        assert.strictEqual(
            pdfPreviewHandler({ report_type: "qweb-html", report_name: "x" }, {}, env),
            false
        );
        assert.strictEqual(env.added.length, 0, "no dialog opened");
    });
    QUnit.test("returns false for qweb-text reports", (assert) => {
        const env = makeEnv();
        assert.strictEqual(
            pdfPreviewHandler({ report_type: "qweb-text", report_name: "x" }, {}, env),
            false
        );
    });
    QUnit.test("returns false when no IDs present", (assert) => {
        const env = makeEnv();
        assert.strictEqual(
            pdfPreviewHandler(
                { report_type: "qweb-pdf", report_name: "x", context: {} },
                {},
                env
            ),
            false
        );
        assert.strictEqual(env.added.length, 0);
    });
    QUnit.test("opens dialog for valid qweb-pdf action", (assert) => {
        const env = makeEnv();
        const rc = pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "sale.report_saleorder",
                context: { active_ids: [1, 2] },
            },
            {},
            env
        );
        assert.strictEqual(rc, true);
        assert.strictEqual(env.added.length, 1, "exactly one dialog opened");
    });
    QUnit.test("reportUrl contains the report_name", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "sale.report_saleorder",
                context: { active_ids: [5] },
            },
            {},
            env
        );
        assert.ok(
            env.added[0].props.reportUrl.includes("sale.report_saleorder"),
            "URL: " + env.added[0].props.reportUrl
        );
    });
    QUnit.test("reportUrl contains comma-joined IDs", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [5, 6, 7] },
            },
            {},
            env
        );
        const url = env.added[0].props.reportUrl;
        // v16 may URL-encode the comma in the query string path, so accept both
        assert.ok(
            url.includes("5,6,7") || url.includes("5%2C6%2C7"),
            "URL: " + url
        );
    });
    QUnit.test("reportName prop uses action.name", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                name: "Invoice",
                context: { active_ids: [1] },
            },
            {},
            env
        );
        assert.strictEqual(env.added[0].props.reportName, "Invoice");
    });
    QUnit.test("reportName falls back to display_name", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                display_name: "Quotation",
                context: { active_ids: [1] },
            },
            {},
            env
        );
        assert.strictEqual(env.added[0].props.reportName, "Quotation");
    });
    QUnit.test("reportName defaults to empty string", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [1] },
            },
            {},
            env
        );
        assert.strictEqual(env.added[0].props.reportName, "");
    });
    QUnit.test("onDownload prop is a callable function", (assert) => {
        const env = makeEnv();
        pdfPreviewHandler(
            {
                report_type: "qweb-pdf",
                report_name: "x",
                context: { active_ids: [1] },
            },
            {},
            env
        );
        assert.strictEqual(typeof env.added[0].props.onDownload, "function");
    });
    QUnit.test("action without report_type is treated as qweb-pdf", (assert) => {
        // if `action.report_type` is undefined, the guard falls through → handler runs
        const env = makeEnv();
        const rc = pdfPreviewHandler(
            { report_name: "x", context: { active_ids: [1] } },
            {},
            env
        );
        assert.strictEqual(rc, true);
        assert.strictEqual(env.added.length, 1);
    });
});
