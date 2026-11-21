import { formatSiteInfo } from "../format-site-info";

describe("formatSiteInfo", () => {
    it("passes guestCheckout through when the site enables it", () => {
        expect(formatSiteInfo({ guestCheckout: true }).guestCheckout).toBe(
            true,
        );
    });

    it("defaults guestCheckout to false when the setting is missing", () => {
        expect(formatSiteInfo({}).guestCheckout).toBe(false);
        expect(formatSiteInfo(undefined).guestCheckout).toBe(false);
    });

    it("keeps the payment settings the checkout depends on", () => {
        const info = formatSiteInfo({
            paymentMethod: "stripe",
            stripeKey: "pk_test_x",
        });

        expect(info.paymentMethod).toBe("stripe");
        expect(info.stripeKey).toBe("pk_test_x");
    });
});
