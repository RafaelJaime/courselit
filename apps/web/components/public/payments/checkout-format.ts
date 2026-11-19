import {
    CHECKOUT_PERIOD_MONTH,
    CHECKOUT_PERIOD_YEAR,
} from "@ui-config/strings";

/**
 * Translates the English period suffix returned by the shared `getPlanPrice`
 * helper ("/mo", "/yr"). The helper is used by other screens, so it stays
 * untouched and only the checkout maps its output.
 */
export function checkoutPeriod(period: string): string {
    switch (period) {
        case "/mo":
            return CHECKOUT_PERIOD_MONTH;
        case "/yr":
            return CHECKOUT_PERIOD_YEAR;
        default:
            return period;
    }
}
