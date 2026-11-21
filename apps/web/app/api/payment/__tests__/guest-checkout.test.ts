/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import InvoiceModel from "@models/Invoice";
import UserModel from "@models/User";
import MembershipModel from "@models/Membership";
import { createHash } from "crypto";
import {
    GUEST_CLAIM_COOKIE,
    buildGuestClaimCookie,
    claimGuestSession,
    createGuestClaim,
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
        expect(InvoiceModel.updateOne).toHaveBeenCalledWith(
            {
                domain: domain._id,
                invoiceId: "inv-1",
                guestUserId: { $exists: false },
            },
            {
                $set: {
                    membershipId: "real-membership",
                    guestUserId: "user-1",
                    guestAccountCreated: true,
                },
            },
        );
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
        expect(InvoiceModel.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ guestUserId: { $exists: false } }),
            {
                $set: expect.objectContaining({
                    guestUserId: "user-9",
                    guestAccountCreated: false,
                }),
            },
        );
    });

    it("re-reads the user when a concurrent webhook created it first", async () => {
        const invoice = buildInvoice();
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(invoice);
        (UserModel.findOne as jest.Mock)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ userId: "user-7" });
        createUser.mockRejectedValue(
            Object.assign(new Error("dup"), { code: 11000 }),
        );
        getMembership.mockResolvedValue(buildMembership());

        await resolveGuestMembership({ domain, invoiceId: "inv-1" });

        expect(getMembership).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "user-7" }),
        );
        expect(InvoiceModel.updateOne).toHaveBeenCalledWith(expect.anything(), {
            $set: expect.objectContaining({
                guestUserId: "user-7",
                guestAccountCreated: false,
            }),
        });
    });

    it("rethrows creation errors that are not duplicates", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(buildInvoice());
        (UserModel.findOne as jest.Mock).mockResolvedValue(null);
        createUser.mockRejectedValue(new Error("db down"));

        await expect(
            resolveGuestMembership({ domain, invoiceId: "inv-1" }),
        ).rejects.toThrow("db down");
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
        expect(InvoiceModel.updateOne).not.toHaveBeenCalled();
    });
});

describe("guest claim cookie", () => {
    it("creates a random secret and only its SHA-256 hash is meant to be stored", () => {
        const a = createGuestClaim();
        const b = createGuestClaim();

        expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(a.token).not.toBe(b.token);
        expect(a.hash).toBe(createHash("sha256").update(a.token).digest("hex"));
    });

    it("builds an httpOnly, SameSite=Lax cookie scoped to the payment API", () => {
        const cookie = buildGuestClaimCookie("tok", true);

        expect(cookie).toContain(`${GUEST_CLAIM_COOKIE}=tok`);
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("Secure");
        expect(cookie).toContain("SameSite=Lax");
        expect(cookie).toContain("Path=/api/payment");
        expect(cookie).toContain("Max-Age=86400");
        expect(buildGuestClaimCookie("tok", false)).not.toContain("Secure");
    });
});

describe("claimGuestSession", () => {
    const secret = "the-browser-secret";
    const hash = createHash("sha256").update(secret).digest("hex");
    const headers = new Headers({
        domain: "school",
        cookie: `other=1; ${GUEST_CLAIM_COOKIE}=${secret}`,
    });
    let createVerificationOTP: jest.Mock;
    let signInEmailOTP: jest.Mock;

    const paidInvoice = (overrides: Record<string, unknown> = {}) =>
        buildInvoice({
            status: Constants.InvoiceStatus.PAID,
            guestAccountCreated: true,
            guestClaimTokenHash: hash,
            guestPaidAt: new Date(),
            ...overrides,
        });

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
            paidInvoice({ guestAccountCreated: false }),
        );

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "existing-account" });
        expect(InvoiceModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("signs in the account created by the paid checkout, once, and clears the claim cookie", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(paidInvoice());
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
                guestPaidAt: { $gte: expect.any(Date) },
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
        expect(result.outcome).toBe("signed-in");
        const cookies = (result as any).setCookies as string[];
        expect(cookies.slice(0, 2)).toEqual([
            "courselit.session_token=abc; Path=/",
            "courselit.session_data=def; Path=/",
        ]);
        expect(cookies[2]).toContain(`${GUEST_CLAIM_COOKIE}=;`);
        expect(cookies[2]).toContain("Max-Age=0");
    });

    it.each([
        ["no cookie", new Headers({ domain: "school" })],
        [
            "a cookie from another browser",
            new Headers({ cookie: `${GUEST_CLAIM_COOKIE}=someone-else` }),
        ],
    ])("treats %s like an existing account: no session", async (_n, h) => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(paidInvoice());

        expect(
            await claimGuestSession({
                domain,
                invoiceId: "inv-1",
                headers: h,
            }),
        ).toEqual({ outcome: "existing-account" });
        expect(InvoiceModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("treats an invoice without a stored claim hash as unclaimable", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            paidInvoice({ guestClaimTokenHash: undefined }),
        );

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "existing-account" });
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("stops signing in more than one hour after the payment", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            paidInvoice({
                guestPaidAt: new Date(Date.now() - 61 * 60 * 1000),
            }),
        );

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "existing-account" });
        expect(InvoiceModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("treats an invoice with no paid timestamp as expired", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            paidInvoice({ guestPaidAt: undefined }),
        );

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "existing-account" });
    });

    it("refuses to mint a second session when the return URL is replayed", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(
            paidInvoice({ guestSignInClaimedAt: new Date() }),
        );
        (InvoiceModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

        expect(
            await claimGuestSession({ domain, invoiceId: "inv-1", headers }),
        ).toEqual({ outcome: "already-claimed" });
        expect(signInEmailOTP).not.toHaveBeenCalled();
    });

    it("releases the claim when the session could not be created", async () => {
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue(paidInvoice());
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
