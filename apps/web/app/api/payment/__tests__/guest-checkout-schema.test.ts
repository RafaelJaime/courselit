/**
 * @jest-environment node
 */

import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import DomainModel from "@models/Domain";
import InvoiceModel from "@models/Invoice";
import UserModel from "@models/User";

const SUITE = `guest-schema-${Date.now()}`;

describe("guest checkout persistence", () => {
    let domainId: mongoose.Types.ObjectId;

    beforeAll(async () => {
        const domain = await DomainModel.create({
            name: `${SUITE}-domain`,
            email: `${SUITE}@example.com`,
            settings: { title: "School", guestCheckout: true },
        });
        domainId = domain._id;
    });

    afterAll(async () => {
        await InvoiceModel.deleteMany({ domain: domainId });
        await UserModel.deleteMany({ domain: domainId });
        await DomainModel.deleteOne({ _id: domainId });
    });

    it("stores the guestCheckout setting and defaults it to off", async () => {
        const enabled = await DomainModel.findById(domainId).lean();
        expect(enabled?.settings?.guestCheckout).toBe(true);

        const other = await DomainModel.create({
            name: `${SUITE}-other`,
            email: `${SUITE}-other@example.com`,
            settings: { title: "Other" },
        });
        expect(other.settings?.guestCheckout).toBe(false);
        await DomainModel.deleteOne({ _id: other._id });
    });

    it("keeps the guest fields of an invoice", async () => {
        await InvoiceModel.create({
            domain: domainId,
            invoiceId: `${SUITE}-inv`,
            membershipId: "m-1",
            membershipSessionId: "s-1",
            amount: 10,
            paymentProcessor: "stripe",
            currencyISOCode: "EUR",
            guestEmail: "buyer@example.com",
            guestEntityId: "course-1",
            guestEntityType: Constants.MembershipEntityType.COURSE,
            guestPlanId: "plan-1",
            guestClaimTokenHash: "abc123",
            guestPaidAt: new Date(),
        });

        const invoice = await InvoiceModel.findOne({
            invoiceId: `${SUITE}-inv`,
        }).lean();

        expect(invoice).toMatchObject({
            guestEmail: "buyer@example.com",
            guestEntityId: "course-1",
            guestEntityType: "course",
            guestPlanId: "plan-1",
            guestClaimTokenHash: "abc123",
            guestPaidAt: expect.any(Date),
        });
    });

    it("keeps the phone of a user", async () => {
        await UserModel.create({
            domain: domainId,
            userId: `${SUITE}-u`,
            email: `${SUITE}-u@example.com`,
            unsubscribeToken: `${SUITE}-tok`,
            phone: "+34 600 111 222",
            guestUnverified: true,
        });

        const user = await UserModel.findOne({
            userId: `${SUITE}-u`,
        }).lean<{ phone?: string; guestUnverified?: boolean }>();

        expect(user?.phone).toBe("+34 600 111 222");
        expect(user?.guestUnverified).toBe(true);
    });
});
