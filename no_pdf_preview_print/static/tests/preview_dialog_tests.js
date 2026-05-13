/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { PreviewDialog } from "@no_pdf_preview_print/js/preview_dialog";

QUnit.module("no_pdf_preview_print / PreviewDialog", {}, function () {

    QUnit.module("dialogTitle getter");
    QUnit.test("uses props.reportName when provided", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(PreviewDialog.prototype, "dialogTitle");
        const title = desc.get.call({ props: { reportName: "Invoice 0001" } });
        assert.strictEqual(title, "Invoice 0001");
    });
    QUnit.test("empty reportName triggers fallback branch", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(PreviewDialog.prototype, "dialogTitle");
        const title = desc.get.call({ props: { reportName: "" } });
        assert.ok(typeof title === "string" && title.length > 0, "got non-empty fallback string: " + title);
    });

    QUnit.module("hotkeyHintMarkup getter");
    QUnit.test("returns a markup-wrapped string mentioning the three keys", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(PreviewDialog.prototype, "hotkeyHintMarkup");
        const result = desc.get.call({});
        // markup() returns a String wrapper (or similar) — coerce to plain string for matching
        const s = String(result);
        assert.ok(s.includes("<kbd>P</kbd>"), "mentions <kbd>P</kbd>");
        assert.ok(s.includes("<kbd>D</kbd>"), "mentions <kbd>D</kbd>");
        assert.ok(s.includes("<kbd>Esc</kbd>"), "mentions <kbd>Esc</kbd>");
    });

    QUnit.module("onPrint");
    QUnit.test("focuses and prints the iframe contentWindow", (assert) => {
        let focused = 0, printed = 0;
        const mock = {
            iframeRef: { el: { contentWindow: {
                focus() { focused++; },
                print() { printed++; },
            } } },
        };
        PreviewDialog.prototype.onPrint.call(mock);
        assert.strictEqual(focused, 1);
        assert.strictEqual(printed, 1);
    });
    QUnit.test("no-op when iframe element is null", (assert) => {
        const mock = { iframeRef: { el: null } };
        PreviewDialog.prototype.onPrint.call(mock);
        assert.ok(true, "did not throw");
    });
    QUnit.test("no-op when contentWindow is missing", (assert) => {
        const mock = { iframeRef: { el: { contentWindow: null } } };
        PreviewDialog.prototype.onPrint.call(mock);
        assert.ok(true, "did not throw");
    });

    QUnit.module("onDownload");
    QUnit.test("calls props.onDownload then props.close in order", (assert) => {
        const order = [];
        const mock = {
            props: {
                onDownload() { order.push("download"); },
                close() { order.push("close"); },
            },
        };
        PreviewDialog.prototype.onDownload.call(mock);
        assert.deepEqual(order, ["download", "close"]);
    });

    QUnit.module("iframe lifecycle");
    QUnit.test("onIframeLoad clears loading flag", (assert) => {
        const mock = {
            state: { loading: true, error: false },
            iframeRef: { el: null },
            hotkey: { registerIframe() {} },
        };
        PreviewDialog.prototype.onIframeLoad.call(mock);
        assert.strictEqual(mock.state.loading, false);
    });
    QUnit.test("onIframeLoad registers the iframe with the hotkey service", (assert) => {
        let registered = null;
        const fakeIframe = { contentWindow: {} };
        const mock = {
            state: { loading: true, error: false },
            iframeRef: { el: fakeIframe },
            hotkey: { registerIframe(iframe) { registered = iframe; } },
        };
        PreviewDialog.prototype.onIframeLoad.call(mock);
        assert.strictEqual(registered, fakeIframe);
    });
    QUnit.test("onIframeLoad swallows registerIframe errors", (assert) => {
        const mock = {
            state: { loading: true, error: false },
            iframeRef: { el: { contentWindow: {} } },
            hotkey: { registerIframe() { throw new Error("boom"); } },
        };
        PreviewDialog.prototype.onIframeLoad.call(mock);
        assert.strictEqual(mock.state.loading, false, "loading still cleared despite throw");
    });
    QUnit.test("onIframeError sets error and clears loading", (assert) => {
        const mock = { state: { loading: true, error: false } };
        PreviewDialog.prototype.onIframeError.call(mock);
        assert.strictEqual(mock.state.loading, false);
        assert.strictEqual(mock.state.error, true);
    });
});
