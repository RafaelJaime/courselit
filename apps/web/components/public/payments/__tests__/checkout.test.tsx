import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { Constants } from "@courselit/common-models";
import {
    CHECKOUT_PLAN_HEADING,
    CHECKOUT_PERSONAL_INFORMATION_LABEL,
    CHECKOUT_TESTIMONIALS_HEADING,
} from "@ui-config/strings";

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({
            backend: "http://localhost:3000",
            frontend: "http://localhost:3000",
        }),
        ProfileContext: React.createContext({
            profile: null,
            setProfile: jest.fn(),
        }),
        SiteInfoContext: React.createContext({
            currencyISOCode: "USD",
            stripeKey: "pk_test",
            paymentMethod: "stripe",
        }),
        ThemeContext: React.createContext({
            theme: { id: "t", name: "t", theme: {} },
            setTheme: jest.fn(),
        }),
    };
});

jest.mock("@stripe/stripe-js", () => ({
    loadStripe: jest.fn().mockResolvedValue(null),
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("next/script", () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock("../login-form", () => ({
    LoginForm: () => <div>login-form</div>,
}));

jest.mock("../order-summary", () => ({
    MobileOrderSummary: () => null,
    DesktopOrderSummary: () => null,
}));

jest.mock("../payment-plan-card", () => ({
    PaymentPlanCard: ({ plan }: { plan: { name: string } }) => (
        <div data-testid="plan-card">{plan.name}</div>
    ),
}));

jest.mock("@courselit/components-library", () => ({
    getSymbolFromCurrency: () => "$",
    useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@courselit/page-primitives", () => ({
    Button: ({
        children,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
    ),
    Header3: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
    Text1: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

jest.mock("@/components/ui/radio-group", () => ({
    RadioGroup: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
}));

import Checkout, { Product } from "../checkout";

const plans = [
    {
        planId: "plan-1",
        name: "Anual",
        type: Constants.PaymentPlanType.SUBSCRIPTION,
        subscriptionYearlyAmount: 100,
    },
] as any;

function renderCheckout(type: Product["type"]) {
    const product: Product = {
        id: "p1",
        name: "Membresia",
        type,
        defaultPaymentPlanId: "plan-1",
    };
    return render(
        <Checkout
            product={product}
            paymentPlans={plans}
            includedProducts={[]}
            type={type}
            id="p1"
        />,
    );
}

describe("Checkout", () => {
    beforeAll(() => {
        (window as any).createLemonSqueezy = undefined;
    });

    it("shows the plans before the login step for anonymous visitors", () => {
        renderCheckout(Constants.MembershipEntityType.COMMUNITY);

        const planHeading = screen.getByRole("heading", {
            name: CHECKOUT_PLAN_HEADING,
        });
        const loginHeading = screen.getByRole("heading", {
            name: CHECKOUT_PERSONAL_INFORMATION_LABEL,
        });

        expect(screen.getByTestId("plan-card").textContent).toBe("Anual");
        expect(
            planHeading.compareDocumentPosition(loginHeading) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("renders the social proof for a community checkout", () => {
        renderCheckout(Constants.MembershipEntityType.COMMUNITY);

        expect(
            screen.getByRole("heading", {
                name: CHECKOUT_TESTIMONIALS_HEADING,
            }),
        ).toBeTruthy();
    });

    it("does not render the social proof for a course checkout", () => {
        renderCheckout(Constants.MembershipEntityType.COURSE);

        expect(
            screen.queryByRole("heading", {
                name: CHECKOUT_TESTIMONIALS_HEADING,
            }),
        ).toBeNull();
    });
});
