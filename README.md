# PDF Preview Before Print — Odoo 17

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
2. The module's handler (registered in Odoo 17's `ir.actions.report handlers` registry) intercepts the action.
3. A `PreviewDialog` OWL component renders the PDF inside an iframe.
4. The user chooses **Print**, **Download**, or **Close** — with full keyboard support.

The handler only catches `qweb-pdf` actions. Non-PDF reports (XLSX, CSV, HTML, text) fall through unchanged.

## Technical Details

| Item                 | Value                                |
|----------------------|--------------------------------------|
| Odoo Version         | 17.0                                 |
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

## Compatibility

- Odoo 17.0 Community
- Odoo 17.0 Enterprise
- Works with all standard and custom QWeb PDF reports

## Development

For the development stack (Docker compose with Postgres + Odoo + headless Chrome for tests), see the [`17.0.dev`](https://github.com/naimoudayet/odoo-pdf-preview-before-print/tree/17.0.dev) branch.

## Author

**Naim OUDAYET**
Odoo developer based in Tunisia.

- Website: [oudayet.com](https://www.oudayet.com)
- Email: contact@oudayet.com
- GitHub: [@naimoudayet](https://github.com/naimoudayet)

## License

This module is licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
