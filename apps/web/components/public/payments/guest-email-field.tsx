"use client";

import { useContext, useState } from "react";
import { Button, Caption, Input } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";
import {
    CHECKOUT_EMAIL_INVALID,
    CHECKOUT_EMAIL_PLACEHOLDER,
    CHECKOUT_GUEST_EMAIL_HINT,
    CHECKOUT_GUEST_HAVE_ACCOUNT,
} from "@ui-config/strings";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidGuestEmail = (email: string) =>
    EMAIL_PATTERN.test(email.trim());

interface GuestEmailFieldProps {
    email: string;
    onChange: (email: string) => void;
    onUseLogin: () => void;
}

export function GuestEmailField({
    email,
    onChange,
    onUseLogin,
}: GuestEmailFieldProps) {
    const { theme } = useContext(ThemeContext);
    const [touched, setTouched] = useState(false);
    const showError = touched && !isValidGuestEmail(email);

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
            {showError ? (
                <Caption theme={theme.theme}>
                    <span role="alert" className="text-red-600">
                        {CHECKOUT_EMAIL_INVALID}
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
