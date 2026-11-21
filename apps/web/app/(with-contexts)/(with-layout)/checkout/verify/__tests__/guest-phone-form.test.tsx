import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
    GUEST_PHONE_INVALID,
    GUEST_PHONE_PLACEHOLDER,
    GUEST_PHONE_SAVE,
    GUEST_PHONE_SKIP,
} from "@ui-config/strings";
import { GuestPhoneForm } from "../guest-phone-form";

const exec = jest.fn();
jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => {
        const builder: any = {
            setUrl: jest.fn(() => builder),
            setHeaders: jest.fn(() => builder),
            setPayload: jest.fn(() => builder),
            build: jest.fn(() => ({ exec })),
        };
        return builder;
    }),
}));

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({ backend: "", frontend: "" }),
    };
});

jest.mock("@/components/ui/button", () => ({
    Button: ({ children, ...props }: ComponentProps<"button">) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("@/components/ui/input", () => ({
    Input: (props: ComponentProps<"input">) => <input {...props} />,
}));

describe("GuestPhoneForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        exec.mockResolvedValue({ message: "success" });
    });

    it("saves the phone and then finishes", async () => {
        const onDone = jest.fn();
        render(<GuestPhoneForm onDone={onDone} />);

        fireEvent.change(screen.getByPlaceholderText(GUEST_PHONE_PLACEHOLDER), {
            target: { value: "+34 600 111 222" },
        });
        fireEvent.click(screen.getByRole("button", { name: GUEST_PHONE_SAVE }));

        await waitFor(() => expect(onDone).toHaveBeenCalled());
        expect(exec).toHaveBeenCalledTimes(1);
    });

    it("does not call the server for an invalid phone", () => {
        render(<GuestPhoneForm onDone={jest.fn()} />);

        fireEvent.change(screen.getByPlaceholderText(GUEST_PHONE_PLACEHOLDER), {
            target: { value: "abc" },
        });
        fireEvent.click(screen.getByRole("button", { name: GUEST_PHONE_SAVE }));

        expect(screen.getByText(GUEST_PHONE_INVALID)).toBeInTheDocument();
        expect(exec).not.toHaveBeenCalled();
    });

    it("can be skipped without saving anything", () => {
        const onDone = jest.fn();
        render(<GuestPhoneForm onDone={onDone} />);

        fireEvent.click(screen.getByRole("button", { name: GUEST_PHONE_SKIP }));

        expect(onDone).toHaveBeenCalled();
        expect(exec).not.toHaveBeenCalled();
    });
});
