import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
    BTN_LOGIN_GET_CODE,
    BTN_LOGIN_PASSWORD,
    LOGIN_PASSWORD_BACK_TO_CODE,
    LOGIN_PASSWORD_ERROR,
    LOGIN_PASSWORD_PLACEHOLDER,
    LOGIN_PASSWORD_TOGGLE,
} from "@/ui-config/strings";
import { authClient } from "@/lib/auth-client";
import LoginForm from "../login-form";

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        AddressContext: React.createContext({ backend: "", frontend: "" }),
        ServerConfigContext: React.createContext({
            recaptchaSiteKey: "",
            turnstileSiteKey: "",
            queueServer: "",
            cacheEnabled: false,
        }),
        SiteInfoContext: React.createContext({
            logins: ["email"],
        }),
        ThemeContext: React.createContext({
            theme: { id: "", name: "", theme: {} },
            setTheme: jest.fn(),
        }),
    };
});

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            sso: jest.fn(),
            emailOtp: jest.fn(),
            email: jest.fn(),
        },
        emailOtp: {
            sendVerificationOtp: jest.fn(),
        },
    },
}));

jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest
        .fn()
        .mockResolvedValue({ userId: "u1", permissions: [] }),
}));

jest.mock("@/hooks/use-recaptcha", () => ({
    useRecaptcha: () => ({ executeRecaptcha: null }),
}));

jest.mock("@/components/recaptcha-script-loader", () => () => null);

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: jest.fn() }),
    Form: ({
        children,
        ...props
    }: ComponentProps<"form"> & { children: ReactNode }) => (
        <form {...props}>{children}</form>
    ),
}));

jest.mock("@courselit/page-primitives", () => {
    const React = require("react");

    const MockInput = React.forwardRef(function MockInput(
        props: ComponentProps<"input">,
        ref: React.Ref<HTMLInputElement>,
    ) {
        return <input ref={ref} {...props} />;
    });

    return {
        Section: ({ children }: { children: ReactNode }) => (
            <div>{children}</div>
        ),
        Text1: ({ children }: { children: ReactNode }) => <p>{children}</p>,
        Caption: ({ children }: { children: ReactNode }) => (
            <span>{children}</span>
        ),
        Link: ({ children }: { children: ReactNode }) => (
            <span>{children}</span>
        ),
        Button: ({ children, ...props }: ComponentProps<"button">) => (
            <button {...props}>{children}</button>
        ),
        Input: MockInput,
    };
});

const signInEmail = authClient.signIn.email as jest.Mock;

describe("LoginForm password option", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows the email code form by default with a discreet password toggle", () => {
        render(<LoginForm />);

        expect(
            screen.getByRole("button", { name: BTN_LOGIN_GET_CODE }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: LOGIN_PASSWORD_TOGGLE }),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(LOGIN_PASSWORD_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it("reveals the password form and lets the user go back to the code flow", () => {
        render(<LoginForm />);

        fireEvent.click(
            screen.getByRole("button", { name: LOGIN_PASSWORD_TOGGLE }),
        );

        expect(
            screen.getByPlaceholderText(LOGIN_PASSWORD_PLACEHOLDER),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: BTN_LOGIN_GET_CODE }),
        ).not.toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", { name: LOGIN_PASSWORD_BACK_TO_CODE }),
        );

        expect(
            screen.getByRole("button", { name: BTN_LOGIN_GET_CODE }),
        ).toBeInTheDocument();
    });

    it("signs in with email and password through better-auth", async () => {
        signInEmail.mockResolvedValue({ error: null });
        render(<LoginForm redirectTo="/dashboard/my-content" />);

        fireEvent.click(
            screen.getByRole("button", { name: LOGIN_PASSWORD_TOGGLE }),
        );
        fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
            target: { value: "  Alumno@Example.com " },
        });
        fireEvent.change(
            screen.getByPlaceholderText(LOGIN_PASSWORD_PLACEHOLDER),
            { target: { value: "s3cret-s3cret-s3cret!" } },
        );
        fireEvent.click(
            screen.getByRole("button", { name: BTN_LOGIN_PASSWORD }),
        );

        await waitFor(() =>
            expect(signInEmail).toHaveBeenCalledWith({
                email: "alumno@example.com",
                password: "s3cret-s3cret-s3cret!",
            }),
        );
        expect(authClient.signIn.emailOtp).not.toHaveBeenCalled();
        expect(authClient.emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
    });

    it("shows a generic error when the credentials are rejected", async () => {
        signInEmail.mockResolvedValue({
            error: { message: "Invalid email or password" },
        });
        render(<LoginForm />);

        fireEvent.click(
            screen.getByRole("button", { name: LOGIN_PASSWORD_TOGGLE }),
        );
        fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
            target: { value: "alumno@example.com" },
        });
        fireEvent.change(
            screen.getByPlaceholderText(LOGIN_PASSWORD_PLACEHOLDER),
            { target: { value: "wrong-password-wrong" } },
        );
        fireEvent.click(
            screen.getByRole("button", { name: BTN_LOGIN_PASSWORD }),
        );

        expect(
            await screen.findByText(LOGIN_PASSWORD_ERROR),
        ).toBeInTheDocument();
    });
});
