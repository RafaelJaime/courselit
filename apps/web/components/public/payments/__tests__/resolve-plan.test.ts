import { Constants } from "@courselit/common-models";
import { resolvePlan, ResolvablePlan } from "../resolve-plan";

const { PaymentPlanType } = Constants;

const monthly = {
    planId: "plan-m",
    name: "Mensual",
    type: PaymentPlanType.SUBSCRIPTION,
    subscriptionMonthlyAmount: 10,
} as ResolvablePlan;
const yearly = {
    planId: "plan-y",
    name: "Anual",
    type: PaymentPlanType.SUBSCRIPTION,
    subscriptionYearlyAmount: 100,
} as ResolvablePlan;
const archived = {
    planId: "plan-old",
    name: "Antiguo",
    type: PaymentPlanType.SUBSCRIPTION,
    subscriptionYearlyAmount: 50,
    archived: true,
} as ResolvablePlan;
const plans: ResolvablePlan[] = [monthly, yearly, archived];

describe("resolvePlan", () => {
    it("matches an exact planId", () => {
        expect(resolvePlan(plans, "plan-m", "plan-y")?.planId).toBe("plan-m");
    });

    it("matches the plan name ignoring case and accents", () => {
        expect(resolvePlan(plans, "mensual", "plan-y")?.planId).toBe("plan-m");
        expect(resolvePlan(plans, "ANUAL", "plan-m")?.planId).toBe("plan-y");
        const accented = { ...yearly, planId: "plan-a", name: "Añual" };
        expect(
            resolvePlan([monthly, accented], "anual", "plan-m")?.planId,
        ).toBe("plan-a");
        expect(resolvePlan([monthly, yearly], "Añual", "plan-m")?.planId).toBe(
            "plan-y",
        );
    });

    it.each(["annual", "yearly", "year", "ano", "año", "ANNUAL"])(
        "maps the yearly keyword %s to the yearly subscription",
        (keyword) => {
            const renamed = [
                { ...monthly, name: "Plan A" },
                { ...yearly, name: "Plan B" },
            ];
            expect(resolvePlan(renamed, keyword, "plan-m")?.planId).toBe(
                "plan-y",
            );
        },
    );

    it.each(["monthly", "month", "mes", "Mensual"])(
        "maps the monthly keyword %s to the monthly subscription",
        (keyword) => {
            const renamed = [
                { ...monthly, name: "Plan A" },
                { ...yearly, name: "Plan B" },
            ];
            expect(resolvePlan(renamed, keyword, "plan-y")?.planId).toBe(
                "plan-m",
            );
        },
    );

    it("never selects an archived plan, even by id", () => {
        expect(resolvePlan(plans, "plan-old", "plan-y")?.planId).toBe("plan-y");
        expect(resolvePlan(plans, "antiguo", "plan-y")?.planId).toBe("plan-y");
    });

    it("falls back to the default plan for unknown or missing params", () => {
        expect(resolvePlan(plans, "nope", "plan-y")?.planId).toBe("plan-y");
        expect(resolvePlan(plans, null, "plan-y")?.planId).toBe("plan-y");
        expect(resolvePlan(plans, undefined, "plan-y")?.planId).toBe("plan-y");
        expect(resolvePlan(plans, "  ", "plan-y")?.planId).toBe("plan-y");
    });

    it("returns null when nothing matches and the default is unusable", () => {
        expect(resolvePlan(plans, "nope", "plan-old")).toBeNull();
        expect(resolvePlan(plans, "nope", undefined)).toBeNull();
    });
});
