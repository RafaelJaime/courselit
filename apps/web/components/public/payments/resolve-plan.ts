import { Constants, PaymentPlan } from "@courselit/common-models";

const { PaymentPlanType } = Constants;

export type ResolvablePlan = PaymentPlan & { archived?: boolean };

const YEARLY_KEYWORDS = ["anual", "annual", "yearly", "year", "ano"];
const MONTHLY_KEYWORDS = ["mensual", "monthly", "month", "mes"];

function normalize(value: string): string {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/**
 * Picks the plan to preselect at checkout from a `?plan=` query value.
 * Order: exact planId, plan name (case/accent-insensitive), billing keyword
 * (yearly/monthly subscription), then the product's default plan.
 * Archived plans are never returned.
 */
export function resolvePlan<T extends ResolvablePlan>(
    plans: T[],
    param: string | null | undefined,
    defaultPlanId: string | null | undefined,
): T | null {
    const active = plans.filter((plan) => !plan.archived);
    const fallback = defaultPlanId
        ? active.find((plan) => plan.planId === defaultPlanId) || null
        : null;

    const raw = param?.trim();
    if (!raw) {
        return fallback;
    }

    const byId = active.find((plan) => plan.planId === raw);
    if (byId) {
        return byId;
    }

    const wanted = normalize(raw);
    const byName = active.find((plan) => normalize(plan.name) === wanted);
    if (byName) {
        return byName;
    }

    const isSubscription = (plan: T) =>
        plan.type === PaymentPlanType.SUBSCRIPTION;
    if (YEARLY_KEYWORDS.includes(wanted)) {
        const yearly = active.find(
            (plan) => isSubscription(plan) && !!plan.subscriptionYearlyAmount,
        );
        if (yearly) {
            return yearly;
        }
    }
    if (MONTHLY_KEYWORDS.includes(wanted)) {
        const monthly = active.find(
            (plan) => isSubscription(plan) && !!plan.subscriptionMonthlyAmount,
        );
        if (monthly) {
            return monthly;
        }
    }

    return fallback;
}
