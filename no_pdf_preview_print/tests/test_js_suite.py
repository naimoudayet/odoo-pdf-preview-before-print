# Copyright 2026 Naim OUDAYET
# License LGPL-3
import odoo.tests
from odoo.tests import HttpCase


@odoo.tests.tagged("post_install", "-at_install", "no_pdf_preview_print_js")
class PdfPreviewJsSuite(HttpCase):
    """Wraps Odoo's QUnit JS test runner for just this module's specs.

    Uses QUnit's own ?filter=, which substring-matches the full test name and
    therefore catches both of this module's QUnit modules. ?module= is NOT a
    substitute: QUnit reads it as an exact QUnit-module name, and neither
    "no_pdf_preview_print / PreviewDialog" nor
    "no_pdf_preview_print / preview_service" equals "no_pdf_preview_print", so
    the filter misses and the ENTIRE Odoo web suite runs - minutes instead of
    the ~0.4s these specs take.
    """

    def test_js_suite(self):
        self.browser_js(
            "/web/tests?filter=no_pdf_preview_print",
            "",
            "",
            login="admin",
            timeout=180,
        )
