import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
    CHECKOUT_EMAIL_INVALID,
    CHECKOUT_EMAIL_PLACEHOLDER,
    CHECKOUT_GUEST_EMAIL_HINT,
    CHECKOUT_GUEST_HAVE_ACCOUNT,
} from "@ui-config/strings";
import { GuestEmailField } from "../guest-email-field";

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
                onUseLogin={onUseLogin}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: CHECKOUT_GUEST_HAVE_ACCOUNT }),
        );

        expect(onUseLogin).toHaveBeenCalled();
    });
});
