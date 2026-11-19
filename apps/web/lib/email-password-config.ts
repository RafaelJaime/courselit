/**
 * better-auth email + password options. Password login is sign-in only: sign-up
 * is disabled and no reset flow is exposed, so it works solely for users that
 * were given a credential account out of band (see the provisioning script).
 * Email-OTP stays the default login for everybody else.
 */
export const emailAndPasswordConfig = {
    enabled: true,
    disableSignUp: true,
    autoSignIn: false,
    minPasswordLength: 12,
} as const;
