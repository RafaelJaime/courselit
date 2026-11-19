import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { Constants } from "@courselit/common-models";

jest.mock("@/components/ui/radio-group", () => ({
    RadioGroupItem: () => <input type="radio" />,
}));

jest.mock("@/components/ui/form", () => ({
    FormControl: ({ children }: { children: ReactNode }) => <>{children}</>,
    FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    FormLabel: ({ children }: { children: ReactNode }) => (
        <label>{children}</label>
    ),
}));

jest.mock("@courselit/page-primitives", () => ({
    Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    Header3: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
    PageCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    PageCardContent: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    PageCardHeader: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    Text1: ({ children }: { children: ReactNode }) => <p>{children}</p>,
    Text2: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

import { PaymentPlanCard } from "../payment-plan-card";

function renderCard(plan: any, isRecommended: boolean) {
    return render(
        <PaymentPlanCard
            plan={plan}
            isSelected={false}
            isRecommended={isRecommended}
            currencySymbol="$"
            includedProducts={[]}
            theme={{ theme: {} }}
        />,
    );
}

describe("PaymentPlanCard copy", () => {
    it("shows the recommended badge and monthly suffix in Spanish", () => {
        const { container } = renderCard(
            {
                planId: "m",
                name: "Mensual",
                type: Constants.PaymentPlanType.SUBSCRIPTION,
                subscriptionMonthlyAmount: 227,
            },
            true,
        );

        expect(container.textContent).toContain("Recomendado");
        expect(container.textContent).toContain("/mes");
        expect(container.textContent).not.toMatch(/Recommended|\/mo\b|\/yr\b/);
    });

    it("shows the yearly suffix in Spanish", () => {
        const { container } = renderCard(
            {
                planId: "y",
                name: "Anual",
                type: Constants.PaymentPlanType.SUBSCRIPTION,
                subscriptionYearlyAmount: 1840,
            },
            false,
        );

        expect(container.textContent).toContain("/año");
    });

    it("labels one-time plans in Spanish", () => {
        const { container } = renderCard(
            {
                planId: "o",
                name: "Único",
                type: Constants.PaymentPlanType.ONE_TIME,
                oneTimeAmount: 50,
            },
            false,
        );

        expect(container.textContent).toContain("pago único");
        expect(container.textContent).not.toContain("one-time");
    });
});
