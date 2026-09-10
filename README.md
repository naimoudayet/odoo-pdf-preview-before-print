# PDF Preview Before Print — Odoo 19

![License](https://img.shields.io/badge/license-LGPL--3-blue)
![Odoo](https://img.shields.io/badge/Odoo-19.0-blueviolet)
![Languages](https://img.shields.io/badge/languages-9-orange)
![Version](https://img.shields.io/badge/version-19.0.1.4.0-informational)

Preview any PDF report in a full-screen dialog before printing or downloading. Works with all standard Odoo reports — single records and batch printing. Zero configuration.

## Features

- **Full-Screen Preview Dialog** -- OWL-based, in-app, no pop-ups or new tabs.
- **Print from Preview** -- send directly to the printer after reviewing.
- **Download from Preview** -- save the PDF only when you're satisfied.
- **Keyboard Shortcuts** -- `P` Print, `D` Download, `Esc` Close.
- **Single + Batch Reports** -- works from form view and list view multi-select.
- **Zero Configuration** -- install and every QWeb PDF report is intercepted.
- **Lightweight** -- pure frontend, no Python models, no database changes.
- **Translated into 8 Languages** -- English, French, Spanish, German, Dutch, Portuguese (BR), Italian, Chinese (Simplified). Each user sees the dialog in their own Odoo language.

## How It Works

1. The user clicks **Print** on any record (or batch via list multi-select).
2. The module's handler (registered in Odoo 19's `ir.actions.report handlers` registry) intercepts the action.
3. A `PreviewDialog` OWL component renders the PDF inside an iframe.
4. The user chooses **Print**, **Download**, or **Close** — with full keyboard support.

The handler only catches `qweb-pdf` actions. Non-PDF reports (XLSX, CSV, HTML, text) fall through unchanged.

### Known behaviour: wizards close as the preview opens

Odoo runs a report action's `onClose()` as soon as a handler reports the report
as handled, so a wizard configured with `close_on_report_download` closes while
the preview is still on screen instead of after the download. Deferring it would
mean holding the handler's promise open until the dialog closes, which blocks the
action manager behind a modal the user may leave open. The preview, Print and
Download all still work normally; only the parent wizard's timing differs.

## Technical Details

| Item                 | Value                                |
|----------------------|--------------------------------------|
| Odoo Version         | 19.0                                 |
| Module Version       | 19.0.1.4.0                          |
| License              | LGPL-3                               |
| Dependencies         | `web`                                |
| Python Dependencies  | None                                 |
| Type                 | Pure Frontend (OWL)                  |
| Configuration        | None (zero-config)                   |
| Languages            | EN, FR, ES, DE, NL, PT-BR, IT, ZH-CN, AR |

## Installation

1. Place the `no_pdf_preview_print` folder in your Odoo addons directory.
2. Restart the Odoo server (or run with `-u no_pdf_preview_print` on first install).
3. Go to **Apps**, remove the *Apps* filter, search for **"PDF Preview Before Print"**, and click **Install**.

## Configuration

None. Once installed, every QWeb PDF report shows the preview dialog instead of an immediate download.

## Docker Setup (Development)

The dev stack lives on the **`19.0-dev`** branch - `Dockerfile` and
`docker-compose.yml` are not shipped on the App Store branch, which carries the
addon only.

```bash
git checkout 19.0-dev
docker-compose up -d
```

- Odoo: http://localhost:2019
- PostgreSQL: internal `db` service (no exposed port by default)

The provided `Dockerfile` installs Chromium and `python3-websocket` so Odoo's `HttpCase.browser_js` can run the JS test suite headlessly.

## Running Tests

```bash
docker exec -it pdfprev-odoo-19 \
  odoo --test-enable --stop-after-init \
  -d test_db -i no_pdf_preview_print \
  --test-tags no_pdf_preview_print_js
```

Runs the Hoot specs under `static/tests/` through the `HttpCase` wrapper in
`tests/test_js_suite.py`. Both the wrapper and the Chromium-equipped image it
needs are on **`19.0-dev`**; the specs themselves ship on every branch.

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

Each user sees the dialog in the language set in **Preferences → Language**. Regional variants (e.g. `fr_BE`, `nl_BE`) inherit from the base language via Odoo's standard fallback. To add a new language, drop a `<code>.po` file into `i18n/` — the canonical template is `i18n/no_pdf_preview_print.pot`.

## Compatibility

- Odoo 19.0 Community
- Odoo 19.0 Enterprise
- Works with all standard and custom QWeb PDF reports

## Author

**Naim OUDAYET**
Odoo developer based in Tunisia.

- Website: [oudayet.com](https://www.oudayet.com)
- Email: contact@oudayet.com
- GitHub: [@naimoudayet](https://github.com/naimoudayet)

## License

This module is licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
