/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import {
    getActiveIds,
    pdfPreviewHandler,
} from "@pdf_preview_print/js/preview_service";

QUnit.module("pdf_preview_print", {}, function () {
    QUnit.module("getActiveIds");

    QUnit.test("extracts from context.active_ids", function (assert) {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [1, 2, 3] } }),
            [1, 2, 3]
        );
    });

    QUnit.test("wraps context.active_id in an array", function (assert) {
        assert.deepEqual(getActiveIds({ context: { active_id: 42 } }), [42]);
    });

    QUnit.test("falls back to data.ids", function (assert) {
        assert.deepEqual(getActiveIds({ data: { ids: [7, 8] } }), [7, 8]);
    });

    QUnit.test("falls back to data.id", function (assert) {
        assert.deepEqual(getActiveIds({ data: { id: 99 } }), [99]);
    });

    QUnit.test("returns empty when nothing present", function (assert) {
        assert.deepEqual(getActiveIds({}), []);
    });

    QUnit.test("context.active_ids wins over data.ids", function (assert) {
        assert.deepEqual(
            getActiveIds({
                context: { active_ids: [1] },
                data: { ids: [99] },
            }),
            [1]
        );
    });

    QUnit.module("pdfPreviewHandler");

    function _env() {
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

    QUnit.test("returns false for non-qweb-pdf reports", function (assert) {
        const env = _env();
        const action = { report_type: "qweb-html", report_name: "x" };
        assert.strictEqual(pdfPreviewHandler(action, {}, env), false);
        assert.strictEqual(env.added.length, 0, "no dialog opened");
    });

    QUnit.test("returns false when no active IDs are present", function (assert) {
        const env = _env();
        const action = { report_type: "qweb-pdf", report_name: "x", context: {} };
        assert.strictEqual(pdfPreviewHandler(action, {}, env), false);
        assert.strictEqual(env.added.length, 0);
    });

    QUnit.test("opens dialog for valid qweb-pdf action", function (assert) {
        const env = _env();
        const action = {
            report_type: "qweb-pdf",
            report_name: "sale.report_saleorder",
            context: { active_ids: [1, 2] },
        };
        assert.strictEqual(pdfPreviewHandler(action, {}, env), true);
        assert.strictEqual(env.added.length, 1, "dialog opened once");
        const props = env.added[0].props;
        assert.ok(props.reportUrl, "dialog gets a reportUrl prop");
        assert.ok(
            props.reportUrl.includes("sale.report_saleorder"),
            "URL references the report name"
        );
        assert.strictEqual(
            typeof props.onDownload,
            "function",
            "dialog gets an onDownload callback"
        );
    });
});
