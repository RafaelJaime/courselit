import { emailAndPasswordConfig } from "../email-password-config";

describe("emailAndPasswordConfig", () => {
    it("enables password sign-in", () => {
        expect(emailAndPasswordConfig.enabled).toBe(true);
    });

    it("refuses password sign-up so only provisioned accounts can use it", () => {
        expect(emailAndPasswordConfig.disableSignUp).toBe(true);
    });

    it("does not sign anybody in automatically after a sign-up attempt", () => {
        expect(emailAndPasswordConfig.autoSignIn).toBe(false);
    });

    it("exposes no password reset flow", () => {
        expect(emailAndPasswordConfig).not.toHaveProperty("sendResetPassword");
    });

    it("requires long passwords", () => {
        expect(emailAndPasswordConfig.minPasswordLength).toBeGreaterThanOrEqual(
            12,
        );
    });
});
