import { MembershipEntityType, PaymentPlan } from "@courselit/common-models";

export interface InitiateProps {
    metadata: Metadata;
    paymentPlan: PaymentPlan;
    product: {
        id: string;
        title: string;
        type: MembershipEntityType;
    };
    origin: string;
    /** Prefilled on the provider's checkout page (guest checkout). */
    customerEmail?: string;
}

interface Metadata {
    membershipId: string;
    invoiceId: string;
}

export default interface Payment {
    setup: () => void;
    initiate: (obj: InitiateProps) => void;
    verify: (event: any) => Promise<boolean>;
    getPaymentIdentifier: (event: any) => unknown;
    getMetadata: (event: any) => Record<string, unknown>;
    getName: () => string;
    cancel: (id: string) => void;
    getSubscriptionId: (event: any) => string;
    validateSubscription: (subscriptionId: string) => Promise<boolean>;
    getCurrencyISOCode: () => Promise<string>;
}
