/**
 * @jest-environment node
 */

import pug from "pug";
import magicCodeEmail, { magicCodeSubject } from "../magic-code-email";

const render = (locals: Record<string, unknown> = {}) =>
    pug.render(magicCodeEmail, {
        code: "032761",
        siteName: "fit-leads membresía",
        hideCourseLitBranding: true,
        ...locals,
    });

describe("magic code email", () => {
    it("shows the code in Spanish with its expiry", () => {
        const html = render();

        expect(html).toContain("032761");
        expect(html).toContain("Tu código para entrar");
        expect(html).toContain("5 minutos");
        expect(html).not.toContain("is your verification code");
    });

    it("names the site and declares its language", () => {
        const html = render();

        expect(html).toContain('<html lang="es">');
        expect(html).toContain("fit-leads membresía");
    });

    it("hides the CourseLit badge when branding is off", () => {
        expect(render()).not.toContain("Powered by");
        expect(render({ hideCourseLitBranding: false })).toContain(
            "Powered by",
        );
    });

    it("escapes the site name", () => {
        expect(render({ siteName: "<b>x</b>" })).not.toContain("<b>x</b>");
    });

    it("puts the code first in the subject so it shows in the notification", () => {
        expect(magicCodeSubject("032761", "fit-leads membresía")).toBe(
            "032761 es tu código para entrar en fit-leads membresía",
        );
    });

    it("falls back to a generic subject without a site name", () => {
        expect(magicCodeSubject("032761", "")).toBe(
            "032761 es tu código para entrar",
        );
    });
});
