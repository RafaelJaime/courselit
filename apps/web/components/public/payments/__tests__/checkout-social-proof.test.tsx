import { fireEvent, render, screen } from "@testing-library/react";
import { CheckoutSocialProof } from "../checkout-social-proof";
import {
    CHECKOUT_CLIENT_HANDLES,
    CHECKOUT_TESTIMONIALS,
} from "../checkout-social-proof-config";
import {
    CHECKOUT_CLIENTS_HEADING,
    CHECKOUT_TESTIMONIALS_HEADING,
} from "@ui-config/strings";

describe("CheckoutSocialProof", () => {
    it("shows every testimonial poster and loads no video up front", () => {
        const { container } = render(<CheckoutSocialProof />);

        expect(
            screen.getByRole("heading", {
                name: CHECKOUT_TESTIMONIALS_HEADING,
            }),
        ).toBeTruthy();
        expect(
            screen.getAllByRole("button", { name: /Reproducir testimonio/ }),
        ).toHaveLength(CHECKOUT_TESTIMONIALS.length);
        expect(container.querySelectorAll("video")).toHaveLength(0);
        expect(
            container.querySelectorAll(
                "img[src*='/landing/assets/testimonios/']",
            ),
        ).toHaveLength(CHECKOUT_TESTIMONIALS.length);
    });

    it("loads the video only after the visitor clicks its poster", () => {
        const { container } = render(<CheckoutSocialProof />);
        const first = CHECKOUT_TESTIMONIALS[0];

        fireEvent.click(
            screen.getByRole("button", {
                name: `Reproducir testimonio de ${first.handle}`,
            }),
        );

        const videos = container.querySelectorAll("video");
        expect(videos).toHaveLength(1);
        expect(videos[0].getAttribute("src")).toBe(first.video);
        expect(videos[0].getAttribute("poster")).toBe(first.poster);
        expect(videos[0].hasAttribute("controls")).toBe(true);
    });

    it("renders the clients wall with lazy avatars", () => {
        const { container } = render(<CheckoutSocialProof />);

        expect(
            screen.getByRole("heading", { name: CHECKOUT_CLIENTS_HEADING }),
        ).toBeTruthy();
        const avatars = container.querySelectorAll(
            "img[src*='/landing/assets/clientes/']",
        );
        expect(avatars).toHaveLength(CHECKOUT_CLIENT_HANDLES.length);
        avatars.forEach((img) => {
            expect(img.getAttribute("loading")).toBe("lazy");
        });
    });
});
