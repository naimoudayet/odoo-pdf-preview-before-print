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
    // a real browser. These specs pin the contentType check that replaced it.
    function makeDialog(contentType) {
        const d = Object.create(PreviewDialog.prototype);
        d.state = { loading: true, error: false, downloading: false };
        d.hotkey = { registerIframe() {} };
        d.iframeRef = {
            el: {
                contentDocument: contentType === undefined ? null : { contentType },
                contentWindow: {},
            },
        };
        return d;
    }

    test("an error page (text/html) is treated as a failure", () => {
        const d = makeDialog("text/html");
        d.onIframeLoad();
        expect(d.state.error).toBe(true);
        expect(d.state.loading).toBe(false);
    });

    test("a real PDF is not treated as a failure", () => {
        const d = makeDialog("application/pdf");
        d.onIframeLoad();
        expect(d.state.error).toBe(false);
        expect(d.state.loading).toBe(false);
    });

    test("an unreadable contentDocument fails OPEN", () => {
        // Firefox/Safari may not expose contentType for their PDF viewers; a
        // false error would be worse than showing the preview.
        const d = makeDialog(undefined);
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
