// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { describe, expect, test } from "@odoo/hoot";
import { PreviewDialog } from "@no_pdf_preview_print/js/preview_dialog";

describe("no_pdf_preview_print / PreviewDialog - dialogTitle", () => {
    test("uses props.reportName when provided", () => {
        const desc = Object.getOwnPropertyDescriptor(
            PreviewDialog.prototype,
            "dialogTitle",
        );
        const title = desc.get.call({ props: { reportName: "Invoice 0001" } });
        expect(title).toBe("Invoice 0001");
    });
    // Empty-reportName fallback hits `_t("PDF Preview")`; in Hoot's pre-mount
    // context the translation service throws ("translation error"). That branch
    // is covered by the actual component render in browser usage — not worth
    // mocking the translation service here.
});

// hotkeyHintMarkup unit-tests are intentionally omitted on v18+: the getter
// is `markup(_t("<kbd>P</kbd> Print · …"))`, and Hoot rejects `_t()` calls
// before the translation service is initialized. The integration is exercised
// at component mount time during full-stack QA. The getter is a one-line
// pass-through; isolated unit value is minimal.

describe("no_pdf_preview_print / PreviewDialog - onPrint", () => {
    test("focuses and prints the iframe contentWindow", () => {
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
        expect(focused).toBe(1);
        expect(printed).toBe(1);
    });
    test("no-op when iframe element is null", () => {
        PreviewDialog.prototype.onPrint.call({ iframeRef: { el: null } });
        expect(true).toBe(true);
    });
    test("no-op when contentWindow is missing", () => {
        PreviewDialog.prototype.onPrint.call({
            iframeRef: { el: { contentWindow: null } },
        });
        expect(true).toBe(true);
    });
});

describe("no_pdf_preview_print / PreviewDialog - onDownload", () => {
    test("calls props.onDownload then props.close in order", async () => {
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
        expect(order).toEqual(["download", "close"]);
    });
});

describe("no_pdf_preview_print / PreviewDialog - iframe lifecycle", () => {
    // Prototype instances rather than bare mocks: onIframeLoad delegates to
    // isPdfDocument, and `.call({...})` cannot reach a sibling method.
    function makeDialog(el) {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading: true, error: false, downloading: false };
        d.iframeRef = { el };
        d.hotkey = { registerIframe() {} };
        return d;
    }

    test("onIframeLoad clears loading flag", () => {
        const d = makeDialog(null);
        d.onIframeLoad();
        expect(d.state.loading).toBe(false);
    });

    test("onIframeLoad registers the iframe with the hotkey service", () => {
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
        expect(registered).toBe(fakeIframe);
    });

    test("onIframeLoad swallows registerIframe errors", () => {
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
        expect(d.state.loading).toBe(false);
    });

    test("onIframeError sets error and clears loading", () => {
        const d = makeDialog(null);
        d.onIframeError();
        expect(d.state.loading).toBe(false);
        expect(d.state.error).toBe(true);
    });
});

describe("no_pdf_preview_print / PreviewDialog - error detection", () => {
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

    test("Chrome: an error page at the report URL is a failure", () => {
        const d = chromeErr();
        d.onIframeLoad();
        expect(d.state.error).toBe(true);
        expect(d.state.loading).toBe(false);
    });

    test("Chrome: a real PDF is not a failure", () => {
        const d = chromePdf();
        d.onIframeLoad();
        expect(d.state.error).toBe(false);
        expect(d.state.loading).toBe(false);
    });

    test("Firefox: an error page at the report URL is a failure", () => {
        const d = firefoxErr();
        d.onIframeLoad();
        expect(d.state.error).toBe(true);
    });

    test("Firefox: a healthy PDF left on about:blank is NOT a failure", () => {
        // The regression this guards: Firefox reports text/html for a document
        // it never navigated, so a bare "not application/pdf" test would flag
        // every healthy report in Firefox as broken.
        const d = firefoxPdf();
        d.onIframeLoad();
        expect(d.state.error).toBe(false);
        expect(d.state.loading).toBe(false);
    });

    test("a null contentDocument fails OPEN", () => {
        const d = makeDialog(null);
        d.onIframeLoad();
        expect(d.state.error).toBe(false);
    });

    test("a document with no location fails OPEN", () => {
        const d = makeDialog({ contentType: "text/html" });
        d.onIframeLoad();
        expect(d.state.error).toBe(false);
    });

    test("a throwing contentDocument fails OPEN", () => {
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
        expect(d.state.error).toBe(false);
    });
});

describe("no_pdf_preview_print / PreviewDialog - settle fallback", () => {
    // Firefox never fires `load` for a PDF it renders natively, so the spinner
    // would never clear. onSettleTimeout is the fallback.
    function makeDialog(doc, loading = true) {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading, error: false, downloading: false };
        d.hotkey = { registerIframe() {} };
        d.iframeRef = { el: { contentDocument: doc, contentWindow: {} } };
        return d;
    }

    test("clears the spinner when the iframe stayed silent", () => {
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "about:blank" },
        });
        d.onSettleTimeout();
        expect(d.state.loading).toBe(false);
        expect(d.state.error).toBe(false);
    });

    test("does not invent an error for a silent iframe", () => {
        const d = makeDialog(null);
        d.onSettleTimeout();
        expect(d.state.error).toBe(false);
    });

    test("still reports an error page that had already arrived", () => {
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "http://x/report/pdf/no_such.report/1" },
        });
        d.onSettleTimeout();
        expect(d.state.error).toBe(true);
    });

    test("is a no-op once loading has already cleared", () => {
        const d = makeDialog(
            { contentType: "text/html", location: { href: "http://x/err" } },
            false,
        );
        d.onSettleTimeout();
        // onIframeLoad already ran and made the call; the timer must not
        // second-guess it.
        expect(d.state.error).toBe(false);
    });

    test("a late error page still flags through onIframeLoad", () => {
        // Timer fires first on a slow server, THEN the 500 arrives.
        const d = makeDialog({
            contentType: "text/html",
            location: { href: "about:blank" },
        });
        d.onSettleTimeout();
        expect(d.state.error).toBe(false);
        d.iframeRef.el.contentDocument = {
            contentType: "text/html",
            location: { href: "http://x/report/pdf/slow.report/1" },
        };
        d.onIframeLoad();
        expect(d.state.error).toBe(true);
    });
});

describe("no_pdf_preview_print / PreviewDialog - download result", () => {
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

    test("closes on success", async () => {
        const d = makeDialog(() => Promise.resolve({ success: true }));
        await d.onDownload();
        expect(d.closed).toBe(1);
        expect(d.state.error).toBe(false);
    });

    test("stays open and flags an error on failure", async () => {
        // Previously the dialog closed regardless, so a failed download looked
        // exactly like a successful one.
        const d = makeDialog(() => Promise.resolve({ success: false }));
        await d.onDownload();
        expect(d.closed).toBe(0);
        expect(d.state.error).toBe(true);
    });

    test("surfaces the wkhtmltopdf message as a sticky notification", async () => {
        const d = makeDialog(() =>
            Promise.resolve({ success: false, message: "wkhtmltopdf missing" }),
        );
        await d.onDownload();
        expect(d.notes.length).toBe(1);
        expect(d.notes[0].msg).toBe("wkhtmltopdf missing");
        expect(d.notes[0].opts.sticky).toBe(true);
    });

    test("a rejected download does not close the dialog", async () => {
        const d = makeDialog(() => Promise.reject(new Error("boom")));
        await d.onDownload();
        expect(d.closed).toBe(0);
        expect(d.state.error).toBe(true);
    });

    test("a handler returning nothing is treated as success", async () => {
        const d = makeDialog(() => undefined);
        await d.onDownload();
        expect(d.closed).toBe(1);
    });

    test("ignores a second click while one download is in flight", async () => {
        let calls = 0;
        const d = makeDialog(() => {
            calls += 1;
            return new Promise((r) => setTimeout(() => r({ success: true }), 20));
        });
        const first = d.onDownload();
        await d.onDownload();
        await first;
        expect(calls).toBe(1);
    });
});
