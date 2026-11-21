"use client";

import { useContext, useState } from "react";
import { Button, Caption, Input } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";
import {
    CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER,
    CHECKOUT_EMAIL_INVALID,
    CHECKOUT_EMAIL_MISMATCH,
    CHECKOUT_EMAIL_PLACEHOLDER,
    CHECKOUT_GUEST_EMAIL_HINT,
    CHECKOUT_GUEST_HAVE_ACCOUNT,
} from "@ui-config/strings";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidGuestEmail = (email: string) =>
    EMAIL_PATTERN.test(email.trim());

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// The buyer types the email twice: a typo would otherwise create the account
// on an address they cannot receive the login code at.
export const guestEmailsMatch = (email: string, confirmEmail: string) =>
    isValidGuestEmail(email) &&
    normalizeEmail(email) === normalizeEmail(confirmEmail);

interface GuestEmailFieldProps {
    email: string;
    onChange: (email: string) => void;
    confirmEmail: string;
    onConfirmChange: (email: string) => void;
    onUseLogin: () => void;
}

export function GuestEmailField({
    email,
    onChange,
    confirmEmail,
    onConfirmChange,
    onUseLogin,
}: GuestEmailFieldProps) {
    const { theme } = useContext(ThemeContext);
    const [touched, setTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const showError = touched && !isValidGuestEmail(email);
    const showMismatch =
        confirmTouched &&
        isValidGuestEmail(email) &&
        !guestEmailsMatch(email, confirmEmail);

    return (
        <div className="space-y-3">
            <Input
                theme={theme.theme}
                type="email"
                className="rounded-full px-5"
                placeholder={CHECKOUT_EMAIL_PLACEHOLDER}
                autoComplete="email"
                value={email}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setTouched(true)}
            />
            <Input
                theme={theme.theme}
                type="email"
                className="rounded-full px-5"
                placeholder={CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER}
                autoComplete="email"
                value={confirmEmail}
                onChange={(e) => onConfirmChange(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
            />
            {showError ? (
                <Caption theme={theme.theme}>
                    <span role="alert" className="text-red-600">
                        {CHECKOUT_EMAIL_INVALID}
                    </span>
                </Caption>
            ) : showMismatch ? (
                <Caption theme={theme.theme}>
                    <span role="alert" className="text-red-600">
                        {CHECKOUT_EMAIL_MISMATCH}
                    </span>
                </Caption>
            ) : (
                <Caption theme={theme.theme}>
                    {CHECKOUT_GUEST_EMAIL_HINT}
                </Caption>
            )}
            <Button
                type="button"
                variant="link"
                theme={theme.theme}
                onClick={onUseLogin}
            >
                {CHECKOUT_GUEST_HAVE_ACCOUNT}
            </Button>
        </div>
    );
}
