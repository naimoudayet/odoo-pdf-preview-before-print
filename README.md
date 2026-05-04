# PDF Preview Before Print — Odoo 18

Preview any PDF report in a full-screen dialog before printing or downloading. Works with all standard Odoo reports — single records and batch printing. Zero configuration.

## Features

- **Full-Screen Preview Dialog** -- OWL-based, in-app, no pop-ups or new tabs.
- **Print from Preview** -- send directly to the printer after reviewing.
- **Download from Preview** -- save the PDF only when you're satisfied.
- **Keyboard Shortcuts** -- `P` Print, `D` Download, `Esc` Close.
- **Single + Batch Reports** -- works from form view and list view multi-select.
- **Zero Configuration** -- install and every QWeb PDF report is intercepted.
- **Lightweight** -- pure frontend, no Python models, no database changes.

## How It Works

1. The user clicks **Print** on any record (or batch via list multi-select).
2. The module's handler (registered in Odoo 18's `ir.actions.report handlers` registry) intercepts the action.
3. A `PreviewDialog` OWL component renders the PDF inside an iframe.
4. The user chooses **Print**, **Download**, or **Close** — with full keyboard support.

The handler only catches `qweb-pdf` actions. Non-PDF reports (XLSX, CSV, HTML, text) fall through unchanged.

## Technical Details

| Item                 | Value                                |
|----------------------|--------------------------------------|
| Odoo Version         | 18.0                                 |
| License              | LGPL-3                               |
| Dependencies         | `web`                                |
| Python Dependencies  | None                                 |
| Type                 | Pure Frontend (OWL)                  |
| Configuration        | None (zero-config)                   |

## Installation

1. Place the `no_pdf_preview_print` folder in your Odoo addons directory.
2. Restart the Odoo server (or run with `-u no_pdf_preview_print` on first install).
3. Go to **Apps**, remove the *Apps* filter, search for **"PDF Preview Before Print"**, and click **Install**.

## Configuration

None. Once installed, every QWeb PDF report shows the preview dialog instead of an immediate download.

## Docker Setup (Development)

```bash
docker-compose up -d
```

- Odoo: http://localhost:2018
- PostgreSQL: internal `db` service (no exposed port by default)

The provided `Dockerfile` installs Chromium and `python3-websocket` so Odoo's `HttpCase.browser_js` can run the JS test suite headlessly.

## Running Tests

```bash
docker exec -it pdfprev-odoo-18 \
  odoo --test-enable --stop-after-init \
  -d test_db -i no_pdf_preview_print \
  --test-tags no_pdf_preview_print_js
```

Runs the Hoot/QUnit specs under `static/tests/` plus the `HttpCase` wrapper in `tests/test_js_suite.py`.

## Compatibility

- Odoo 18.0 Community
- Odoo 18.0 Enterprise
- Works with all standard and custom QWeb PDF reports

## Author

**Naim OUDAYET**
Odoo developer based in Tunisia.

- Website: [oudayet.com](https://www.oudayet.com)
- Email: contact@oudayet.com
- GitHub: [@naimoudayet](https://github.com/naimoudayet)

## License

This module is licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
