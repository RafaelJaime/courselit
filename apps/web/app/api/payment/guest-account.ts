import UserModel from "@models/User";

/** Set in the async context while claimGuestSession signs the payer in. */
export const GUEST_CLAIM_ALS_KEY = "guestClaim";

interface SessionAdapter {
    listSessions(userId: string): Promise<{ token: string }[]>;
    deleteSession(token: string): Promise<unknown>;
}

/**
 * An account created by a guest checkout was never proven to belong to the
 * payer. When its real owner signs in with an email code, every other session
 * (the payer's) is revoked and the account stops being flagged. The payer's
 * own sign-in right after paying (claimGuestSession) must not count.
 *
 * Returns true when sessions were revoked.
 */
export async function revokeGuestSessionsAfterOtpSignIn({
    userId,
    keepToken,
    isGuestClaim,
    internalAdapter,
}: {
    userId: string;
    keepToken: string;
    isGuestClaim: boolean;
    internalAdapter: SessionAdapter;
}): Promise<boolean> {
    if (isGuestClaim) {
        return false;
    }

    const flagged = await UserModel.findOne({
        _id: userId,
        guestUnverified: true,
    });
    if (!flagged) {
        return false;
    }

    const sessions = await internalAdapter.listSessions(userId);
    await Promise.all(
        sessions
            .filter((session) => session.token !== keepToken)
            .map((session) => internalAdapter.deleteSession(session.token)),
    );
    await UserModel.updateOne(
        { _id: userId },
        { $unset: { guestUnverified: "" } },
    );
    return true;
}
