/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import {
    getActiveIds,
    getReportUrl,
    pdfPreviewHandler,
    wkhtmltopdfCache,
} from "@no_pdf_preview_print/js/preview_service";

QUnit.module("no_pdf_preview_print / getActiveIds", {}, function () {
    QUnit.test("returns context.active_ids array", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [1, 2, 3] } }),
            [1, 2, 3],
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
    QUnit.test("returns empty array when nothing present", (assert) => {
        assert.deepEqual(getActiveIds({}), []);
    });
    QUnit.test("context.active_ids takes precedence over data.ids", (assert) => {
        assert.deepEqual(
            getActiveIds({
                context: { active_ids: [1] },
                data: { ids: [99] },
            }),
            [1],
        );
    });
    QUnit.test("empty active_ids falls through to data.ids", (assert) => {
        assert.deepEqual(
            getActiveIds({
                context: { active_ids: [] },
                data: { ids: [7] },
            }),
            [7],
        );
    });
    QUnit.test("empty data.ids falls through to data.id", (assert) => {
        assert.deepEqual(getActiveIds({ data: { ids: [], id: 7 } }), [7]);
    });
    QUnit.test("preserves order of IDs", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [3, 1, 2] } }),
            [3, 1, 2],
        );
    });
    QUnit.test("large IDs preserved without truncation", (assert) => {
        assert.deepEqual(
            getActiveIds({ context: { active_ids: [999999999] } }),
            [999999999],
        );
    });
    QUnit.test("null context does not crash", (assert) => {
        assert.deepEqual(getActiveIds({ context: null, data: { id: 5 } }), [5]);
    });
});

QUnit.module(
    "no_pdf_preview_print / pdfPreviewHandler",
    {
        beforeEach() {
            wkhtmltopdfCache.prom = Promise.resolve("ok");
        },
    },
    function () {
        // The handler asks core whether the server can render PDFs at all, reusing
        // core's own cached promise. Seed it so the specs never hit the network and
        // never leak a status between tests.
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

        QUnit.test("returns false for qweb-html reports", async (assert) => {
            const env = makeEnv();
            assert.strictEqual(
                await pdfPreviewHandler(
                    { report_type: "qweb-html", report_name: "x" },
                    {},
                    env,
                ),
                false,
            );
            assert.strictEqual(env.added.length, 0);
        });
        QUnit.test("returns false for qweb-text reports", async (assert) => {
            const env = makeEnv();
            assert.strictEqual(
                await pdfPreviewHandler(
                    { report_type: "qweb-text", report_name: "x" },
                    {},
                    env,
                ),
                false,
            );
        });
        QUnit.test("returns false when no IDs present", async (assert) => {
            const env = makeEnv();
            assert.strictEqual(
                await pdfPreviewHandler(
                    { report_type: "qweb-pdf", report_name: "x", context: {} },
                    {},
                    env,
                ),
                false,
            );
            assert.strictEqual(env.added.length, 0);
        });
        QUnit.test("opens dialog for valid qweb-pdf action", async (assert) => {
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
            assert.strictEqual(rc, true);
            assert.strictEqual(env.added.length, 1);
        });
        QUnit.test("reportUrl contains the report_name", async (assert) => {
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
            assert.ok(env.added[0].props.reportUrl.includes("sale.report_saleorder"));
        });
        QUnit.test("reportUrl contains comma-joined IDs", async (assert) => {
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
            assert.ok(env.added[0].props.reportUrl.includes("5,6,7"));
        });
        QUnit.test("reportName prop uses action.name", async (assert) => {
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
            assert.strictEqual(env.added[0].props.reportName, "Invoice");
        });
        QUnit.test("reportName falls back to display_name", async (assert) => {
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
            assert.strictEqual(env.added[0].props.reportName, "Quotation");
        });
        QUnit.test("reportName defaults to empty string", async (assert) => {
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
            assert.strictEqual(env.added[0].props.reportName, "");
        });
        QUnit.test("onDownload prop is a callable function", async (assert) => {
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
            assert.strictEqual(typeof env.added[0].props.onDownload, "function");
        });
        QUnit.test(
            "action without report_type is treated as qweb-pdf",
            async (assert) => {
                const env = makeEnv();
                const rc = await pdfPreviewHandler(
                    { report_name: "x", context: { active_ids: [1] } },
                    {},
                    env,
                );
                assert.strictEqual(rc, true);
                assert.strictEqual(env.added.length, 1);
            },
        );

        QUnit.test(
            "does not intercept when wkhtmltopdf is unavailable",
            async (assert) => {
                // Core shows its own notification and falls back to the HTML report;
                // neither is reproducible from a handler, so we must stand aside.
                wkhtmltopdfCache.prom = Promise.resolve("install");
                const env = makeEnv();
                const rc = await pdfPreviewHandler(
                    {
                        report_type: "qweb-pdf",
                        report_name: "x",
                        context: { active_ids: [1] },
                    },
                    {},
                    env,
                );
                assert.strictEqual(rc, false);
                assert.strictEqual(env.added.length, 0);
            },
        );

        QUnit.test(
            "still intercepts when wkhtmltopdf only needs an upgrade",
            async (assert) => {
                wkhtmltopdfCache.prom = Promise.resolve("upgrade");
                const env = makeEnv();
                const rc = await pdfPreviewHandler(
                    {
                        report_type: "qweb-pdf",
                        report_name: "x",
                        context: { active_ids: [1] },
                    },
                    {},
                    env,
                );
                assert.strictEqual(rc, true);
                assert.strictEqual(env.added.length, 1);
            },
        );

        QUnit.test("intercepts anyway when the status probe fails", async (assert) => {
            // A failed probe must not disable the module.
            wkhtmltopdfCache.prom = Promise.reject(new Error("offline"));
            const env = makeEnv();
            const rc = await pdfPreviewHandler(
                {
                    report_type: "qweb-pdf",
                    report_name: "x",
                    context: { active_ids: [1] },
                },
                {},
                env,
            );
            assert.strictEqual(rc, true);
        });

        QUnit.test("onDownload prop returns a result object", async (assert) => {
            // The dialog needs {success, message} to report a failure instead of
            // closing over it, so the prop must not fire-and-forget.
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
            const returned = env.added[0].props.onDownload();
            assert.strictEqual(returned instanceof Promise, true);
            await returned.catch(() => {});
        });
    },
);

// Odoo 16 exports no getReportUrl of its own, so this module ships one and
// therefore owns its coverage. 17+ get the helper from core and these specs
// do not exist on those branches.
QUnit.module("no_pdf_preview_print / getReportUrl (v16)", {}, function () {
    QUnit.test("simple path when action.data is empty ({})", (assert) => {
        const url = getReportUrl(
            {
                report_name: "sale.report_saleorder",
                context: { active_ids: [1, 2] },
                data: {},
            },
            "pdf",
            {},
        );
        assert.strictEqual(url, "/report/pdf/sale.report_saleorder/1,2");
    });
    QUnit.test("simple path when action.data is missing", (assert) => {
        const url = getReportUrl(
            {
                report_name: "x.report",
                context: { active_ids: [5] },
            },
            "pdf",
            {},
        );
        assert.strictEqual(url, "/report/pdf/x.report/5");
    });
    QUnit.test("simple path without active_ids has no /IDS segment", (assert) => {
        const url = getReportUrl(
            { report_name: "x.report", context: {}, data: {} },
            "pdf",
            {},
        );
        assert.strictEqual(url, "/report/pdf/x.report");
    });
    QUnit.test("query-string path when action.data is non-empty", (assert) => {
        const url = getReportUrl(
            {
                report_name: "account.report_invoice",
                context: { active_ids: [5] },
                data: { lang: "en_US" },
            },
            "pdf",
            {},
        );
        assert.ok(url.startsWith("/report/pdf/account.report_invoice?"), "URL: " + url);
        assert.ok(url.includes("options="), "URL has options= key");
        assert.ok(url.includes("context="), "URL has context= key");
    });
    QUnit.test("type arg is respected in the path segment", (assert) => {
        const url = getReportUrl(
            { report_name: "x.report", context: { active_ids: [1] }, data: {} },
            "text",
            {},
        );
        assert.strictEqual(url, "/report/text/x.report/1");
    });
});
