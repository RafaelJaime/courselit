import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import {
    VERIFY_WHATSAPP_CONSENT_LINK,
    VERIFY_WHATSAPP_JOIN,
    VERIFY_PAID_TITLE,
} from "@ui-config/strings";
import Page from "../page";

const exec = jest.fn();
jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => {
        const builder: any = {
            setUrl: jest.fn(() => builder),
            setHeaders: jest.fn(() => builder),
            setPayload: jest.fn(() => builder),
            build: jest.fn(() => ({ exec })),
        };
        return builder;
    }),
}));

jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams("id=inv_1"),
}));

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, ...props }: ComponentProps<"a">) => (
        <a {...props}>{children}</a>
    ),
}));

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({ backend: "", frontend: "" }),
    };
});

jest.mock("@/components/ui/button", () => ({
    Button: ({ children }: ComponentProps<"button">) => <>{children}</>,
}));

jest.mock("../guest-phone-form", () => ({
    GuestPhoneForm: () => null,
}));

describe("checkout verify page, paid state", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        exec.mockResolvedValue({ status: "paid" });
    });

    it("welcomes the member in Spanish without claiming an email was sent", async () => {
        render(<Page />);

        expect(await screen.findByText(VERIFY_PAID_TITLE)).toBeTruthy();
        expect(VERIFY_PAID_TITLE).toBe(
            "¡Pago completado! Ya eres parte de fit-leads membresía",
        );
        expect(document.body.textContent).not.toMatch(/email|correo/i);
        expect(document.body.textContent).not.toMatch(/academia/i);
    });

    it("continues into the purchased content", async () => {
        render(<Page />);
        await screen.findByText(VERIFY_PAID_TITLE);

        const cta = screen.getByRole("link", { name: /ir a mi contenido/i });
        expect(cta.getAttribute("href")).toBe("/dashboard/my-content");
    });

    it("offers the WhatsApp join link and the consent management link", async () => {
        render(<Page />);
        await screen.findByText(VERIFY_PAID_TITLE);

        const join = screen.getByRole("link", { name: VERIFY_WHATSAPP_JOIN });
        expect(join.getAttribute("href")).toBe(
            "https://wa.me/34611124522?text=" +
                encodeURIComponent(
                    "Hola, acabo de unirme a la membresía fit-leads y quiero recibir los avisos por WhatsApp",
                ),
        );
        expect(join.getAttribute("target")).toBe("_blank");
        expect(join.getAttribute("rel")).toBe("noopener");

        const consent = screen.getByRole("link", {
            name: VERIFY_WHATSAPP_CONSENT_LINK,
        });
        expect(consent.getAttribute("href")).toBe(
            "/cuenta/whatsapp?src=post-checkout",
        );
    });
});
