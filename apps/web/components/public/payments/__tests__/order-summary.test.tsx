import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Constants } from "@courselit/common-models";

jest.mock("next/image", () => ({
    __esModule: true,
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

jest.mock("@/components/ui/collapsible", () => ({
    Collapsible: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    CollapsibleTrigger: ({ children }: { children: ReactNode }) => (
        <button>{children}</button>
    ),
    CollapsibleContent: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
}));

jest.mock("@courselit/page-primitives", () => ({
    PageCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    PageCardContent: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    Text1: ({
        children,
        onClick,
    }: {
        children: ReactNode;
        onClick?: () => void;
    }) => <p onClick={onClick}>{children}</p>,
    Header3: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
    Header4: ({ children }: { children: ReactNode }) => <h4>{children}</h4>,
}));

import { DesktopOrderSummary, MobileOrderSummary } from "../order-summary";

const theme = {
    theme: { colors: { border: "#ccc" } },
};

const product = { id: "p1", name: "Membresía", type: "community" } as any;

const yearly = {
    planId: "y",
    name: "Anual",
    type: Constants.PaymentPlanType.SUBSCRIPTION,
    subscriptionYearlyAmount: 1840,
} as any;

const monthly = {
    planId: "m",
    name: "Mensual",
    type: Constants.PaymentPlanType.SUBSCRIPTION,
    subscriptionMonthlyAmount: 227,
} as any;

describe("order summary copy", () => {
    it("renders the mobile summary in Spanish and toggles its label", () => {
        const setOpen = jest.fn();
        const { container, rerender } = render(
            <MobileOrderSummary
                product={product}
                selectedPlan={yearly}
                paymentPlans={[yearly, monthly]}
                currencySymbol="$"
                theme={theme}
                isOrderSummaryOpen
                setIsOrderSummaryOpen={setOpen}
            />,
        );

        expect(screen.getByText(/Ocultar resumen del pedido/)).toBeTruthy();
        expect(container.textContent).toContain("/año");
        expect(container.textContent).not.toMatch(/\/yr|\/mo|order summary/i);

        rerender(
            <MobileOrderSummary
                product={product}
                selectedPlan={monthly}
                paymentPlans={[yearly, monthly]}
                currencySymbol="$"
                theme={theme}
                isOrderSummaryOpen={false}
                setIsOrderSummaryOpen={setOpen}
            />,
        );
        fireEvent.click(screen.getByText(/Mostrar resumen del pedido/));
        expect(setOpen).toHaveBeenCalledWith(true);
        expect(container.textContent).toContain("/mes");
    });

    it("renders the desktop summary and plan description in Spanish", () => {
        const { container, rerender } = render(
            <DesktopOrderSummary
                product={product}
                selectedPlan={yearly}
                currencySymbol="$"
                theme={theme}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Resumen del pedido" }),
        ).toBeTruthy();
        expect(container.textContent).toContain("Facturado anualmente");
        expect(container.textContent).toContain("/año");

        rerender(
            <DesktopOrderSummary
                product={product}
                selectedPlan={monthly}
                currencySymbol="$"
                theme={theme}
            />,
        );
        expect(container.textContent).toContain("227.00 al mes");
        expect(container.textContent).not.toMatch(/per month|\/mo\b/);
    });
});
