import { Constants } from ".";
import { MembershipEntityType } from "./membership";

const { InvoiceStatus } = Constants;

export type InvoicesStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice {
    invoiceId: string;
    membershipId: string;
    membershipSessionId: string;
    amount: number;
    status: InvoicesStatus;
    paymentProcessor: string;
    paymentProcessorTransactionId?: string;
    paymentProcessorEntityId?: string;
    currencyISOCode: string;
    guestEmail?: string;
    guestEntityId?: string;
    guestEntityType?: MembershipEntityType;
    guestPlanId?: string;
    guestUserId?: string;
    guestAccountCreated?: boolean;
    guestClaimTokenHash?: string;
    guestPaidAt?: Date;
    guestSignInClaimedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
