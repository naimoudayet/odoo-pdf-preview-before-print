# Copyright 2026 Naim OUDAYET
# License LGPL-3
import odoo.tests
from odoo.tests import HttpCase


@odoo.tests.tagged("post_install", "-at_install", "no_pdf_preview_print_js")
class PdfPreviewJsSuite(HttpCase):
    """Wraps Odoo's QUnit JS test runner for just this module's specs.

    Loads /web/tests?filter=no_pdf_preview_print in headless Chrome so only our
    QUnit tests execute, then waits for QUnit.done to report pass/fail.
    """

    def test_js_suite(self):
        self.browser_js(
            "/web/tests?filter=no_pdf_preview_print",
            "",
            "",
            login="admin",
            timeout=180,
        )
