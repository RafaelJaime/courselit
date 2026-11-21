/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import InvoiceModel from "@models/Invoice";
import MembershipModel from "@models/Membership";
import { POST } from "../route";

jest.mock("@models/Invoice");
jest.mock("@models/Membership");
jest.mock("@/auth", () => ({
    auth: { api: { getSession: jest.fn() } },
}));
jest.mock("../../initiate/route", () => ({
    getDomain: jest.fn(),
    getUser: jest.fn(),
}));
jest.mock("../../guest-checkout", () => ({
    claimGuestSession: jest.fn(),
}));
jest.mock("@/services/logger", () => ({ error: jest.fn() }));

const { auth } = jest.requireMock("@/auth");
const { getDomain, getUser } = jest.requireMock("../../initiate/route");
const { claimGuestSession } = jest.requireMock("../../guest-checkout");

const domain = {
    _id: new mongoose.Types.ObjectId("666666666666666666666666"),
    name: "school",
};

const buildRequest = (body: Record<string, unknown>) =>
    ({
        json: jest.fn().mockResolvedValue(body),
        headers: new Headers({ domain: "school" }),
    }) as unknown as NextRequest;

describe("verify-new route", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getDomain.mockResolvedValue(domain);
        auth.api.getSession.mockResolvedValue(null);
        getUser.mockResolvedValue(null);
    });

    it("rejects visitors without a session when the payment is not a guest one", async () => {
        claimGuestSession.mockResolvedValue({ outcome: "not-guest" });

        const response = await POST(buildRequest({ id: "inv-1" }));

        expect(response.status).toBe(401);
    });

    it("rejects a request without an invoice id", async () => {
        const response = await POST(buildRequest({}));

        expect(response.status).toBe(400);
        expect(claimGuestSession).not.toHaveBeenCalled();
    });

    it("still reports the invoice status to the logged-in owner", async () => {
        getUser.mockResolvedValue({ userId: "user-1" });
        (InvoiceModel.findOne as jest.Mock).mockResolvedValue({
            membershipId: "m-1",
            status: Constants.InvoiceStatus.PAID,
        });
        (MembershipModel.findOne as jest.Mock).mockResolvedValue({
            userId: "user-1",
        });

        const response = await POST(buildRequest({ id: "inv-1" }));

        expect(await response.json()).toEqual({ status: "paid" });
        expect(claimGuestSession).not.toHaveBeenCalled();
    });

    it("keeps a guest waiting while the payment is pending", async () => {
        claimGuestSession.mockResolvedValue({ outcome: "pending" });

        const response = await POST(buildRequest({ id: "inv-1" }));

        expect(await response.json()).toEqual({ status: "pending" });
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("sets the session cookies for the account created by the checkout", async () => {
        claimGuestSession.mockResolvedValue({
            outcome: "signed-in",
            setCookies: ["a=1; Path=/", "b=2; Path=/"],
        });

        const response = await POST(buildRequest({ id: "inv-1" }));

        expect(await response.json()).toEqual({
            status: "paid",
            guest: "signed-in",
        });
        expect(response.headers.getSetCookie()).toEqual([
            "a=1; Path=/",
            "b=2; Path=/",
        ]);
        expect(claimGuestSession).toHaveBeenCalledWith(
            expect.objectContaining({ domain, invoiceId: "inv-1" }),
        );
    });

    it.each(["existing-account", "already-claimed"])(
        "asks the guest to sign in with their code on %s, without cookies",
        async (outcome) => {
            claimGuestSession.mockResolvedValue({ outcome });

            const response = await POST(buildRequest({ id: "inv-1" }));

            expect(await response.json()).toEqual({
                status: "paid",
                guest: outcome,
            });
            expect(response.headers.getSetCookie()).toEqual([]);
        },
    );
});
