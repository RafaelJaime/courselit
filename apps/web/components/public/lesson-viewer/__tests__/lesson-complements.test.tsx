import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LessonComplementCards } from "../lesson-complements";

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: ({ json }: any) => (
        <div data-testid="task-text">
            {json.content?.[0]?.content?.[0]?.text}
        </div>
    ),
}));

jest.mock("../../base-layout/template/widget-error-boundary", () => ({
    __esModule: true,
    default: ({ children }: any) => <>{children}</>,
}));

const theme = {} as any;

const task = {
    complementId: "t1",
    type: "task",
    title: "Write a summary",
    content: {
        type: "doc",
        content: [
            { type: "paragraph", content: [{ type: "text", text: "Do it" }] },
        ],
    },
} as any;
const link = {
    complementId: "l1",
    type: "link",
    title: "Further reading",
    url: "https://example.com/read",
} as any;
const document = {
    complementId: "d1",
    type: "document",
    title: "Workbook",
    media: {
        mediaId: "m1",
        originalFileName: "workbook.pdf",
        file: "https://media.example.com/signed/workbook.pdf?sig=1",
    },
} as any;

describe("LessonComplementCards", () => {
    it("renders nothing when the lesson has no complements", () => {
        const { container } = render(
            <LessonComplementCards complements={[]} theme={theme} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders a Spanish section with one card per complement, in order", () => {
        render(
            <LessonComplementCards
                complements={[task, link, document]}
                theme={theme}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Complementos" }),
        ).toBeInTheDocument();
        const cards = screen.getAllByRole("article");
        expect(cards).toHaveLength(3);
        expect(within(cards[0]).getByText("Tarea")).toBeInTheDocument();
        expect(within(cards[1]).getByText("Enlace")).toBeInTheDocument();
        expect(within(cards[2]).getByText("Documento")).toBeInTheDocument();
        expect(cards.map((card) => card.id)).toEqual([
            "complement-t1",
            "complement-l1",
            "complement-d1",
        ]);
    });

    it("lets long words and links wrap instead of widening the page", () => {
        render(<LessonComplementCards complements={[task]} theme={theme} />);
        const card = screen.getByRole("article");
        expect(card).toHaveClass("min-w-0");
        expect(card).toHaveClass("[overflow-wrap:anywhere]");
    });

    it("scales rich-text headings down so a task reads as a card", () => {
        render(<LessonComplementCards complements={[task]} theme={theme} />);
        const content = screen.getByTestId("task-content");
        expect(content.className).toContain("[&_h1]:!normal-case");
        expect(content.className).toContain("[&_h1]:!text-xl");
        expect(content.className).toContain("[&_h3]:!text-base");
    });

    it("shows the task's rich text", () => {
        render(<LessonComplementCards complements={[task]} theme={theme} />);
        expect(screen.getByTestId("task-text")).toHaveTextContent("Do it");
    });

    it("opens links in a new tab without leaking the opener", () => {
        render(<LessonComplementCards complements={[link]} theme={theme} />);
        const anchor = screen.getByRole("link", { name: /Abrir enlace/ });
        expect(anchor).toHaveAttribute("href", "https://example.com/read");
        expect(anchor).toHaveAttribute("target", "_blank");
        expect(anchor.getAttribute("rel")).toContain("noopener");
        expect(anchor.getAttribute("rel")).toContain("noreferrer");
    });

    it("does not make a link out of a non-http url", () => {
        render(
            <LessonComplementCards
                complements={[{ ...link, url: "javascript:alert(1)" }]}
                theme={theme}
            />,
        );
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("offers documents with a file as a download", () => {
        render(
            <LessonComplementCards complements={[document]} theme={theme} />,
        );
        const anchor = screen.getByRole("link", { name: /Descargar/ });
        expect(anchor).toHaveAttribute("href", document.media.file);
        expect(anchor).toHaveAttribute("download", "workbook.pdf");
    });

    it("shows documents without a file as unavailable, never as a link", () => {
        render(
            <LessonComplementCards
                complements={[{ ...document, media: { mediaId: "m1" } }]}
                theme={theme}
            />,
        );
        expect(screen.getByText("Workbook")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});
