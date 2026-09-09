# Changelog

All notable changes to **PDF Preview Before Print** for Odoo 18.0 are documented here.

This file follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
Versions use Odoo's `<odoo_version>.<module_major>.<module_minor>.<module_patch>` scheme.

## [18.0.1.4.0] - 2026-09-09

### Fixed
- **The error fallback could never run.** An `<iframe>` fires `load` even for a
  4xx/5xx, so `onIframeError` was unreachable and a failed report showed a raw
  "500: Internal Server Error" page inside the preview dialog. The dialog now
  detects the error document and shows the "Unable to load preview" card
  instead. The test is whether the iframe actually navigated to the report URL
  and came back as `text/html`, verified on Chrome, Firefox and WebKit: a healthy
  report is `application/pdf` in Chrome, while Firefox and WebKit leave the
  document untouched because their own viewers take over. Anything unreadable is
  treated as success, so no browser can produce a false error.
- **Firefox showed the loading spinner forever.** Firefox renders a PDF in its
  built-in viewer and never fires `load` on the iframe at all, so the spinner
  that `load` was supposed to clear stayed on top of a perfectly good report.
  A three-second fallback now clears it. It only stops the spinner - a late
  error page is still caught by the normal path when it eventually arrives.
- **The dialog painted two colours that ignored dark mode.** The loading overlay
  used Bootstrap's `bg-white`, which resolves through `$white` and therefore
  inverts to pure black in dark mode rather than the dialog's own surface, and
  the area behind the PDF was a hardcoded `#f5f5f5` that could not follow a
  theme at all. Both now use theme tokens - `--modal-bg` and `--secondary-bg` -
  measured on Odoo 18 Community and 19 Enterprise. Light mode is unchanged.
- **Download silently swallowed failures.** The download promise was neither
  awaited nor checked, and the dialog closed regardless, so a failed download
  was indistinguishable from a successful one. The result is now awaited, any
  message is shown as a sticky notification, and the dialog stays open on
  failure.

### Changed
- **The preview no longer intercepts when the server cannot render PDFs.** On
  such a server Odoo's own path shows a notification and falls back to the HTML
  report; neither is reproducible from a report handler. Standing aside gives
  users working standard behaviour instead of a broken preview.

### Removed
- 13 lines of SCSS styling a portal modal that exists in no version of this
  module and had no frontend asset bundle.

### Internal
- Corrected the `preview.scss` header, which declared OPL-1 inside an LGPL-3
  module.
- Browser test suite grown from 31 to 53 specs (71 assertions).
- OCA pre-commit pipeline, `.gitattributes`, and the root `LICENSE` file added.

## [18.0.1.3.0] - 2026-06-20

### Added
- **Arabic translation** (`ar`) - 9 languages total, completing the portfolio
  Tier 2 set. Arabic is right-to-left; the dialog uses Bootstrap logical
  utilities so it mirrors correctly.

## [18.0.1.2.0] - 2026-05-12

### Added
- **Chinese (Simplified) translation** (`zh_CN`) - 8 languages total. Translations cover all 10 user-facing strings (manifest, JS, QWeb).
- New language card with CN flag in the "Available in 8 Languages" section of the App Store description.
- `zh_CN` row in the Languages table in README.
- `cn.svg` added to the shared flag library (`N:\\Apps\\_shared\\flags\\`).

### Changed
- Hero "7 Languages" badge updated to "8 Languages".
- Module version bumped from `18.0.1.1.0` to `18.0.1.2.0` (semver minor for new feature).

## [18.0.1.1.0] - 2026-05-12

### Added
- **Internationalization (i18n) support** with 7 languages.
  - English (source), French, Spanish, German, Dutch, Portuguese (Brazil), Italian.
  - All 10 user-facing strings (manifest name, summary, description, OWL dialog title, button labels, kbd hints, loading & error messages) extracted from `__manifest__.py`, `preview_dialog.js`, and `preview_dialog.xml`.
  - Standard Odoo gettext layout under `no_pdf_preview_print/i18n/`:
    - `no_pdf_preview_print.pot` (canonical template, 10 msgids)
    - `fr.po`, `es.po`, `de.po`, `nl.po`, `pt_BR.po`, `it.po` (native translations)
  - PO `Project-Id-Version` header aligned with Odoo 18.0.
- **Languages** section in `README.md` listing all shipped translations and how to add more.
- **"Available in 7 Languages"** section in the App Store description (`static/description/index.html`).
- **"7 Languages"** badge in the App Store hero banner.

### Changed
- README and App Store description now reflect i18n support in their feature lists and technical details tables.

### Notes
- Regional variants (e.g. `fr_BE`, `nl_BE`) inherit from the base language via Odoo's standard fallback - no separate PO file required.
- To add a new language: drop a `<lang>.po` file into `no_pdf_preview_print/i18n/` and reinstall the module.

## [18.0.1.0.0] - Initial release

### Added
- Full-screen OWL `Dialog` component that intercepts every `qweb-pdf` report action.
- **Preview Dialog**: PDF rendered inside an iframe before any download fires.
- **Keyboard Shortcuts**: `P` to print, `D` to download, `Esc` to close.
- **Single + Batch printing**: works from form-view print buttons and from list-view multi-select actions.
- Handler registered in Odoo 18.0's `ir.actions.report handlers` registry - non-PDF reports (XLSX, CSV, HTML, text) fall through unchanged.
- Hoot/QUnit JS test suite covering the dialog component, the report handler, and the `getActiveIds` extractor.
- `HttpCase`-based Python wrapper to run the JS suite via headless Chrome.
- Zero-configuration installation: no models, no database changes, no per-report opt-in.
