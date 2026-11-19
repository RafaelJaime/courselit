import React from "react";
import { render, screen } from "@testing-library/react";
import type { Instructor } from "@courselit/common-models";
import InstructorsBlock from "../instructors-block";
import { INSTRUCTORS_VIEWER_HEADING } from "@ui-config/strings";

jest.mock("@courselit/page-primitives", () => ({
    Header2: ({ children }: any) => <h2>{children}</h2>,
    Header3: ({ children }: any) => <h3>{children}</h3>,
    Text2: ({ children }: any) => <p>{children}</p>,
}));

const person = (id: string, name: string, extra = {}): Instructor => ({
    instructorId: id,
    name,
    links: [],
    ...extra,
});

describe("InstructorsBlock", () => {
    it("renders nothing without instructors", () => {
        const { container } = render(
            <InstructorsBlock instructors={[]} theme={{} as any} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("shows each instructor's name, bio and links", () => {
        render(
            <InstructorsBlock
                theme={{} as any}
                instructors={[
                    person("ann", "Ann Ada", {
                        bio: "Teaches the basics",
                        links: [
                            {
                                label: "Website",
                                url: "https://ann.example.com",
                            },
                        ],
                    }),
                    person("bob", "Bob Hopper"),
                ]}
            />,
        );

        expect(
            screen.getByRole("heading", { name: INSTRUCTORS_VIEWER_HEADING }),
        ).toBeInTheDocument();
        expect(screen.getByText("Ann Ada")).toBeInTheDocument();
        expect(screen.getByText("Teaches the basics")).toBeInTheDocument();
        expect(screen.getByText("Bob Hopper")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Website" });
        expect(link).toHaveAttribute("href", "https://ann.example.com");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute(
            "rel",
            expect.stringContaining("noopener"),
        );
    });

    it("falls back to initials when there is no photo", () => {
        render(
            <InstructorsBlock
                theme={{} as any}
                instructors={[person("ann", "Ann Ada")]}
            />,
        );

        expect(screen.getByText("AA")).toBeInTheDocument();
    });
});
