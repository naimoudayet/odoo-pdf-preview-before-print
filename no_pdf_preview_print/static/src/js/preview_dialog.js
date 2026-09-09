/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

import {
    Component,
    markup,
    onMounted,
    onWillUnmount,
    useRef,
    useState,
} from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";
import { useService } from "@web/core/utils/hooks";

export class PreviewDialog extends Component {
    static template = "no_pdf_preview_print.PreviewDialog";
    static components = { Dialog };
    static props = {
        reportUrl: { type: String },
        reportName: { type: String, optional: true },
        onDownload: { type: Function },
        close: { type: Function },
    };

    setup() {
        this.iframeRef = useRef("previewIframe");
        this.state = useState({ loading: true, error: false, downloading: false });
        this.hotkey = useService("hotkey");
        this.notification = useService("notification");

        // Hotkeys via Odoo's service rather than a raw document listener: it
        // handles input-field bypass, dialog stacking (only the top dialog's
        // hotkeys fire), and namespace conflict warnings for free. Esc is
        // bound by the Dialog component itself — no need to handle it.
        useHotkey("p", () => this.onPrint());
        useHotkey("d", () => this.onDownload());

        // Firefox renders a PDF in its built-in viewer and never fires `load`
        // on the iframe at all — measured: no event in 12s, contentDocument
        // left on about:blank. Without a fallback the spinner would sit on top
        // of a perfectly good report forever. It DOES fire for an Odoo error
        // page (~150ms), so a silent iframe means the PDF is rendering
        // natively: stop the spinner without claiming a failure.
        onMounted(() => {
            this.settleTimer = setTimeout(() => this.onSettleTimeout(), 3000);
        });
        onWillUnmount(() => clearTimeout(this.settleTimer));
    }

    get dialogTitle() {
        return this.props.reportName || _t("PDF Preview");
    }

    // One translatable string for the whole footer hotkey legend — translators
    // can reorder verb/key combinations to fit natural word order (esp. RTL).
    // Per ODOO_GUIDELINES §12.6: NEVER split a sentence across multiple _t()
    // calls. markup() lets us keep <kbd> styling without t-raw / unsafe HTML.
    get hotkeyHintMarkup() {
        return markup(
            _t("<kbd>P</kbd> Print · <kbd>D</kbd> Download · <kbd>Esc</kbd> Close"),
        );
    }

    onIframeLoad() {
        clearTimeout(this.settleTimer);
        this.state.loading = false;

        // An iframe fires `load` even for a 4xx/5xx, because the ERROR PAGE
        // loaded perfectly well — `error` only fires for network-level
        // failures. Measured against this module's own URL:
        //   /report/pdf/no_such.report/1  ->  HTTP 500, event "load"
        // so onIframeError is unreachable in practice and the user was left
        // reading a raw "500: Internal Server Error" inside the dialog.
        if (this.isErrorDocument()) {
            this.state.error = true;
            return;
        }
        this.registerIframeHotkeys();
    }

    /**
     * Fallback for browsers that never fire `load` for a PDF (Firefox).
     *
     * Only clears the spinner. It deliberately does not decide anything about
     * failure on its own — a late-arriving error page still runs the full
     * check through onIframeLoad, which fires whenever it eventually does.
     */
    onSettleTimeout() {
        if (!this.state.loading) {
            return;
        }
        this.state.loading = false;
        if (this.isErrorDocument()) {
            this.state.error = true;
            return;
        }
        this.registerIframeHotkeys();
    }

    /**
     * Is the iframe showing an Odoo error page wearing a successful `load`?
     *
     * Measured on both engines, healthy report vs. /report/pdf/no_such.report/1:
     *
     *   engine   healthy: href / contentType         error: href / contentType
     *   Chrome   report URL / application/pdf        report URL / text/html
     *   Firefox  about:blank / text/html             report URL / text/html
     *
     * So "not application/pdf" is NOT the test — that would flag every healthy
     * report in Firefox. The document having actually navigated away from
     * about:blank is what separates them.
     *
     * @returns {boolean} true only when a failure is positively observed.
     */
    isErrorDocument() {
        try {
            const doc = this.iframeRef.el?.contentDocument;
            const href = doc?.location?.href;
            // Firefox leaves contentDocument on the initial about:blank when
            // its own viewer takes the PDF. An untouched document is not
            // evidence of failure.
            if (!href || href === "about:blank") {
                return false;
            }
            return doc.contentType === "text/html";
        } catch {
            // Inaccessible contentDocument: never claim a failure we cannot
            // actually observe.
            return false;
        }
    }

    /**
     * Once the PDF viewer mounts, the iframe steals keyboard focus and a
     * parent-document listener stops seeing keystrokes. registerIframe attaches
     * the hotkey service to iframe.contentWindow so P/D still fire from inside
     * the PDF area — the same mechanism html_editor uses for its <iframe> body
     * (web/core/hotkeys/hotkey_service.js:registerIframe). try/catch covers the
     * case where contentWindow isn't reachable (cross-origin or PDF sandbox).
     */
    registerIframeHotkeys() {
        const iframe = this.iframeRef.el;
        if (iframe?.contentWindow) {
            try {
                this.hotkey.registerIframe(iframe);
            } catch {
                /* fall back to parent-document-only hotkeys */
            }
        }
    }

    onIframeError() {
        clearTimeout(this.settleTimer);
        this.state.loading = false;
        this.state.error = true;
    }

    onPrint() {
        const iframe = this.iframeRef.el;
        if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    }

    /**
     * Download, and say so when it fails.
     *
     * The previous version fired downloadReport without awaiting it and
     * discarded the result, then closed the dialog unconditionally — so a
     * failed download looked exactly like a successful one: the dialog shut
     * and no file appeared. Core surfaces the same result as a sticky
     * notification (action_service.js), and so do we.
     */
    async onDownload() {
        if (this.state.downloading) {
            return;
        }
        this.state.downloading = true;
        try {
            const result = await this.props.onDownload();
            // A handler that returns nothing is treated as success, so an
            // older/other caller keeps working.
            const { success = true, message } = result || {};
            if (message) {
                this.notification.add(message, { sticky: true, title: _t("Report") });
            }
            if (success) {
                this.props.close();
            } else {
                this.state.error = true;
            }
        } catch {
            this.state.error = true;
        } finally {
            this.state.downloading = false;
        }
    }
}
