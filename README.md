# PDF Preview Before Print

A full-screen preview dialog for every Odoo PDF report. Print, download, or close after a quick review. Pure frontend, zero configuration, available in 9 languages.

## Choose Your Odoo Version

Each Odoo major version lives on its own branch. Pick the one matching your server.

| Odoo Version | Stable | Development |
|---|---|---|
| 19.0 | [`19.0`](../../tree/19.0) | [`19.0.dev`](../../tree/19.0.dev) |
| 18.0 | [`18.0`](../../tree/18.0) | [`18.0.dev`](../../tree/18.0.dev) |
| 17.0 | [`17.0`](../../tree/17.0) | [`17.0.dev`](../../tree/17.0.dev) |
| 16.0 | [`16.0`](../../tree/16.0) | [`16.0.dev`](../../tree/16.0.dev) |

The technical module name is **`no_pdf_preview_print`** on every version branch.

## What It Does

- **Full-Screen Preview Dialog** — OWL-based, in-app, no pop-ups or new tabs.
- **Print from Preview** — send directly to the printer after reviewing.
- **Download from Preview** — save the PDF only when you're satisfied.
- **Keyboard Shortcuts** — `P` Print, `D` Download, `Esc` Close.
- **Single + Batch Reports** — works from form view and list view multi-select.
- **Zero Configuration** — install and every QWeb PDF report is intercepted.
- **Lightweight** — pure frontend, no Python models, no database changes.
- **Translated into 9 Languages** — English, French, Spanish, German, Dutch, Portuguese (BR), Italian, Chinese (Simplified), Arabic. Each user sees the dialog in their own Odoo language.

## Quick Install

1. Check out the branch matching your Odoo version (see table above).
2. Copy the `no_pdf_preview_print/` folder into a directory listed in your Odoo `addons_path`.
3. **Apps → Update Apps List → search "PDF Preview Before Print" → Install**.

Full per-version installation, configuration, and test instructions live in each branch's own README.

## Languages

Ships with translations for:

| Code     | Language                |
|----------|-------------------------|
| `en_US`  | English (source)        |
| `fr`     | French                  |
| `es`     | Spanish                 |
| `de`     | German                  |
| `nl`     | Dutch                   |
| `pt_BR`  | Portuguese (Brazil)     |
| `it`     | Italian                 |
| `zh_CN`  | Chinese (Simplified)    |
| `ar_001` | Arabic                  |

Regional variants (e.g. `fr_BE`, `nl_BE`) inherit from the base language via Odoo's standard fallback. To add a new language, drop a `<code>.po` file into the branch's `i18n/` folder — the canonical template is `i18n/no_pdf_preview_print.pot`.

## Compatibility

Works with all standard and custom QWeb PDF reports on **Odoo 16.0 through 19.0**, Community and Enterprise editions.

## Repository Layout

This `main` branch is a landing page only. Code lives on the per-version branches above. The technical name change from the original `pdf_preview_print` to `no_pdf_preview_print` (Odoo Apps store policy) is reflected on all version branches; the legacy path no longer exists.

## Author

**Naim OUDAYET** — Odoo developer based in Tunisia.

- Website: [oudayet.com](https://www.oudayet.com)
- Email: contact@oudayet.com
- GitHub: [@naimoudayet](https://github.com/naimoudayet)

## License

[LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
