/** @odoo-module **/
// Copyright 2026 Naim OUDAYET
// License LGPL-3

/**
 * Translation collision workaround — Odoo 16 + pt_BR only.
 *
 * Odoo's `localization_service` merges every module's translations into a
 * single flat dict (`translatedTerms`) using alphabetical module-name
 * iteration with last-write-wins. So when two modules share a msgid, the
 * one that sorts later wins — even when the later module's `.po` only
 * contains the English source as msgstr (i.e. an untranslated fallback).
 *
 * Concrete case this file fixes:
 *   Odoo 16 ships `web/i18n/pt_BR.po` with the line
 *       msgid "Download"
 *       msgstr "Download"          ← English fallback, not translated
 *   `web` sorts after `no_pdf_preview_print` in the merge, so its
 *   "Download" → "Download" overwrites our "Download" → "Baixar" and the
 *   pt_BR user sees the English word on the dialog's Download button.
 *
 *   Odoo 17/18/19 fixed this gap in core (`msgstr "Baixar"`), so this
 *   workaround is intentionally scoped to v16 only — the corresponding
 *   .dev branches for 17/18/19 do NOT carry this file.
 *
 * Mechanism:
 *   `translatedTerms` is the export object that `_t` reads. The
 *   localization service installs the merged translations as a
 *   `setPrototypeOf` chain. By writing an OWN property here, we beat the
 *   prototype-chain lookup — JS resolves own properties before walking
 *   the prototype. We do NOT modify Odoo core; we just set one key on
 *   our own copy of the imported module-level object.
 *
 *   Scoped to pt_BR — every other language sees the standard
 *   prototype-chain behavior unchanged.
 */

import { translatedTerms } from "@web/core/l10n/translation";
import { session } from "@web/session";

const COLLISION_FIXES = {
    pt_BR: { Download: "Baixar" },
};

const userLang = session.user_context && session.user_context.lang;
const fixes = userLang && COLLISION_FIXES[userLang];
if (fixes) {
    Object.assign(translatedTerms, fixes);
}
