import React from "react";
import { render, screen } from "@testing-library/react";
import { LessonViewer } from "../index";
import { INSTRUCTORS_VIEWER_HEADING } from "@ui-config/strings";

const mockExec = jest.fn();

jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn().mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    })),
}));
jest.mock("@courselit/components-library", () => ({
    Link: ({ children, href }: any) => <a href={href}>{children}</a>,
    Skeleton: () => <div data-testid="skeleton" />,
    useToast: () => ({ toast: jest.fn() }),
}));
jest.mock("@courselit/page-blocks", () => ({ TextRenderer: () => null }));
jest.mock("@courselit/page-primitives", () => ({
    Button: ({ children }: any) => <button>{children}</button>,
    Header1: ({ children }: any) => <h1>{children}</h1>,
    Header2: ({ children }: any) => <h2>{children}</h2>,
    Header3: ({ children }: any) => <h3>{children}</h3>,
    Text2: ({ children }: any) => <p>{children}</p>,
    Text1: ({ children }: any) => <p>{children}</p>,
}));
jest.mock("@courselit/icons", () => ({
    ArrowLeft: () => null,
    ArrowRight: () => null,
    ArrowDownward: () => null,
}));
jest.mock("lucide-react", () => ({ BookOpen: () => null, Check: () => null }));
jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest.fn(),
}));
jest.mock("../embed-viewer", () => () => null);
jest.mock("../quiz-viewer", () => () => null);
jest.mock("../scorm-viewer", () => () => null);
jest.mock("../../base-layout/template/widget-error-boundary", () => ({
    __esModule: true,
    default: ({ children }: any) => <>{children}</>,
}));
jest.mock("@components/contexts", () => {
    const React = require("react");
    return { ThemeContext: React.createContext({ theme: {} }) };
});

const ann = {
    instructorId: "ann",
    name: "Ann Ada",
    bio: "Ann teaches things",
    links: [],
};
const bob = {
    instructorId: "bob",
    name: "Bob Hopper",
    bio: "Bob builds things",
    links: [],
};

const lesson = {
    lessonId: "lesson-1",
    title: "My lesson",
    type: "TEXT",
    content: null,
    requiresEnrollment: false,
    courseId: "course-1",
};

const renderViewer = () =>
    render(
        <LessonViewer
            slug="course"
            lessonId="lesson-1"
            productId="course-1"
            profile={null}
            setProfile={jest.fn()}
            address={{ backend: "http://localhost", frontend: "" } as any}
        />,
    );

const respondWith = (course: Record<string, unknown>) =>
    mockExec.mockResolvedValue({
        course: { title: "The course", isPreview: false, ...course },
        lesson,
    });

describe("LessonViewer instructors", () => {
    beforeEach(() => jest.clearAllMocks());

    it("shows the section's instructors block after the lesson, not a credit under the title", async () => {
        respondWith({
            instructors: [ann],
            groups: [{ id: "g1", instructors: [bob] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        expect(
            await screen.findByRole("heading", {
                name: INSTRUCTORS_VIEWER_HEADING,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText("Bob Hopper")).toBeInTheDocument();
        expect(screen.getByText("Bob builds things")).toBeInTheDocument();
        expect(screen.queryByText(/Ann Ada/)).toBeNull();
        expect(screen.queryByText(/^Con /)).toBeNull();

        const title = screen.getByRole("heading", { name: "My lesson" });
        const block = screen.getByRole("heading", {
            name: INSTRUCTORS_VIEWER_HEADING,
        });
        expect(
            title.compareDocumentPosition(block) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("falls back to the course's instructors", async () => {
        respondWith({
            instructors: [ann],
            groups: [{ id: "g1", instructors: [] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        expect(await screen.findByText("Ann Ada")).toBeInTheDocument();
        expect(screen.getByText("Ann teaches things")).toBeInTheDocument();
    });

    it("shows nothing when no instructor is assigned", async () => {
        respondWith({
            instructors: [],
            groups: [{ id: "g1", instructors: [] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        await screen.findByRole("heading", { name: "My lesson" });
        expect(
            screen.queryByRole("heading", { name: INSTRUCTORS_VIEWER_HEADING }),
        ).toBeNull();
    });
});
