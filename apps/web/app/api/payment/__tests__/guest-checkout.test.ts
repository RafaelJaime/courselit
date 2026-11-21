/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import InvoiceModel from "@models/Invoice";
import UserModel from "@models/User";
import MembershipModel from "@models/Membership";
import {
    claimGuestSession,
    isGuestCheckoutEnabled,
    parseGuestEmail,
    resolveGuestMembership,
} from "../guest-checkout";

jest.mock("@models/Invoice");
jest.mock("@models/User");
jest.mock("@models/Membership");
jest.mock("@/graphql/users/logic", () => ({
    createUser: jest.fn(),
    getMembership: jest.fn(),
}));
jest.mock("@/auth", () => ({
    getAuth: jest.fn(),
}));
jest.mock("@/app/actions", () => ({
    getBackendAddress: jest.fn().mockResolvedValue("https://school.test"),
}));

const { createUser, getMembership } = jest.requireMock("@/graphql/users/logic");
const { getAuth } = jest.requireMock("@/auth");

const domain = {
    _id: new mongoose.Types.ObjectId("666666666666666666666666"),
    name: "school",
    settings: {},
} as any;

const buildInvoice = (overrides: Record<string, unknown> = {}) => ({
    invoiceId: "inv-1",
    membershipId: "placeholder-membership",
    membershipSessionId: "session-from-invoice",
    status: Constants.InvoiceStatus.PENDING,
    guestEmail: "buyer@example.com",
    guestEntityId: "course-1",
    guestEntityType: Constants.MembershipEntityType.COURSE,
    guestPlanId: "plan-1",
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
});

const buildMembership = () => ({
    membershipId: "real-membership",
    userId: "user-1",
    sessionId: "old-session",
    paymentPlanId: "plan-1",
    subscriptionId: "old-sub",
    subscriptionMethod: "stripe",
    save: jest.fn().mockResolvedValue(undefined),
});

describe("isGuestCheckoutEnabled", () => {
    it("is off unless the domain setting is explicitly true", () => {
        expect(isGuestCheckoutEnabled({ settings: {} } as any)).toBe(false);
        expect(isGuestCheckoutEnabled({} as any)).toBe(false);
        expect(
            isGuestCheckoutEnabled({
                settings: { guestCheckout: false },
            } as any),
        ).toBe(false);
        expect(
            isGuestCheckoutEnabled({
                settings: { guestCheckout: true },
            } as any),
        ).toBe(true);
    });
});

describe("parseGuestEmail", () => {
    it("lowercases and trims a valid email", () => {
        expect(parseGuestEmail("  Buyer@Example.COM ")).toBe(
            "buyer@example.com",
        );
    });

    it.each([undefined, null, "", "   ", "no-at-sign", "a@b", 42, "a b@c.de"])(
        "rejects %p",
        (value) => {
            expect(parseGuestEmail(value as any)).toBeNull();
        },
    );
});

describe("resolveGuestMembership", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns null when the invoice does not exist or is not a guest one", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValueOnce(null);
        expect(
            await resolveGuestMembership({ domain, invoiceId: "nope" }),
        ).toBeNull();

        (InvoiceModel.findOne as jest.Mock).mockResolvedValueOnce(
            buildInvoice({ guestEmail: undefined }),
        );
        expect(
            await resolveGuestMembership({ domain, invoiceId: "inv-1" }),
        ).toBeNull();
        expect(createUser).not.toHaveBeenCalled();
    });

    it("creates the user and membership when the payment is confirmed", async () => {
        const invoice = buildInvoice();
        const membership = buildMembership();
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(invoice);
        (UserModel.findOne as jest.Mock).mockResolvedValue(null);
        createUser.mockResolvedValue({ userId: "user-1" });
        getMembership.mockResolvedValue(membership);

        const result = await resolveGuestMembership({
            domain,
            invoiceId: "inv-1",
        });

        expect(createUser).toHaveBeenCalledWith(
            expect.objectContaining({ domain, email: "buyer@example.com" }),
        );
        expect(getMembership).toHaveBeenCalledWith({
            domainId: domain._id,
            userId: "user-1",
            entityType: Constants.MembershipEntityType.COURSE,
            entityId: "course-1",
            planId: "plan-1",
        });
        expect(result).toBe(membership);
        expect(membership.paymentPlanId).toBe("plan-1");
        expect(membership.sessionId).toBe("session-from-invoice");
        expect(membership.subscriptionId).toBeUndefined();
        expect(membership.subscriptionMethod).toBeUndefined();
        expect(membership.save).toHaveBeenCalled();
        expect(invoice.membershipId).toBe("real-membership");
        expect((invoice as any).guestUserId).toBe("user-1");
        expect((invoice as any).guestAccountCreated).toBe(true);
        expect(invoice.save).toHaveBeenCalled();
    });

    it("reuses an account that already existed and records that it was not created here", async () => {
        const invoice = buildInvoice();
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(invoice);
        (UserModel.findOne as jest.Mock).mockResolvedValue({
            userId: "user-9",
        });
        getMembership.mockResolvedValue(buildMembership());

        await resolveGuestMembership({ domain, invoiceId: "inv-1" });

        expect(createUser).not.toHaveBeenCalled();
        expect(getMembership).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "user-9" }),
        );
        expect((invoice as any).guestAccountCreated).toBe(false);
        expect((invoice as any).guestUserId).toBe("user-9");
    });

    it("is idempotent when the webhook is delivered twice", async () => {
        const membership = buildMembership();
        const invoice = buildInvoice({
            guestUserId: "user-1",
            guestAccountCreated: true,
            membershipId: "real-membership",
        });
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(invoice);
        (MembershipModel.findOne as jest.Mock).mockResolvedValue(membership);

        const result = await resolveGuestMembership({
            domain,
            invoiceId: "inv-1",
        });

        expect(result).toBe(membership);
        expect(createUser).not.toHaveBeenCalled();
        expect(getMembership).not.toHaveBeenCalled();
        expect((invoice as any).guestAccountCreated).toBe(true);
    });
});

describe("claimGuestSession", () => {
    const headers = new Headers({ domain: "school" });
    let createVerificationOTP: jest.Mock;
    let signInEmailOTP: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        createVerificationOTP = jest.fn().mockResolvedValue("123456");
        const signInHeaders = new Headers();
        signInHeaders.append(
            "set-cookie",
            "courselit.session_token=abc; Path=/",
        );
        signInHeaders.append(
            "set-cookie",
            "courselit.session_data=def; Path=/",
        );
        signInEmailOTP = jest
            .fn()
            .mockResolvedValue(new Response("{}", { headers: signInHeaders }));
        getAuth.mockReturnValue({
            api: { createVerificationOTP, signInEmailOTP },
        });
    });

    it("reports not-guest when the invoice is missing or is an ordinary one", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValueOnce(null);
        expect(
            await claimGuestSession({ domain, invoiceId: "x", headers }),
        ).toEqual({ outcome: "not-guest" });

        (InvoiceModel.findOne as jest.Mock).mockResolvedValueOnce(
            buildInvoice({ guestEmail: undefined }),
        );
        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "not-guest" });
    });

    it("does nothing while the payment is still pending", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(buildInvoice());

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "pending" });
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("never signs in an account that existed before the checkout", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            buildInvoice({
                status: Constants.InvoiceStatus.PAID,
                guestAccountCreated: false,
            }),
        );

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "existing-account" });
        expect(InvoiceModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(createVerificationOTP).not.toHaveBeenCalled();
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("signs in the account created by the paid checkout, once", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            buildInvoice({
                status: Constants.InvoiceStatus.PAID,
                guestAccountCreated: true,
            }),
        );
        (InvoiceModel.findOneAndUpdate as jest.Mock).mockResolvedValue({
            invoiceId: "inv-1",
        });

        const result = await claimGuestSession({
            domain,
            invoiceId: "inv-1",
            headers,
        });

        expect(InvoiceModel.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                invoiceId: "inv-1",
                status: Constants.InvoiceStatus.PAID,
                guestAccountCreated: true,
                guestSignInClaimedAt: { $exists: false },
            }),
            { $set: { guestSignInClaimedAt: expect.any(Date) } },
        );
        expect(createVerificationOTP).toHaveBeenCalledWith(
            expect.objectContaining({
                body: { email: "buyer@example.com", type: "sign-in" },
            }),
        );
        expect(signInEmailOTP).toHaveBeenCalledWith(
            expect.objectContaining({
                body: { email: "buyer@example.com", otp: "123456" },
                asResponse: true,
            }),
        );
        expect(result).toEqual({
            outcome: "signed-in",
            setCookies: [
                "courselit.session_token=abc; Path=/",
                "courselit.session_data=def; Path=/",
            ],
        });
    });

    it("refuses to mint a second session when the return URL is replayed", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            buildInvoice({
                status: Constants.InvoiceStatus.PAID,
                guestAccountCreated: true,
                guestSignInClaimedAt: new Date(),
            }),
        );
        (InvoiceModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "already-claimed" });
        expect(createVerificationOTP).not.toHaveBeenCalled();
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("releases the claim when the session could not be created", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            buildInvoice({
                status: Constants.InvoiceStatus.PAID,
                guestAccountCreated: true,
            }),
        );
        (InvoiceModel.findOneAndUpdate as jest.Mock).mockResolvedValue({
            invoiceId: "inv-1",
        });
        signInEmailOTP.mockRejectedValue(new Error("boom"));

        await expect(
            claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).rejects.toThrow("boom");
        expect(InvoiceModel.updateOne).toHaveBeenCalledWith(
            { domain: domain._id, invoiceId: "inv-1" },
            { $unset: { guestSignInClaimedAt: "" } },
        );
    });
});
