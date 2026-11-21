import { NextRequest } from "next/server";
import { auth } from "@/auth";
import UserModel from "@models/User";
import { error } from "@/services/logger";
import { getDomain, getUser } from "../../payment/initiate/route";

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const domainName = req.headers.get("domain");

    try {
        const domain = await getDomain(domainName);
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }

        const session = await auth.api.getSession({ headers: req.headers });
        const user = await getUser(session, domain._id);
        if (!user) {
            return Response.json({}, { status: 401 });
        }

        const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
        if (!PHONE_PATTERN.test(phone)) {
            return Response.json({ message: "Invalid phone" }, { status: 400 });
        }

        await UserModel.updateOne(
            { domain: domain._id, userId: user.userId },
            { $set: { phone } },
        );

        return Response.json({ message: "success" });
    } catch (err: any) {
        error(`Error saving phone: ${err.message}`, {
            domain: domainName,
            stack: err.stack,
        });
        return Response.json({ message: err.message }, { status: 500 });
    }
}
