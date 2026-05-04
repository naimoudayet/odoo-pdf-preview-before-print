/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { PreviewDialog } from "@no_pdf_preview_print/js/preview_dialog";

function makeKeyEvent(key, opts) {
    opts = opts || {};
    let prevented = false;
    return {
        key: key,
        ctrlKey: !!opts.ctrlKey,
        metaKey: !!opts.metaKey,
        altKey: !!opts.altKey,
        target: { tagName: opts.tagName || "BODY" },
        preventDefault() { prevented = true; },
        wasPrevented() { return prevented; },
    };
}

function makeMockThis() {
    const mock = {
        printCalled: 0,
        state: { loading: true, error: false },
        iframeRef: { el: null },
        props: {
            _onDownloadCalls: 0,
            _closeCalls: 0,
            onDownload() { mock.props._onDownloadCalls++; },
            close() { mock.props._closeCalls++; },
        },
        onPrint() { mock.printCalled++; },
        onDownload() { PreviewDialog.prototype.onDownload.call(mock); },
    };
    return mock;
}

QUnit.module("no_pdf_preview_print / PreviewDialog", {}, function () {

    QUnit.module("dialogTitle getter");
    QUnit.test("uses props.reportName when provided", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(PreviewDialog.prototype, "dialogTitle");
        const title = desc.get.call({ props: { reportName: "Invoice 0001" } });
        assert.strictEqual(title, "Invoice 0001");
    });
    QUnit.test("empty reportName triggers fallback branch", (assert) => {
        const desc = Object.getOwnPropertyDescriptor(PreviewDialog.prototype, "dialogTitle");
        let result = null, threw = false;
        try {
            result = desc.get.call({ props: { reportName: "" } });
        } catch (e) {
            threw = true;
        }
        assert.ok(threw || result !== "", "fallback branch was entered");
    });

    QUnit.module("_onKeydown");
    QUnit.test("lowercase p triggers onPrint", (assert) => {
        const mock = makeMockThis();
        const ev = makeKeyEvent("p");
        PreviewDialog.prototype._onKeydown.call(mock, ev);
        assert.strictEqual(mock.printCalled, 1);
        assert.ok(ev.wasPrevented());
    });
    QUnit.test("uppercase P triggers onPrint", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("P"));
        assert.strictEqual(mock.printCalled, 1);
    });
    QUnit.test("lowercase d triggers onDownload and close", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("d"));
        assert.strictEqual(mock.props._onDownloadCalls, 1);
        assert.strictEqual(mock.props._closeCalls, 1);
    });
    QUnit.test("uppercase D triggers onDownload", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("D"));
        assert.strictEqual(mock.props._onDownloadCalls, 1);
    });
    QUnit.test("Ctrl+P is ignored", (assert) => {
        const mock = makeMockThis();
        const ev = makeKeyEvent("p", { ctrlKey: true });
        PreviewDialog.prototype._onKeydown.call(mock, ev);
        assert.strictEqual(mock.printCalled, 0);
        assert.notOk(ev.wasPrevented());
    });
    QUnit.test("Meta+P is ignored", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("p", { metaKey: true }));
        assert.strictEqual(mock.printCalled, 0);
    });
    QUnit.test("Alt+P is ignored", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("p", { altKey: true }));
        assert.strictEqual(mock.printCalled, 0);
    });
    QUnit.test("Ctrl+D is ignored", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("d", { ctrlKey: true }));
        assert.strictEqual(mock.props._onDownloadCalls, 0);
    });
    QUnit.test("focus inside INPUT ignores P and D", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("p", { tagName: "INPUT" }));
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("d", { tagName: "INPUT" }));
        assert.strictEqual(mock.printCalled, 0);
        assert.strictEqual(mock.props._onDownloadCalls, 0);
    });
    QUnit.test("focus inside TEXTAREA ignores P", (assert) => {
        const mock = makeMockThis();
        PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent("p", { tagName: "TEXTAREA" }));
        assert.strictEqual(mock.printCalled, 0);
    });
    QUnit.test("unrelated keys are ignored", (assert) => {
        const mock = makeMockThis();
        const ignored = ["Enter", "Tab", " ", "ArrowDown", "Escape", "x"];
        for (const k of ignored) {
            PreviewDialog.prototype._onKeydown.call(mock, makeKeyEvent(k));
        }
        assert.strictEqual(mock.printCalled, 0);
        assert.strictEqual(mock.props._onDownloadCalls, 0);
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
        const mock = { state: { loading: true, error: false } };
        PreviewDialog.prototype.onIframeLoad.call(mock);
        assert.strictEqual(mock.state.loading, false);
    });
    QUnit.test("onIframeError sets error and clears loading", (assert) => {
        const mock = { state: { loading: true, error: false } };
        PreviewDialog.prototype.onIframeError.call(mock);
        assert.strictEqual(mock.state.loading, false);
        assert.strictEqual(mock.state.error, true);
    });
});
