/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

import { Component, markup, useRef, useState } from "@odoo/owl";
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
        this.state.loading = false;

        // An iframe fires `load` even for a 4xx/5xx, because the ERROR PAGE
        // loaded perfectly well — `error` only fires for network-level
        // failures. Measured against this module's own URL:
        //   /report/pdf/no_such.report/1  ->  HTTP 500, event "load"
        // so onIframeError is unreachable in practice and the user was left
        // reading a raw "500: Internal Server Error" inside the dialog.
        //
        // The response is same-origin, so read what actually arrived:
        // a real report is application/pdf, an error page is text/html.
        // Fail OPEN on an absent value — Firefox/Safari render PDFs through
        // their own viewers and may not expose contentType, and a false
        // error is worse than the status quo.
        if (!this.isPdfDocument()) {
            this.state.error = true;
            return;
        }

        // Once the PDF viewer mounts, the iframe steals keyboard focus and
        // a parent-document listener stops seeing keystrokes. registerIframe
        // attaches the hotkey service to iframe.contentWindow so P/D still
        // fire from inside the PDF area. Same mechanism html_editor uses for
        // its <iframe> body (web/core/hotkeys/hotkey_service.js:registerIframe).
        // try/catch covers the edge case where contentWindow isn't accessible
        // (cross-origin or browser PDF sandbox).
        const iframe = this.iframeRef.el;
        if (iframe?.contentWindow) {
            try {
                this.hotkey.registerIframe(iframe);
            } catch {
                /* fall back to parent-document-only hotkeys */
            }
        }
    }

    /**
     * Did the iframe actually receive a PDF, or an error page wearing a
     * successful `load` event?
     *
     * @returns {boolean} true when the content is a PDF, or when the type
     *   cannot be determined at all (cross-origin, or a viewer that hides it).
     */
    isPdfDocument() {
        try {
            const type = this.iframeRef.el?.contentDocument?.contentType;
            return !type || type === "application/pdf";
        } catch {
            // Inaccessible contentDocument: assume success rather than
            // claiming a failure we cannot actually observe.
            return true;
        }
    }

    onIframeError() {
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
