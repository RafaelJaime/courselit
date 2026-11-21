import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
    CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER,
    CHECKOUT_EMAIL_INVALID,
    CHECKOUT_EMAIL_MISMATCH,
    CHECKOUT_EMAIL_PLACEHOLDER,
    CHECKOUT_GUEST_EMAIL_HINT,
    CHECKOUT_GUEST_HAVE_ACCOUNT,
} from "@ui-config/strings";
import { GuestEmailField, guestEmailsMatch } from "../guest-email-field";

jest.mock("@courselit/page-primitives", () => {
    const React = require("react");

    const MockInput = React.forwardRef(function MockInput(
        props: ComponentProps<"input">,
        ref: React.Ref<HTMLInputElement>,
    ) {
        return <input ref={ref} {...props} />;
    });

    return {
        Text1: ({ children }: { children: ReactNode }) => <p>{children}</p>,
        Caption: ({ children }: { children: ReactNode }) => (
            <span>{children}</span>
        ),
        Button: ({ children, ...props }: ComponentProps<"button">) => (
            <button {...props}>{children}</button>
        ),
        Input: MockInput,
    };
});

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        ThemeContext: React.createContext({
            theme: { id: "", name: "", theme: {} },
            setTheme: jest.fn(),
        }),
    };
});

describe("GuestEmailField", () => {
    it("asks only for the email and explains no account is needed", () => {
        render(
            <GuestEmailField
                email=""
                onChange={jest.fn()}
                confirmEmail=""
                onConfirmChange={jest.fn()}
                onUseLogin={jest.fn()}
            />,
        );

        expect(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_PLACEHOLDER),
        ).toBeInTheDocument();
        expect(screen.getByText(CHECKOUT_GUEST_EMAIL_HINT)).toBeInTheDocument();
        expect(
            screen.queryByText(CHECKOUT_EMAIL_INVALID),
        ).not.toBeInTheDocument();
    });

    it("reports what the visitor types", () => {
        const onChange = jest.fn();
        render(
            <GuestEmailField
                email=""
                onChange={onChange}
                confirmEmail=""
                onConfirmChange={jest.fn()}
                onUseLogin={jest.fn()}
            />,
        );

        fireEvent.change(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_PLACEHOLDER),
            { target: { value: "buyer@example.com" } },
        );

        expect(onChange).toHaveBeenCalledWith("buyer@example.com");
    });

    it("flags an invalid email once the field was left", () => {
        render(
            <GuestEmailField
                email="nope"
                onChange={jest.fn()}
                confirmEmail=""
                onConfirmChange={jest.fn()}
                onUseLogin={jest.fn()}
            />,
        );

        fireEvent.blur(screen.getByPlaceholderText(CHECKOUT_EMAIL_PLACEHOLDER));

        expect(screen.getByText(CHECKOUT_EMAIL_INVALID)).toBeInTheDocument();
    });

    it("lets people with an account use the login instead", () => {
        const onUseLogin = jest.fn();
        render(
            <GuestEmailField
                email=""
                onChange={jest.fn()}
                confirmEmail=""
                onConfirmChange={jest.fn()}
                onUseLogin={onUseLogin}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: CHECKOUT_GUEST_HAVE_ACCOUNT }),
        );

        expect(onUseLogin).toHaveBeenCalled();
    });

    it("asks for the email a second time and reports it", () => {
        const onConfirmChange = jest.fn();
        render(
            <GuestEmailField
                email="buyer@example.com"
                onChange={jest.fn()}
                confirmEmail=""
                onConfirmChange={onConfirmChange}
                onUseLogin={jest.fn()}
            />,
        );

        fireEvent.change(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER),
            { target: { value: "buyer@example.com" } },
        );

        expect(onConfirmChange).toHaveBeenCalledWith("buyer@example.com");
    });

    it("flags emails that do not match once the second field was left", () => {
        render(
            <GuestEmailField
                email="buyer@example.com"
                onChange={jest.fn()}
                confirmEmail="buyer@exmple.com"
                onConfirmChange={jest.fn()}
                onUseLogin={jest.fn()}
            />,
        );

        expect(
            screen.queryByText(CHECKOUT_EMAIL_MISMATCH),
        ).not.toBeInTheDocument();

        fireEvent.blur(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER),
        );

        expect(screen.getByText(CHECKOUT_EMAIL_MISMATCH)).toBeInTheDocument();
    });

    it("shows no mismatch when both emails are the same", () => {
        render(
            <GuestEmailField
                email="buyer@example.com"
                onChange={jest.fn()}
                confirmEmail=" Buyer@Example.com "
                onConfirmChange={jest.fn()}
                onUseLogin={jest.fn()}
            />,
        );

        fireEvent.blur(
            screen.getByPlaceholderText(CHECKOUT_EMAIL_CONFIRM_PLACEHOLDER),
        );

        expect(
            screen.queryByText(CHECKOUT_EMAIL_MISMATCH),
        ).not.toBeInTheDocument();
    });
});

describe("guestEmailsMatch", () => {
    it("accepts the same valid email, ignoring case and spaces", () => {
        expect(
            guestEmailsMatch("buyer@example.com", " BUYER@example.com "),
        ).toBe(true);
    });

    it("rejects different emails", () => {
        expect(guestEmailsMatch("buyer@example.com", "buyer@exmple.com")).toBe(
            false,
        );
    });

    it("rejects an invalid email even when both fields agree", () => {
        expect(guestEmailsMatch("nope", "nope")).toBe(false);
    });

    it("rejects an empty confirmation", () => {
        expect(guestEmailsMatch("buyer@example.com", "")).toBe(false);
    });
});
