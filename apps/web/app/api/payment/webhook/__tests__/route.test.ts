/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import DomainModel from "@models/Domain";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import InvoiceModel from "@models/Invoice";
import { POST } from "../route";

jest.mock("@models/Domain");
jest.mock("@models/Membership");
jest.mock("@models/PaymentPlan");
jest.mock("@models/Invoice");
jest.mock("@/payments-new", () => ({ getPaymentMethod: jest.fn() }));
jest.mock("../../helpers", () => ({ activateMembership: jest.fn() }));
jest.mock("../../guest-checkout", () => ({
    resolveGuestMembership: jest.fn(),
}));
jest.mock("@/services/logger", () => ({ error: jest.fn() }));

const { getPaymentMethod } = jest.requireMock("@/payments-new");
const { activateMembership } = jest.requireMock("../../helpers");
const { resolveGuestMembership } = jest.requireMock("../../guest-checkout");

const domain = {
    _id: new mongoose.Types.ObjectId("666666666666666666666666"),
    name: "school",
};

const plan = {
    planId: "plan-1",
    type: Constants.PaymentPlanType.ONE_TIME,
    oneTimeAmount: 10,
};

describe("payment webhook", () => {
    const request = {
        json: jest
            .fn()
            .mockResolvedValue({ type: "checkout.session.completed" }),
        headers: { get: jest.fn().mockReturnValue("school") },
    } as unknown as NextRequest;

    const pendingInvoice = () => ({
        status: Constants.InvoiceStatus.PENDING,
        save: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (DomainModel.findOne as jest.Mock).mockResolvedValue(domain);
        (getPaymentMethod as jest.Mock).mockResolvedValue({
            name: "stripe",
            verify: jest.fn().mockResolvedValue(true),
            getMetadata: jest.fn().mockReturnValue({
                membershipId: "placeholder",
                invoiceId: "inv-1",
                currencyISOCode: "EUR",
            }),
            getPaymentIdentifier: jest.fn().mockReturnValue("cs_1"),
            getName: jest.fn().mockReturnValue("stripe"),
        });
        (PaymentPlanModel.findOne as jest.Mock).mockResolvedValue(plan);
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(pendingInvoice());
    });

    it("keeps the ordinary flow when the membership already exists", async () => {
        const membership = {
            membershipId: "placeholder",
            paymentPlanId: "plan-1",
        };
        (MembershipModel.findOne as jest.Mock).mockResolvedValue(membership);

        const response = await POST(request);

        expect((await response.json()).message).toBe("success");
        expect(resolveGuestMembership).not.toHaveBeenCalled();
        expect(activateMembership).toHaveBeenCalledWith(
            domain,
            membership,
            plan,
        );
    });

    it("creates the account and activates the membership of a guest payment", async () => {
        const membership = { membershipId: "real", paymentPlanId: "plan-1" };
        (MembershipModel.findOne as jest.Mock).mockResolvedValue(null);
        resolveGuestMembership.mockResolvedValue(membership);

        const response = await POST(request);

        expect((await response.json()).message).toBe("success");
        expect(resolveGuestMembership).toHaveBeenCalledWith({
            domain,
            invoiceId: "inv-1",
        });
        expect(activateMembership).toHaveBeenCalledWith(
            domain,
            membership,
            plan,
        );
    });

    it("reports a missing membership when the payment is not a guest one", async () => {
        (MembershipModel.findOne as jest.Mock).mockResolvedValue(null);
        resolveGuestMembership.mockResolvedValue(null);

        const response = await POST(request);

        expect((await response.json()).message).toBe("Membership not found");
        expect(activateMembership).not.toHaveBeenCalled();
    });
});
