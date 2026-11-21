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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
export async function resolveGuestMembership({
    domain,
    invoiceId,
}: {
    domain: DomainWithId;
    invoiceId: string;
}): Promise<Membership | null> {
    const invoice = await InvoiceModel.findOne({
        domain: domain._id,
        invoiceId,
    });
    if (!invoice || !invoice.guestEmail) {
        return null;
    }

    if (invoice.guestUserId) {
        return MembershipModel.findOne({
            domain: domain._id,
            membershipId: invoice.membershipId,
        });
    }

    const existingUser = await UserModel.findOne({
        domain: domain._id,
        email: invoice.guestEmail,
    });
    const user =
        existingUser ||
        (await createUser({
            domain: domain as any,
            email: invoice.guestEmail,
            lead: constants.leadWebsite,
        }));

    const membership = await getMembership({
        domainId: domain._id,
        userId: user.userId,
        entityType: invoice.guestEntityType!,
        entityId: invoice.guestEntityId!,
        planId: invoice.guestPlanId!,
    });
    membership.paymentPlanId = invoice.guestPlanId!;
    membership.sessionId = invoice.membershipSessionId;
    membership.subscriptionId = undefined;
    membership.subscriptionMethod = undefined;
    await membership.save();

    invoice.membershipId = membership.membershipId;
    invoice.guestUserId = user.userId;
    invoice.guestAccountCreated = !existingUser;
    await invoice.save();

    return membership;
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

    const claimed = await InvoiceModel.findOneAndUpdate(
        {
            domain: domain._id,
            invoiceId,
            status: Constants.InvoiceStatus.PAID,
            guestAccountCreated: true,
            guestSignInClaimedAt: { $exists: false },
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
        return { outcome: "signed-in", setCookies };
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
