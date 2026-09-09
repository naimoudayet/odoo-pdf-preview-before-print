# PDF Preview Before Print

![License](https://img.shields.io/badge/license-LGPL--3-blue)
![Odoo](https://img.shields.io/badge/Odoo-16.0%20%7C%2017.0%20%7C%2018.0%20%7C%2019.0-blueviolet)
![Languages](https://img.shields.io/badge/languages-9-orange)

**Author: Naim OUDAYET**

A full-screen preview dialog for every Odoo PDF report. Print, download, or close
after a quick review instead of downloading first and looking afterwards. Pure
frontend, zero configuration, available in 9 languages.

## Where the code lives

Each Odoo major version has its own pair of branches. Pick the one matching your
server; the technical module name is `no_pdf_preview_print` on all of them.

| Odoo Version | App Store branch                 | Development branch                       |
|--------------|----------------------------------|------------------------------------------|
| 19.0         | [`19.0`](../../tree/19.0)        | [`19.0-dev`](../../tree/19.0-dev)        |
| 18.0         | [`18.0`](../../tree/18.0)        | [`18.0-dev`](../../tree/18.0-dev)        |
| 17.0         | [`17.0`](../../tree/17.0)        | [`17.0-dev`](../../tree/17.0-dev)        |
| 16.0         | [`16.0`](../../tree/16.0)        | [`16.0-dev`](../../tree/16.0-dev)        |

| Branch       | Purpose                                                                 |
|--------------|-------------------------------------------------------------------------|
| `<v>.0`      | **App Store branch.** Addon-only, ready to drop into `addons_path`.      |
| `<v>.0-dev`  | Development branch with Dockerfile, demo data and manual-test scenarios. |
| `main`       | This landing page only. Always points to `<v>.0` for installs.           |

## Install

Install from the **Odoo App Store**, or check out the branch matching your Odoo
version and copy `no_pdf_preview_print/` into your `addons_path`. Then
**Apps → Update Apps List → search "PDF Preview Before Print" → Install**.

Full documentation lives on each version branch's own README.

## License

LGPL-3 — <https://www.gnu.org/licenses/lgpl-3.0.html>

(c) **Naim OUDAYET** — <https://www.oudayet.com>
