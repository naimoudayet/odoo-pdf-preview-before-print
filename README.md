# PDF Preview Before Print — Odoo 19

Preview any PDF report in a full-screen dialog before printing or downloading. Works with all standard Odoo reports — single records and batch printing. Zero configuration.

## The Problem

In standard Odoo, clicking **Print** immediately downloads the PDF. There is no way to review the document first. Wrong template? Blank page? Missing data? You only find out after wasting paper or digging through your downloads folder.

## The Solution

This module intercepts the PDF download action and opens a clean preview dialog instead. From there you can **Print**, **Download**, or **Close** — with full keyboard support.

## Features

- **Full-screen preview dialog** — OWL-based, no pop-ups or new tabs
- **Print from preview** — send directly to printer after reviewing
- **Download from preview** — save the PDF only when you're satisfied
- **Keyboard shortcuts** — `P` Print, `D` Download, `Esc` Close
- **Single + batch** — works from both form view and list view (multi-select)
- **Zero configuration** — install and it works on all PDF reports
- **Lightweight** — pure frontend, no Python models, no database changes

## Installation

1. Copy the `pdf_preview_print` folder to your Odoo addons directory
2. Update the apps list: **Apps > Update Apps List**
3. Search for **"PDF Preview Before Print"** and install
4. Done — all PDF reports now show a preview first

## Technical Details

| | |
|---|---|
| **Odoo Version** | 19.0 |
| **Dependencies** | `web` |
| **License** | LGPL-3 |
| **Type** | Pure Frontend (OWL) |
| **Python required** | No |
| **Configuration** | None |

## How It Works

The module registers a handler in Odoo 19's `ir.actions.report handlers` registry. When any `qweb-pdf` report action is triggered, the handler intercepts it and opens a `PreviewDialog` component with the PDF rendered in an iframe. The user then chooses to print, download, or close.

### Files

```
pdf_preview_print/
├── __init__.py
├── __manifest__.py
└── static/
    ├── description/
    │   ├── icon.png
    │   └── index.html
    └── src/
        ├── js/
        │   ├── preview_dialog.js    # OWL dialog component
        │   └── preview_service.js   # Report handler registration
        ├── scss/
        │   └── preview.scss         # Dialog styles
        └── xml/
            └── preview_dialog.xml   # QWeb template
```

## Compatibility

- Odoo 19.0 Community
- Odoo 19.0 Enterprise
- Works with all standard and custom QWeb PDF reports

## Author

**Naim OUDAYET**
- Website: [oudayet.com](https://www.oudayet.com)
- Email: contact@oudayet.com
- GitHub: [@naimoudayet](https://github.com/naimoudayet)

## License

This module is licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
