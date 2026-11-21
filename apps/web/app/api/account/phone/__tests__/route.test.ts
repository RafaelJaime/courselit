/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import UserModel from "@models/User";
import { POST } from "../route";

jest.mock("@models/User");
jest.mock("@/auth", () => ({
    auth: { api: { getSession: jest.fn() } },
}));
jest.mock("../../../payment/initiate/route", () => ({
    getDomain: jest.fn(),
    getUser: jest.fn(),
}));
jest.mock("@/services/logger", () => ({ error: jest.fn() }));

const { getDomain, getUser } = jest.requireMock(
    "../../../payment/initiate/route",
);

const domain = {
    _id: new mongoose.Types.ObjectId("666666666666666666666666"),
};

const buildRequest = (body: Record<string, unknown>) =>
    ({
        json: jest.fn().mockResolvedValue(body),
        headers: new Headers({ domain: "school" }),
    }) as unknown as NextRequest;

describe("account phone route", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getDomain.mockResolvedValue(domain);
        getUser.mockResolvedValue({ userId: "user-1" });
    });

    it("requires a session", async () => {
        getUser.mockResolvedValue(null);

        const response = await POST(buildRequest({ phone: "+34 600 111 222" }));

        expect(response.status).toBe(401);
        expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it.each(["", "abc", "12", "+34 <script>", undefined])(
        "rejects the phone %p",
        async (phone) => {
            const response = await POST(buildRequest({ phone }));

            expect(response.status).toBe(400);
            expect(UserModel.updateOne).not.toHaveBeenCalled();
        },
    );

    it("stores a trimmed phone on the logged-in user", async () => {
        const response = await POST(
            buildRequest({ phone: "  +34 600 111 222 " }),
        );

        expect(response.status).toBe(200);
        expect(UserModel.updateOne).toHaveBeenCalledWith(
            { domain: domain._id, userId: "user-1" },
            { $set: { phone: "+34 600 111 222" } },
        );
    });
});
