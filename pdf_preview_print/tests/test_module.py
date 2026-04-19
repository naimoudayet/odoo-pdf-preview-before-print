# Copyright 2026 Naim OUDAYET
# License LGPL-3
import ast
import os

from odoo import release
from odoo.modules.module import get_module_path
from odoo.tests import tagged
from odoo.tests.common import TransactionCase


@tagged("post_install", "-at_install")
class TestPdfPreviewPrint(TransactionCase):
    """Smoke tests for the PDF Preview Before Print module.

    The module is frontend-only (OWL + SCSS + XML) so there are no Python
    models to exercise. These tests guard the contract between the manifest
    and the filesystem: install state, version alignment with the running
    Odoo major, and presence of every asset the manifest claims to ship.
    """

    MODULE = "pdf_preview_print"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.module_path = get_module_path(cls.MODULE)
        manifest_file = os.path.join(cls.module_path, "__manifest__.py")
        with open(manifest_file, "r", encoding="utf-8") as fh:
            cls.manifest = ast.literal_eval(fh.read())

    def _asset_paths(self, bundle=None):
        assets = self.manifest.get("assets") or {}
        bundles = [bundle] if bundle else list(assets.keys())
        paths = []
        for name in bundles:
            for entry in assets.get(name, []):
                paths.append(entry[1] if isinstance(entry, (list, tuple)) else entry)
        return paths

    def test_01_module_installed(self):
        rec = self.env["ir.module.module"].search(
            [("name", "=", self.MODULE)], limit=1
        )
        self.assertTrue(rec, "ir.module.module record for %s not found" % self.MODULE)
        self.assertEqual(
            rec.state,
            "installed",
            "%s should be installed, got state=%s" % (self.MODULE, rec.state),
        )

    def test_02_version_matches_odoo_major(self):
        version = self.manifest.get("version", "")
        major = release.major_version
        self.assertTrue(
            version.startswith(major + "."),
            "manifest version %r does not start with Odoo major %r" % (version, major),
        )

    def test_03_asset_files_exist(self):
        addons_root = os.path.dirname(self.module_path)
        missing = [
            p
            for p in self._asset_paths()
            if not os.path.isfile(os.path.join(addons_root, p))
        ]
        self.assertFalse(
            missing,
            "manifest references files that do not exist: %s" % missing,
        )

    def test_04_report_handler_asset_registered(self):
        self.assertIn(
            "pdf_preview_print/static/src/js/preview_service.js",
            self._asset_paths("web.assets_backend"),
            "preview_service.js must be in web.assets_backend",
        )
