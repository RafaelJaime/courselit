import { createHash, randomBytes, timingSafeEqual } from "crypto";
import mongoose from "mongoose";
import { Constants, Membership } from "@courselit/common-models";
import type { Domain } from "@models/Domain";
import InvoiceModel from "@models/Invoice";
import MembershipModel from "@models/Membership";
import UserModel from "@models/User";
import { createUser, getMembership } from "@/graphql/users/logic";
import { getAuth } from "@/auth";
import { getBackendAddress } from "@/app/actions";
import { als } from "../../../async-local-storage";
import { sanitizeEmail } from "@/lib/sanitize-email";
import constants from "@config/constants";
import { error } from "@/services/logger";
import { GUEST_CLAIM_ALS_KEY } from "./guest-account";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GUEST_CLAIM_COOKIE = "courselit_guest_claim";
const GUEST_CLAIM_MAX_AGE_SECONDS = 24 * 60 * 60;
const GUEST_CLAIM_WINDOW_MS = 60 * 60 * 1000;

const hashToken = (token: string) =>
    createHash("sha256").update(token).digest("hex");

/** A secret that ties a guest checkout to the browser that started it. */
export function createGuestClaim(): { token: string; hash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: hashToken(token) };
}

export function buildGuestClaimCookie(token: string, secure: boolean) {
    return [
        `${GUEST_CLAIM_COOKIE}=${token}`,
        "HttpOnly",
        ...(secure ? ["Secure"] : []),
        "SameSite=Lax",
        "Path=/api/payment",
        `Max-Age=${GUEST_CLAIM_MAX_AGE_SECONDS}`,
    ].join("; ");
}

function clearGuestClaimCookie() {
    return `${GUEST_CLAIM_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/payment; Max-Age=0`;
}

function readGuestClaimToken(headers: Headers): string | null {
    const cookies = headers.get("cookie") || "";
    for (const part of cookies.split(";")) {
        const [name, ...value] = part.trim().split("=");
        if (name === GUEST_CLAIM_COOKIE) {
            return value.join("=") || null;
        }
    }
    return null;
}

function claimMatches(token: string | null, storedHash?: string) {
    if (!token || !storedHash) {
        return false;
    }
    const given = new Uint8Array(Buffer.from(hashToken(token), "hex"));
    const stored = new Uint8Array(Buffer.from(storedHash, "hex"));
    return given.length === stored.length && timingSafeEqual(given, stored);
}

type DomainWithId = Domain & { _id: mongoose.Types.ObjectId };

export function isGuestCheckoutEnabled(domain: {
    settings?: { guestCheckout?: boolean };
}): boolean {
    return domain.settings?.guestCheckout === true;
}

export function parseGuestEmail(raw: unknown): string | null {
    if (typeof raw !== "string") {
        return null;
    }
    const email = sanitizeEmail(raw);
    return EMAIL_PATTERN.test(email) ? email : null;
}

/**
 * Called when the payment provider confirms a guest payment. Finds or creates
 * the buyer's account, then finds or creates the membership the rest of the
 * webhook works on. Safe to call again for the same invoice.
 */
export interface GuestMembershipResolution {
    membership: Membership;
    /**
     * The email belongs to a member who already has (or was refused) access.
     * The membership was left alone; only the payment needs recording.
     */
    protectedExisting: boolean;
}

export async function resolveGuestMembership({
    domain,
    invoiceId,
}: {
    domain: DomainWithId;
    invoiceId: string;
}): Promise<GuestMembershipResolution | null> {
    const invoice = await InvoiceModel.findOne({
        domain: domain._id,
        invoiceId,
    });
    if (!invoice || !invoice.guestEmail) {
        return null;
    }

    if (invoice.guestUserId) {
        const membership = await MembershipModel.findOne({
            domain: domain._id,
            membershipId: invoice.membershipId,
        });
        return membership ? { membership, protectedExisting: false } : null;
    }

    // Legacy users may be stored with other casing or stray spaces.
    const emailPattern = new RegExp(
        `^\\s*${invoice.guestEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i",
    );
    const findUser = () =>
        UserModel.findOne({ domain: domain._id, email: emailPattern });
    let existingUser = await findUser();
    let user = existingUser;
    if (!user) {
        try {
            user = await createUser({
                domain: domain as any,
                email: invoice.guestEmail,
                lead: constants.leadWebsite,
            });
            // The payer has not proven the email: see guest-account.ts.
            await UserModel.updateOne(
                { domain: domain._id, userId: user.userId },
                { $set: { guestUnverified: true } },
            );
        } catch (err: any) {
            // A concurrent webhook created it first. Whoever it belongs to,
            // it is not treated as created by this checkout (fail safe).
            if (err?.code !== 11000) {
                throw err;
            }
            user = existingUser = await findUser();
            if (!user) {
                throw err;
            }
        }
    }

    const membership = await getMembership({
        domainId: domain._id,
        userId: user.userId,
        entityType: invoice.guestEntityType!,
        entityId: invoice.guestEntityId!,
        planId: invoice.guestPlanId!,
    });
    if (
        membership.status === Constants.MembershipStatus.ACTIVE ||
        membership.status === Constants.MembershipStatus.REJECTED
    ) {
        // Never rewrite someone's live (or refused) membership: that would
        // orphan their subscription. The money was taken, so record the
        // payment and flag it for a refund.
        error(
            "Guest checkout paid for a membership that was already active or rejected; refund the payment",
            {
                invoiceId,
                membershipId: membership.membershipId,
                userId: user.userId,
            },
        );
        await InvoiceModel.updateOne(
            {
                domain: domain._id,
                invoiceId,
                guestUserId: { $exists: false },
            },
            {
                $set: {
                    guestUserId: user.userId,
                    guestAccountCreated: false,
                },
            },
        );
        return { membership, protectedExisting: true };
    }

    membership.paymentPlanId = invoice.guestPlanId!;
    membership.sessionId = invoice.membershipSessionId;
    membership.subscriptionId = undefined;
    membership.subscriptionMethod = undefined;
    await membership.save();

    // Only the first writer decides whether the account was created here.
    await InvoiceModel.updateOne(
        {
            domain: domain._id,
            invoiceId,
            guestUserId: { $exists: false },
        },
        {
            $set: {
                membershipId: membership.membershipId,
                guestUserId: user.userId,
                guestAccountCreated: !existingUser,
            },
        },
    );

    return { membership, protectedExisting: false };
}

export type GuestSessionResult =
    | { outcome: "not-guest" }
    | { outcome: "pending" }
    | { outcome: "existing-account" }
    | { outcome: "already-claimed" }
    | { outcome: "signed-in"; setCookies: string[] };

/**
 * Signs the buyer in when they return from the payment provider, but only for
 * an account this paid checkout created, and only once per invoice. An account
 * that existed before must sign in with its own email code, otherwise typing
 * someone else's email at checkout would be enough to take over their account.
 */
export async function claimGuestSession({
    domain,
    invoiceId,
    headers,
}: {
    domain: DomainWithId;
    invoiceId: string;
    headers: Headers;
}): Promise<GuestSessionResult> {
    const invoice = await InvoiceModel.findOne({
        domain: domain._id,
        invoiceId,
    });
    if (!invoice || !invoice.guestEmail) {
        return { outcome: "not-guest" };
    }
    if (invoice.status !== Constants.InvoiceStatus.PAID) {
        return { outcome: "pending" };
    }
    if (!invoice.guestAccountCreated) {
        return { outcome: "existing-account" };
    }

    // The buyer must come back with the browser that started the checkout,
    // within an hour of paying. Otherwise the purchase stands, but they sign
    // in with their email code like any existing account.
    const paidRecently =
        !!invoice.guestPaidAt &&
        Date.now() - new Date(invoice.guestPaidAt).getTime() <=
            GUEST_CLAIM_WINDOW_MS;
    if (
        !paidRecently ||
        !claimMatches(readGuestClaimToken(headers), invoice.guestClaimTokenHash)
    ) {
        return { outcome: "existing-account" };
    }

    const claimed = await InvoiceModel.findOneAndUpdate(
        {
            domain: domain._id,
            invoiceId,
            status: Constants.InvoiceStatus.PAID,
            guestAccountCreated: true,
            guestSignInClaimedAt: { $exists: false },
            guestPaidAt: { $gte: new Date(Date.now() - GUEST_CLAIM_WINDOW_MS) },
        },
        { $set: { guestSignInClaimedAt: new Date() } },
    );
    if (!claimed) {
        return { outcome: "already-claimed" };
    }

    try {
        const setCookies = await createSessionCookies(
            invoice.guestEmail,
            headers,
        );
        return {
            outcome: "signed-in",
            setCookies: [...setCookies, clearGuestClaimCookie()],
        };
    } catch (err) {
        await InvoiceModel.updateOne(
            { domain: domain._id, invoiceId },
            { $unset: { guestSignInClaimedAt: "" } },
        );
        throw err;
    }
}

// getAuth() is built from an untyped config, so the email OTP plugin endpoints
// are not part of its inferred API type.
interface EmailOtpApi {
    createVerificationOTP(args: {
        body: { email: string; type: "sign-in" };
        headers: Headers;
    }): Promise<string>;
    signInEmailOTP(args: {
        body: { email: string; otp: string };
        headers: Headers;
        asResponse: true;
    }): Promise<Response>;
}

async function createSessionCookies(
    email: string,
    headers: Headers,
): Promise<string[]> {
    const origin = await getBackendAddress(headers);
    const api = getAuth(origin).api as unknown as EmailOtpApi;
    const store = new Map<string, any>();
    store.set("domain", headers.get("domain"));
    store.set("domainId", headers.get("domainId"));
    store.set(GUEST_CLAIM_ALS_KEY, true);

    return als.run(store, async () => {
        const otp = await api.createVerificationOTP({
            body: { email, type: "sign-in" },
            headers,
        });
        const response = await api.signInEmailOTP({
            body: { email, otp },
            headers,
            asResponse: true,
        });
        return response.headers.getSetCookie();
    });
}
