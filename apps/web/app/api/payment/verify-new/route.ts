import { NextRequest } from "next/server";
import { getDomain, getUser } from "../initiate/route";
import { auth } from "@/auth";
import { error } from "@/services/logger";
import InvoiceModel from "@models/Invoice";
import Membership from "@models/Membership";
import { claimGuestSession } from "../guest-checkout";

interface RequestPayload {
    id: string;
}

export async function POST(req: NextRequest) {
    const body: RequestPayload = await req.json();
    const domainName = req.headers.get("domain");

    try {
        const domain = await getDomain(domainName);
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }

        const session = await auth.api.getSession({
            headers: req.headers,
        });
        const user = await getUser(session, domain._id);

        const { id } = body;

        if (!user) {
            if (!id) {
                return Response.json(
                    { message: "Bad request" },
                    { status: 400 },
                );
            }
            return await verifyGuestPayment(domain, id, req.headers);
        }

        if (!id) {
            return Response.json({ message: "Bad request" }, { status: 400 });
        }

        const invoice = await InvoiceModel.findOne({ invoiceId: id });

        if (!invoice) {
            return Response.json(
                { message: "Item not found" },
                { status: 404 },
            );
        }

        const membership = await Membership.findOne({
            membershipId: invoice.membershipId,
        });

        if (!membership || membership.userId !== user.userId) {
            return Response.json({}, { status: 401 });
        }

        return Response.json({ status: invoice.status });
    } catch (err: any) {
        error(`Error verifying invoice: ${err.message}`, {
            domain: domainName,
            body,
            stack: err.stack,
        });
        return Response.json({ message: err.message }, { status: 500 });
    }
}

async function verifyGuestPayment(
    domain: Awaited<ReturnType<typeof getDomain>> & {},
    invoiceId: string,
    headers: Headers,
) {
    const result = await claimGuestSession({
        domain,
        invoiceId,
        headers,
    });

    if (result.outcome === "not-guest") {
        return Response.json({}, { status: 401 });
    }
    if (result.outcome === "pending") {
        return Response.json({ status: "pending" });
    }

    const response = Response.json({
        status: "paid",
        guest: result.outcome,
    });
    if (result.outcome === "signed-in") {
        for (const cookie of result.setCookies) {
            response.headers.append("set-cookie", cookie);
        }
    }
    return response;
}
