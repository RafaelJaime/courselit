import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
    CHECKOUT_CODE_INTIMATION_MESSAGE,
    CHECKOUT_CODE_PLACEHOLDER,
    CHECKOUT_EMAIL_PLACEHOLDER,
    CHECKOUT_VERIFY_CODE_BUTTON,
} from "@ui-config/strings";

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({ backend: "", frontend: "" }),
        ProfileContext: React.createContext({
            profile: null,
            setProfile: jest.fn(),
        }),
        ServerConfigContext: React.createContext({
            recaptchaSiteKey: "",
            turnstileSiteKey: "",
            queueServer: "",
            cacheEnabled: false,
        }),
        SiteInfoContext: React.createContext({ logins: ["email"] }),
        ThemeContext: React.createContext({
            theme: { id: "", name: "", theme: {} },
            setTheme: jest.fn(),
        }),
    };
});

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: { sso: jest.fn(), emailOtp: jest.fn() },
        emailOtp: {
            sendVerificationOtp: jest.fn().mockResolvedValue({ error: null }),
        },
    },
}));

jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest.fn(),
}));

jest.mock("@/hooks/use-recaptcha", () => ({
    useRecaptcha: () => ({ executeRecaptcha: null }),
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@components/recaptcha-script-loader", () => () => null, {
    virtual: true,
});

jest.mock("@courselit/page-primitives", () => ({
    Button: ({
        children,
        onClick,
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button onClick={onClick}>{children}</button>
    ),
    Caption: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input {...props} />
    ),
    Text1: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, href }: { children: ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

import { LoginForm } from "../login-form";

describe("Checkout LoginForm email code step", () => {
    it("explains the code step in Spanish", async () => {
        render(<LoginForm onLoginComplete={jest.fn()} />);

        fireEvent.change(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_PLACEHOLDER),
            {
                target: { value: "buyer@example.com" },
            },
        );
        fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

        await waitFor(() => {
            expect(
                screen.getByText(CHECKOUT_CODE_INTIMATION_MESSAGE),
            ).toBeTruthy();
        });
        expect(
            screen.getByPlaceholderText(CHECKOUT_CODE_PLACEHOLDER),
        ).toBeTruthy();
        expect(
            screen.getByRole("button", { name: CHECKOUT_VERIFY_CODE_BUTTON }),
        ).toBeTruthy();
        expect(screen.queryByText(/OTP/)).toBeNull();
    });
});
