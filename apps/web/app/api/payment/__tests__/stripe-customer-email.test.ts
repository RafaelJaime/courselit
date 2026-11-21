/**
 * @jest-environment node
 */

import { Constants } from "@courselit/common-models";
import StripePayment from "../../../../payments-new/stripe-payment";

jest.mock("stripe", () => jest.fn());

describe("StripePayment.initiate customer email", () => {
    const create = jest.fn().mockResolvedValue({ id: "cs_1" });
    let payment: StripePayment;

    const initiate = (customerEmail?: string) =>
        payment.initiate({
            metadata: { membershipId: "m", invoiceId: "i" },
            paymentPlan: {
                type: Constants.PaymentPlanType.ONE_TIME,
                oneTimeAmount: 10,
            } as any,
            product: {
                id: "c1",
                title: "Course",
                type: Constants.MembershipEntityType.COURSE,
            },
            origin: "https://school.test",
            customerEmail,
        });

    beforeEach(() => {
        jest.clearAllMocks();
        payment = new StripePayment({ currencyISOCode: "eur" } as any);
        payment.stripe = { checkout: { sessions: { create } } };
    });

    it("prefills the checkout page with the buyer email", async () => {
        await initiate("buyer@example.com");

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ customer_email: "buyer@example.com" }),
        );
    });

    it("leaves the email out when none is given", async () => {
        await initiate();

        expect(create.mock.calls[0][0]).not.toHaveProperty("customer_email");
    });
});
