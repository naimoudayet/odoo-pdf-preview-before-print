/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { PreviewDialog } from "@no_pdf_preview_print/js/preview_dialog";

QUnit.module("no_pdf_preview_print / PreviewDialog - dialogTitle", {}, function () {
    QUnit.test("uses props.reportName when provided", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(
            PreviewDialog.prototype,
            "dialogTitle",
        );
        const title = desc.get.call({ props: { reportName: "Invoice 0001" } });
        assert.strictEqual(title, "Invoice 0001");
    });
    // These two are omitted on 18.0/19.0 because Hoot rejects `_t()` before the
    // translation service is initialized. QUnit has no such restriction, so
    // this series keeps the coverage it always had.
    QUnit.test("empty reportName triggers fallback branch", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(
            PreviewDialog.prototype,
            "dialogTitle",
        );
        const title = desc.get.call({ props: { reportName: "" } });
        assert.ok(
            typeof title === "string" && title.length > 0,
            "got non-empty fallback string: " + title,
        );
    });

    QUnit.test("hotkeyHintMarkup mentions the three keys", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(
            PreviewDialog.prototype,
            "hotkeyHintMarkup",
        );
        const s = String(desc.get.call({}));
        assert.ok(s.includes("<kbd>P</kbd>"), "mentions <kbd>P</kbd>");
        assert.ok(s.includes("<kbd>D</kbd>"), "mentions <kbd>D</kbd>");
        assert.ok(s.includes("<kbd>Esc</kbd>"), "mentions <kbd>Esc</kbd>");
    });
});

QUnit.module("no_pdf_preview_print / PreviewDialog - onPrint", {}, function () {
    QUnit.test("focuses and prints the iframe contentWindow", (assert) => {
        let focused = 0,
            printed = 0;
        const mock = {
            iframeRef: {
                el: {
                    contentWindow: {
                        focus() {
                            focused++;
                        },
                        print() {
                            printed++;
                        },
                    },
                },
            },
        };
        PreviewDialog.prototype.onPrint.call(mock);
        assert.strictEqual(focused, 1);
        assert.strictEqual(printed, 1);
    });
    QUnit.test("no-op when iframe element is null", (assert) => {
        PreviewDialog.prototype.onPrint.call({ iframeRef: { el: null } });
        assert.strictEqual(true, true);
    });
    QUnit.test("no-op when contentWindow is missing", (assert) => {
        PreviewDialog.prototype.onPrint.call({
            iframeRef: { el: { contentWindow: null } },
        });
        assert.strictEqual(true, true);
    });
});

QUnit.module("no_pdf_preview_print / PreviewDialog - onDownload", {}, function () {
    QUnit.test("calls props.onDownload then props.close in order", async (assert) => {
        // onDownload awaits the download result now, so the ordering only
        // holds once the promise settles.
        const order = [];
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading: false, error: false, downloading: false };
        d.notification = { add() {} };
        d.props = {
            onDownload() {
                order.push("download");
                return Promise.resolve({ success: true });
            },
            close() {
                order.push("close");
            },
        };
        await d.onDownload();
        assert.deepEqual(order, ["download", "close"]);
    });
});

QUnit.module(
    "no_pdf_preview_print / PreviewDialog - iframe lifecycle",
    {},
    function () {
        // Prototype instances rather than bare mocks: onIframeLoad delegates to
        // isPdfDocument, and `.call({...})` cannot reach a sibling method.
        function makeDialog(el) {
            const d = Object.create(PreviewDialog.prototype);
            d.state = { loading: true, error: false, downloading: false };
            d.iframeRef = { el };
            d.hotkey = { registerIframe() {} };
            return d;
        }

        QUnit.test("onIframeLoad clears loading flag", (assert) => {
            const d = makeDialog(null);
            d.onIframeLoad();
            assert.strictEqual(d.state.loading, false);
        });

        QUnit.test(
            "onIframeLoad registers the iframe with the hotkey service",
            (assert) => {
                let registered = null;
                const fakeIframe = {
                    contentWindow: {},
                    contentDocument: { contentType: "application/pdf" },
                };
                const d = makeDialog(fakeIframe);
                d.hotkey = {
                    registerIframe(iframe) {
                        registered = iframe;
                    },
                };
                d.onIframeLoad();
                assert.strictEqual(registered, fakeIframe);
            },
        );

        QUnit.test("onIframeLoad swallows registerIframe errors", (assert) => {
            const d = makeDialog({
                contentWindow: {},
                contentDocument: { contentType: "application/pdf" },
            });
            d.hotkey = {
                registerIframe() {
                    throw new Error("boom");
                },
            };
            d.onIframeLoad();
            assert.strictEqual(d.state.loading, false);
        });

        QUnit.test("onIframeError sets error and clears loading", (assert) => {
            const d = makeDialog(null);
            d.onIframeError();
            assert.strictEqual(d.state.loading, false);
            assert.strictEqual(d.state.error, true);
        });
    },
);

QUnit.module("no_pdf_preview_print / PreviewDialog - error detection", {}, function () {
    // An iframe fires `load` even for a 4xx/5xx, so onIframeError never runs in
    // a real browser. These specs pin the check that replaced it, against the
    // four cases measured on live Chrome and Firefox:
    //
    //   engine   healthy: href / contentType     error: href / contentType
    //   Chrome   report URL / application/pdf    report URL / text/html
    //   Firefox  about:blank / text/html         report URL / text/html
    const URL = "http://localhost:2019/report/pdf/sale.report_saleorder_raw/7";

    function makeDialog(doc) {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading: true, error: false, downloading: false };
        d.hotkey = { registerIframe() {} };
        d.iframeRef = { el: { contentDocument: doc, contentWindow: {} } };
        return d;
    }
    const chromePdf = () =>
        makeDialog({ contentType: "application/pdf", location: { href: URL } });
    const chromeErr = () =>
        makeDialog({ contentType: "text/html", location: { href: URL } });
    const firefoxPdf = () =>
        makeDialog({ contentType: "text/html", location: { href: "about:blank" } });
    const firefoxErr = () =>
        makeDialog({ contentType: "text/html", location: { href: URL } });

    QUnit.test("Chrome: an error page at the report URL is a failure", (assert) => {
        const d = chromeErr();
        d.onIframeLoad();
        assert.strictEqual(d.state.error, true);
        assert.strictEqual(d.state.loading, false);
    });

    QUnit.test("Chrome: a real PDF is not a failure", (assert) => {
        const d = chromePdf();
        d.onIframeLoad();
        assert.strictEqual(d.state.error, false);
        assert.strictEqual(d.state.loading, false);
    });

    QUnit.test("Firefox: an error page at the report URL is a failure", (assert) => {
        const d = firefoxErr();
        d.onIframeLoad();
        assert.strictEqual(d.state.error, true);
    });

    QUnit.test(
        "Firefox: a healthy PDF left on about:blank is NOT a failure",
        (assert) => {
            // The regression this guards: Firefox reports text/html for a document
            // it never navigated, so a bare "not application/pdf" test would flag
            // every healthy report in Firefox as broken.
            const d = firefoxPdf();
            d.onIframeLoad();
            assert.strictEqual(d.state.error, false);
            assert.strictEqual(d.state.loading, false);
        },
    );

    QUnit.test("a null contentDocument fails OPEN", (assert) => {
        const d = makeDialog(null);
        d.onIframeLoad();
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("a document with no location fails OPEN", (assert) => {
        const d = makeDialog({ contentType: "text/html" });
        d.onIframeLoad();
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("a throwing contentDocument fails OPEN", (assert) => {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading: true, error: false, downloading: false };
        d.hotkey = { registerIframe() {} };
        d.iframeRef = {
            el: {
                get contentDocument() {
                    throw new Error("cross-origin");
                },
                contentWindow: {},
            },
        };
        d.onIframeLoad();
        assert.strictEqual(d.state.error, false);
    });
});

QUnit.module("no_pdf_preview_print / PreviewDialog - settle fallback", {}, function () {
    // Firefox never fires `load` for a PDF it renders natively, so the spinner
    // would never clear. onSettleTimeout is the fallback.
    function makeDialog(doc, loading = true) {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading, error: false, downloading: false };
        d.hotkey = { registerIframe() {} };
        d.iframeRef = { el: { contentDocument: doc, contentWindow: {} } };
        return d;
    }

    QUnit.test("clears the spinner when the iframe stayed silent", (assert) => {
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "about:blank" },
        });
        d.onSettleTimeout();
        assert.strictEqual(d.state.loading, false);
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("does not invent an error for a silent iframe", (assert) => {
        const d = makeDialog(null);
        d.onSettleTimeout();
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("still reports an error page that had already arrived", (assert) => {
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "http://x/report/pdf/no_such.report/1" },
        });
        d.onSettleTimeout();
        assert.strictEqual(d.state.error, true);
    });

    QUnit.test("is a no-op once loading has already cleared", (assert) => {
        const d = makeDialog(
            { contentType: "text/html", location: { href: "http://x/err" } },
            false,
        );
        d.onSettleTimeout();
        // onIframeLoad already ran and made the call; the timer must not
        // second-guess it.
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("a late error page still flags through onIframeLoad", (assert) => {
        // Timer fires first on a slow server, THEN the 500 arrives.
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "about:blank" },
        });
        d.onSettleTimeout();
        assert.strictEqual(d.state.error, false);
        d.iframeRef.el.contentDocument = {
            contentType: "text/html",
            location: { href: "http://x/report/pdf/slow.report/1" },
        };
        d.onIframeLoad();
        assert.strictEqual(d.state.error, true);
    });
});

QUnit.module("no_pdf_preview_print / PreviewDialog - download result", {}, function () {
    function makeDialog(onDownload) {
        const d = Object.create(PreviewDialog.prototype);
        const notes = [];
        d.state = { loading: false, error: false, downloading: false };
        d.notification = { add: (msg, opts) => notes.push({ msg, opts }) };
        d.closed = 0;
        d.props = { onDownload, close: () => (d.closed += 1) };
        d.notes = notes;
        return d;
    }

    QUnit.test("closes on success", async (assert) => {
        const d = makeDialog(() => Promise.resolve({ success: true }));
        await d.onDownload();
        assert.strictEqual(d.closed, 1);
        assert.strictEqual(d.state.error, false);
    });

    QUnit.test("stays open and flags an error on failure", async (assert) => {
        // Previously the dialog closed regardless, so a failed download looked
        // exactly like a successful one.
        const d = makeDialog(() => Promise.resolve({ success: false }));
        await d.onDownload();
        assert.strictEqual(d.closed, 0);
        assert.strictEqual(d.state.error, true);
    });

    QUnit.test(
        "surfaces the wkhtmltopdf message as a sticky notification",
        async (assert) => {
            const d = makeDialog(() =>
                Promise.resolve({ success: false, message: "wkhtmltopdf missing" }),
            );
            await d.onDownload();
            assert.strictEqual(d.notes.length, 1);
            assert.strictEqual(d.notes[0].msg, "wkhtmltopdf missing");
            assert.strictEqual(d.notes[0].opts.sticky, true);
        },
    );

    QUnit.test("a rejected download does not close the dialog", async (assert) => {
        const d = makeDialog(() => Promise.reject(new Error("boom")));
        await d.onDownload();
        assert.strictEqual(d.closed, 0);
        assert.strictEqual(d.state.error, true);
    });

    QUnit.test("a handler returning nothing is treated as success", async (assert) => {
        const d = makeDialog(() => undefined);
        await d.onDownload();
        assert.strictEqual(d.closed, 1);
    });

    QUnit.test(
        "ignores a second click while one download is in flight",
        async (assert) => {
            let calls = 0;
            const d = makeDialog(() => {
                calls += 1;
                return new Promise((r) => setTimeout(() => r({ success: true }), 20));
            });
            const first = d.onDownload();
            await d.onDownload();
            await first;
            assert.strictEqual(calls, 1);
        },
    );
});
