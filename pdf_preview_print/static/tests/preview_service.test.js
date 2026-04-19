// Copyright 2026 Naim OUDAYET
// License LGPL-3
import { describe, expect, test } from "@odoo/hoot";
import {
    getActiveIds,
    pdfPreviewHandler,
} from "@pdf_preview_print/js/preview_service";

describe("pdf_preview_print / getActiveIds", () => {
    test("extracts from context.active_ids", () => {
        expect(getActiveIds({ context: { active_ids: [1, 2, 3] } })).toEqual([1, 2, 3]);
    });

    test("wraps context.active_id in an array", () => {
        expect(getActiveIds({ context: { active_id: 42 } })).toEqual([42]);
    });

    test("falls back to data.ids", () => {
        expect(getActiveIds({ data: { ids: [7, 8] } })).toEqual([7, 8]);
    });

    test("falls back to data.id", () => {
        expect(getActiveIds({ data: { id: 99 } })).toEqual([99]);
    });

    test("returns empty when nothing present", () => {
        expect(getActiveIds({})).toEqual([]);
    });

    test("context.active_ids wins over data.ids", () => {
        expect(
            getActiveIds({
                context: { active_ids: [1] },
                data: { ids: [99] },
            })
        ).toEqual([1]);
    });
});

describe("pdf_preview_print / pdfPreviewHandler", () => {
    function makeEnv() {
        const added = [];
        return {
            added,
            services: {
                dialog: {
                    add(Component, props) {
                        added.push({ Component, props });
                    },
                },
                user: { context: {} },
                rpc: () => Promise.resolve(),
                ui: { block() {}, unblock() {} },
            },
        };
    }

    test("returns false for non-qweb-pdf reports", () => {
        const env = makeEnv();
        expect(
            pdfPreviewHandler(
                { report_type: "qweb-html", report_name: "x" },
                {},
                env
            )
        ).toBe(false);
        expect(env.added.length).toBe(0);
    });

    test("returns false when no active IDs are present", () => {
        const env = makeEnv();
        expect(
            pdfPreviewHandler(
                { report_type: "qweb-pdf", report_name: "x", context: {} },
                {},
                env
            )
        ).toBe(false);
        expect(env.added.length).toBe(0);
    });

    test("opens dialog for valid qweb-pdf action", () => {
        const env = makeEnv();
        const action = {
            report_type: "qweb-pdf",
            report_name: "sale.report_saleorder",
            context: { active_ids: [1, 2] },
        };
        expect(pdfPreviewHandler(action, {}, env)).toBe(true);
        expect(env.added.length).toBe(1);
        const props = env.added[0].props;
        expect(props.reportUrl).toBeTruthy();
        expect(props.reportUrl).toInclude("sale.report_saleorder");
        expect(typeof props.onDownload).toBe("function");
    });
});
