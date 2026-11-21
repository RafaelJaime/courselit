/**
 * @jest-environment node
 */

import UserModel from "@models/User";
import { revokeGuestSessionsAfterOtpSignIn } from "../guest-account";

jest.mock("@models/User");

describe("revokeGuestSessionsAfterOtpSignIn", () => {
    const sessions = [
        { token: "payer-session" },
        { token: "owner-session" },
        { token: "payer-session-2" },
    ];
    let internalAdapter: {
        listSessions: jest.Mock;
        deleteSession: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        internalAdapter = {
            listSessions: jest.fn().mockResolvedValue(sessions),
            deleteSession: jest.fn().mockResolvedValue(undefined),
        };
    });

    it("revokes every other session and clears the flag after a real OTP sign-in", async () => {
        (UserModel.findOne as jest.Mock).mockResolvedValue({ _id: "u1" });

        const result = await revokeGuestSessionsAfterOtpSignIn({
            userId: "u1",
            keepToken: "owner-session",
            isGuestClaim: false,
            internalAdapter,
        });

        expect(result).toBe(true);
        expect(UserModel.findOne).toHaveBeenCalledWith({
            _id: "u1",
            guestUnverified: true,
        });
        expect(internalAdapter.deleteSession).toHaveBeenCalledTimes(2);
        expect(internalAdapter.deleteSession).toHaveBeenCalledWith(
            "payer-session",
        );
        expect(internalAdapter.deleteSession).toHaveBeenCalledWith(
            "payer-session-2",
        );
        expect(internalAdapter.deleteSession).not.toHaveBeenCalledWith(
            "owner-session",
        );
        expect(UserModel.updateOne).toHaveBeenCalledWith(
            { _id: "u1" },
            { $unset: { guestUnverified: "" } },
        );
    });

    it("does nothing for the guest claim sign-in itself", async () => {
        const result = await revokeGuestSessionsAfterOtpSignIn({
            userId: "u1",
            keepToken: "payer-session",
            isGuestClaim: true,
            internalAdapter,
        });

        expect(result).toBe(false);
        expect(UserModel.findOne).not.toHaveBeenCalled();
        expect(internalAdapter.deleteSession).not.toHaveBeenCalled();
        expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it("does nothing for users that are not flagged", async () => {
        (UserModel.findOne as jest.Mock).mockResolvedValue(null);

        const result = await revokeGuestSessionsAfterOtpSignIn({
            userId: "u2",
            keepToken: "s",
            isGuestClaim: false,
            internalAdapter,
        });

        expect(result).toBe(false);
        expect(internalAdapter.deleteSession).not.toHaveBeenCalled();
        expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it("keeps the flag when revoking fails so the next sign-in retries", async () => {
        (UserModel.findOne as jest.Mock).mockResolvedValue({ _id: "u1" });
        internalAdapter.deleteSession.mockRejectedValue(new Error("db"));

        await expect(
            revokeGuestSessionsAfterOtpSignIn({
                userId: "u1",
                keepToken: "owner-session",
                isGuestClaim: false,
                internalAdapter,
            }),
        ).rejects.toThrow("db");
        expect(UserModel.updateOne).not.toHaveBeenCalled();
    });
});
