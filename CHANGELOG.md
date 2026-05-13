# Changelog

This repository hosts **PDF Preview Before Print** as separate per-Odoo-version branches. Each version branch maintains its own detailed changelog. This file tracks repository-level changes only.

## 2026-05-13 (v1.3.0 — Arabic + hotkey-in-iframe + v18+ singleton migration)

- All version branches bumped to `X.0.1.3.0`. **9 languages total** with the addition of `ar_001` (Arabic).
- Keyboard shortcuts (`P` / `D` / `Esc`) now work after focus moves into the PDF iframe — switched from a raw document listener to Odoo's `useHotkey` service plus `hotkey.registerIframe()` (same mechanism `html_editor` uses).
- v18 / v19 branches migrated `env.services.user.context` and `env.services.rpc(...)` to the singleton imports `user` from `@web/core/user` and `rpc` from `@web/core/network/rpc` — the service-registry idiom was removed in v18.
- v16 ships a small `translation_fix.js` that sets an own property on `translatedTerms` to work around Odoo core's `pt_BR.po` shipping `msgid "Download" / msgstr "Download"` (an English fallback that wins over our `"Baixar"` due to alphabetical last-write-wins merge). v17/v18/v19 don't need this — core was fixed upstream.
- JS unit tests refactored after the `useHotkey` switch: the prototype `_onKeydown` method no longer exists, so its 11 keystroke-matching tests were dropped and replaced with coverage for the new `hotkeyHintMarkup` getter (v16/v17) and the `onIframeLoad` → `hotkey.registerIframe` path. All 4 version branches GREEN.

## 2026-05-12 (later — zh_CN added)

- All version branches bumped to `X.0.1.2.0` with the addition of `zh_CN` (Simplified Chinese) - **8 languages total** (EN, FR, ES, DE, NL, PT-BR, IT, ZH-CN).
- New `cn.svg` flag added to the shared flag library at `N:\Apps\_shared\flags\cn.svg`.

## 2026-05-12 (initial i18n release)

- `main` rewritten as a multi-version landing page.
- Legacy `pdf_preview_print/` directory removed (the module was renamed to `no_pdf_preview_print` on all version branches to comply with Odoo Apps store policy).
- `CHANGELOG.md` added to every version branch.
- All version branches bumped to `X.0.1.1.0` with the i18n release (initial 7 languages: EN, FR, ES, DE, NL, PT-BR, IT).

## Per-version changelogs

For module-level history, see the `CHANGELOG.md` on each version branch:

| Odoo Version | Stable | Development |
|---|---|---|
| 19.0 | [`19.0/CHANGELOG.md`](../../blob/19.0/CHANGELOG.md) | [`19.0.dev/CHANGELOG.md`](../../blob/19.0.dev/CHANGELOG.md) |
| 18.0 | [`18.0/CHANGELOG.md`](../../blob/18.0/CHANGELOG.md) | [`18.0.dev/CHANGELOG.md`](../../blob/18.0.dev/CHANGELOG.md) |
| 17.0 | [`17.0/CHANGELOG.md`](../../blob/17.0/CHANGELOG.md) | [`17.0.dev/CHANGELOG.md`](../../blob/17.0.dev/CHANGELOG.md) |
| 16.0 | [`16.0/CHANGELOG.md`](../../blob/16.0/CHANGELOG.md) | [`16.0.dev/CHANGELOG.md`](../../blob/16.0.dev/CHANGELOG.md) |
