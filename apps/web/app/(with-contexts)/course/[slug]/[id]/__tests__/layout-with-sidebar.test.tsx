let mockPathname = "/course/test-course/course-1";
let mockSearchParams = new URLSearchParams();
let mockIsEnrolled = true;
let mockCompletedLessons: string[] = [];

jest.mock("next/navigation", () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => mockSearchParams,
}));

jest.mock("next/link", () => {
    function MockLink({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string;
    }) {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    }

    return MockLink;
});

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        ProfileContext: React.createContext({
            profile: {
                userId: "user-1",
                purchases: [],
            },
        }),
        SiteInfoContext: React.createContext({
            title: "Test Site",
            logo: undefined,
            hideCourseLitBranding: true,
        }),
        ThemeContext: React.createContext({
            theme: {},
        }),
        AddressContext: React.createContext({
            backend: "http://localhost:3000",
            frontend: "http://localhost:3000",
        }),
    };
});

jest.mock("@components/ui/sidebar", () => ({
    Sidebar: ({ children }: any) => children,
    SidebarContent: ({ children }: any) => children,
    SidebarGroup: ({ children }: any) => children,
    SidebarGroupContent: ({ children }: any) => children,
    SidebarGroupLabel: ({ children }: any) => children,
    SidebarHeader: ({ children }: any) => children,
    SidebarInset: ({ children }: any) => children,
    SidebarMenu: ({ children }: any) => children,
    SidebarMenuButton: ({ children }: any) => children,
    SidebarMenuItem: ({ children }: any) => children,
    SidebarProvider: ({ children }: any) => children,
    SidebarTrigger: () => null,
    useSidebar: () => ({
        open: false,
        openMobile: false,
        isMobile: false,
        setOpenMobile: jest.fn(),
    }),
}));

jest.mock("@components/ui/tooltip", () => ({
    Tooltip: ({ children }: any) => children,
    TooltipContent: ({ children }: any) => children,
    TooltipProvider: ({ children }: any) => children,
    TooltipTrigger: ({ children }: any) => children,
}));

jest.mock("@components/ui/collapsible", () => ({
    Collapsible: ({ children }: any) => children,
    CollapsibleContent: ({ children }: any) => children,
    CollapsibleTrigger: ({ children }: any) => children,
}));

jest.mock("@components/ui/button", () => ({
    Button: ({ children }: any) => children,
}));

jest.mock("@components/admin/next-theme-switcher", () => () => null);

jest.mock("@/components/public/product-discussions/panel", () => () => null);

jest.mock("@courselit/components-library", () => ({
    Image: () => null,
    LessonIcon: ({ type }: { type: string }) => (
        <span data-testid={`lesson-icon-${type}`} />
    ),
}));

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: () => null,
}));

jest.mock("@courselit/text-editor", () => ({
    Editor: () => null,
    emptyDoc: {},
}));

jest.mock("@courselit/icons", () => ({
    CheckCircled: () => <span data-testid="status-completed" />,
    Circle: () => <span data-testid="status-pending" />,
    Lock: () => <span data-testid="status-locked" />,
}));

jest.mock("lucide-react", () => ({
    BookOpen: () => null,
    ChevronRight: () => null,
    Clock: () => null,
    FileText: () => null,
    Folder: () => null,
    Link2: () => null,
    ListChecks: () => null,
    LogOutIcon: () => null,
    MessageSquare: () => null,
}));

jest.mock("@courselit/page-primitives", () => ({
    Caption: ({ children }: any) => children,
}));

jest.mock("@ui-lib/utils", () => ({
    formattedLocaleDate: () => "Mar 22, 2026",
    isEnrolled: () => mockIsEnrolled,
    isLessonCompleted: ({ lessonId }: { lessonId: string }) =>
        mockCompletedLessons.includes(lessonId),
}));

import { Constants, Profile } from "@courselit/common-models";
import ProductPage, { generateSideBarItems } from "../layout-with-sidebar";
import { CourseFrontend } from "../helpers";
import constants from "@/config/constants";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfileContext } from "@components/contexts";

describe("generateSideBarItems", () => {
    const originalDateNow = Date.now;
    const originalRelativeDripUnitInMillis = constants.relativeDripUnitInMillis;

    beforeEach(() => {
        mockPathname = "/course/test-course/course-1";
        mockSearchParams = new URLSearchParams();
        mockIsEnrolled = true;
        mockCompletedLessons = [];
        Date.now = jest.fn(() =>
            new Date("2026-03-22T00:00:00.000Z").getTime(),
        );
        Object.assign(constants, {
            relativeDripUnitInMillis: 1,
        });
    });

    afterEach(() => {
        Date.now = originalDateNow;
        Object.assign(constants, {
            relativeDripUnitInMillis: originalRelativeDripUnitInMillis,
        });
    });

    it("hides the drip badge once the group has been released to the learner", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "First section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: "2026-03-22T00:00:00.000Z",
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
    });

    it("hides the drip badge when a released group is keyed by _id", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    _id: "group-legacy-1",
                    name: "First section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: "2026-03-22T00:00:00.000Z",
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-legacy-1"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
    });

    it("shows cumulative relative drip time for later sections", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-0",
                    name: "Exact Date Section 1",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2099-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
                {
                    id: "group-1",
                    name: "Tenth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-3",
                    name: "Exact Date Section 2",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2026-03-25T00:00:00.000Z",
                        ).getTime(),
                    },
                },
                {
                    id: "group-4",
                    name: "Twelfth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 1,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[2].badge?.text).toBe("2 days");
        expect(items[4].badge?.text).toBe("3 days");
    });

    it("shows cumulative relative drip time across consecutive locked sections", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Eighth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-2",
                    name: "Ninth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 1,
                    },
                },
                {
                    id: "group-3",
                    name: "Tenth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 5,
                    },
                },
                {
                    id: "group-4",
                    name: "Eleventh Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[3].badge?.text).toBe("8 days");
        expect(items[4].badge?.text).toBe("10 days");
    });

    it("shows exact-date drip labels based on dateInUTC", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Exact Date Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2099-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("Mar 22, 2026");
        expect(items[1].badge?.description).toBe("Available on Mar 22, 2026");
    });

    it("does not let prior relative drips affect exact-date labels", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 50,
                    },
                },
                {
                    id: "group-2",
                    name: "Exact Date Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2026-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[2].badge?.text).toBe("Mar 22, 2026");
        expect(items[2].badge?.description).toBe("");
    });

    it("uses purchase createdAt as the relative drip anchor when lastDripAt is absent", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 86_400_000,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2 * constants.relativeDripUnitInMillis,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date(
                        "2026-03-20T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("0 days");
    });

    it("uses purchase lastDripAt as the relative drip anchor when present", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 86_400_000,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2 * constants.relativeDripUnitInMillis,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date(
                        "2026-03-10T00:00:00.000Z",
                    ).toISOString(),
                    lastDripAt: new Date(
                        "2026-03-21T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("1 days");
    });

    it("does not accumulate already accessible relative sections after lastDripAt", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 1,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section 1",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-2",
                    name: "Relative Section 2",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 5,
                    },
                },
                {
                    id: "group-3",
                    name: "Relative Section 3",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 3,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1", "group-2"],
                    createdAt: new Date(
                        "2026-03-10T00:00:00.000Z",
                    ).toISOString(),
                    lastDripAt: new Date(
                        "2026-03-22T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[3].badge?.text).toBe("3 days");
    });

    it("renders reordered lessons under the destination section in sidebar order", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-2",
            groups: [
                {
                    id: "group-1",
                    name: "First Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Text 1",
                            requiresEnrollment: false,
                        },
                    ],
                },
                {
                    id: "group-2",
                    name: "Second Section",
                    lessons: [
                        {
                            lessonId: "lesson-2",
                            title: "Chapter 5 - Text 2",
                            requiresEnrollment: false,
                        },
                        {
                            lessonId: "lesson-3",
                            title: "Text 3",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1", "group-2"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        const firstSectionItems = items.find(
            (item) => item.title === "First Section",
        )?.items;
        const secondSectionItems = items.find(
            (item) => item.title === "Second Section",
        )?.items;

        expect(firstSectionItems?.map((item) => item.title)).toEqual([
            "Text 1",
        ]);
        expect(secondSectionItems?.map((item) => item.title)).toEqual([
            "Chapter 5 - Text 2",
            "Text 3",
        ]);
    });

    it("renders a lesson-type icon for each lesson in the sidebar", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "First Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Video lesson",
                            type: "video",
                            requiresEnrollment: false,
                        },
                        {
                            lessonId: "lesson-2",
                            title: "Text lesson",
                            type: "text",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );
        const lessonItems = items.find(
            (item) => item.title === "First Section",
        )?.items;

        render(
            <>
                {lessonItems?.map((item) => (
                    <div key={item.title} data-testid={item.title}>
                        {item.leadingIcon}
                    </div>
                ))}
            </>,
        );

        expect(
            screen
                .getByTestId("Video lesson")
                .querySelector('[data-testid="lesson-icon-video"]'),
        ).not.toBeNull();
        expect(
            screen
                .getByTestId("Text lesson")
                .querySelector('[data-testid="lesson-icon-text"]'),
        ).not.toBeNull();
    });

    it("shows dripped enrollment-gated lessons as unlocked in preview mode", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [
                {
                    id: "group-1",
                    name: "Admin Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Gated Lesson",
                            requiresEnrollment: true,
                        },
                    ],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "admin-1",
            purchases: [],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
        expect(items[1].items?.[0].icon).toBeUndefined();
    });

    it("does not bypass learner drip rules for course managers outside preview mode", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "admin-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [
                {
                    id: "group-1",
                    name: "Dripped Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "admin-1",
            permissions: [constants.permissions.manageCourse],
            purchases: [],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("2 days");
    });
});

describe("Course sidebar complements and progress", () => {
    const baseCourse = (overrides: Record<string, unknown> = {}) =>
        ({
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [
                {
                    id: "group-1",
                    name: "First Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Lesson one",
                            type: "text",
                            requiresEnrollment: true,
                            complements: [
                                {
                                    complementId: "c1",
                                    type: "task",
                                    title: "Tarea 1",
                                },
                                {
                                    complementId: "c2",
                                    type: "link",
                                    title: "Enlace 1",
                                },
                            ],
                        },
                        {
                            lessonId: "lesson-2",
                            title: "Lesson two",
                            type: "video",
                            requiresEnrollment: true,
                        },
                    ],
                },
            ],
            ...overrides,
        }) as unknown as CourseFrontend;

    const enrolledProfile = {
        userId: "user-1",
        purchases: [{ courseId: "course-1", accessibleGroups: ["group-1"] }],
    } as unknown as Profile;

    const renderPage = (course: CourseFrontend, profile: any) =>
        render(
            <ProfileContext.Provider value={{ profile } as any}>
                <ProductPage product={course}>
                    <div>Body</div>
                </ProductPage>
            </ProfileContext.Provider>,
        );

    beforeEach(() => {
        mockPathname = "/course/test-course/course-1";
        mockSearchParams = new URLSearchParams();
        mockIsEnrolled = true;
        mockCompletedLessons = [];
    });

    it("lists each lesson's complements with an anchor to the lesson page", () => {
        const items = generateSideBarItems(
            baseCourse(),
            enrolledProfile,
            "/course/test-course/course-1",
        );
        const lessons = items.find((i) => i.title === "First Section")!.items!;

        expect(lessons[0].complements).toEqual([
            {
                complementId: "c1",
                type: "task",
                title: "Tarea 1",
                href: "/course/test-course/course-1/lesson-1#complement-c1",
            },
            {
                complementId: "c2",
                type: "link",
                title: "Enlace 1",
                href: "/course/test-course/course-1/lesson-1#complement-c2",
            },
        ]);
        expect(lessons[1].complements).toEqual([]);
    });

    it("keeps preview params in complement hrefs, before the anchor", () => {
        const items = generateSideBarItems(
            baseCourse({ isPreview: true }),
            enrolledProfile,
            "/course/test-course/course-1",
            { preview: true, returnTo: undefined } as any,
        );
        const href = items.find((i) => i.title === "First Section")!.items![0]
            .complements![0].href;
        expect(href).toMatch(/lesson-1\?[^#]*preview=true[^#]*#complement-c1$/);
    });

    it("counts completed lessons per section for enrolled learners", () => {
        mockCompletedLessons = ["lesson-2"];
        const items = generateSideBarItems(
            baseCourse(),
            enrolledProfile,
            "/course/test-course/course-1",
        );
        expect(
            items.find((i) => i.title === "First Section")!.progress,
        ).toEqual({ completed: 1, total: 2 });
    });

    it.each([
        ["guests", {}, true],
        ["learners who are not enrolled", { userId: "user-2" }, false],
    ])("shows no section progress to %s", (_label, profile, enrolled) => {
        mockIsEnrolled = enrolled;
        const items = generateSideBarItems(
            baseCourse(),
            profile as Profile,
            "/course/test-course/course-1",
        );
        expect(
            items.find((i) => i.title === "First Section")!.progress,
        ).toBeUndefined();
    });

    it("shows no section progress in preview mode", () => {
        const items = generateSideBarItems(
            baseCourse({ isPreview: true }),
            enrolledProfile,
            "/course/test-course/course-1",
        );
        expect(
            items.find((i) => i.title === "First Section")!.progress,
        ).toBeUndefined();
    });

    it("renders section progress as x/y", () => {
        mockCompletedLessons = ["lesson-2"];
        renderPage(baseCourse(), enrolledProfile);
        expect(screen.getByText("1/2")).toBeInTheDocument();
    });

    it("puts the lesson type icon before the title and the completion state after it, all inside the link", () => {
        mockCompletedLessons = ["lesson-2"];
        renderPage(baseCourse(), enrolledProfile);

        const before = (a: Element, b: Element) =>
            Boolean(
                a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
            );
        const firstRow = screen.getByText("Lesson one").closest("a")!;
        const secondRow = screen.getByText("Lesson two").closest("a")!;
        const title = screen.getByText("Lesson two");
        const typeIcon = secondRow.querySelector(
            '[data-testid="lesson-icon-video"]',
        )!;
        const done = secondRow.querySelector(
            '[data-testid="status-completed"]',
        )!;

        expect(typeIcon).not.toBeNull();
        expect(done).not.toBeNull();
        expect(before(typeIcon, title)).toBe(true);
        expect(before(title, done)).toBe(true);
        expect(
            firstRow.querySelector('[data-testid="status-pending"]'),
        ).not.toBeNull();
    });

    it("lays each lesson row out on one line: type icon, title, state", () => {
        renderPage(baseCourse(), enrolledProfile);
        const link = screen.getByText("Lesson one").closest("a")!;
        expect(link.children).toHaveLength(3);
        expect(link.children[1]).toHaveTextContent("Lesson one");
        expect(link.children[1].children).toHaveLength(0);
    });

    it("shows no Complementos item for lessons without complements, not even (0)", () => {
        renderPage(
            baseCourse({
                groups: [
                    {
                        id: "group-1",
                        name: "First Section",
                        lessons: [
                            {
                                lessonId: "lesson-2",
                                title: "Lesson two",
                                type: "video",
                                requiresEnrollment: true,
                                complements: [],
                            },
                        ],
                    },
                ],
            }),
            enrolledProfile,
        );
        expect(screen.queryByText(/Complementos/)).not.toBeInTheDocument();
    });

    it("keeps the lock on lessons that need enrollment for guests", () => {
        renderPage(baseCourse(), {});
        const row = screen.getByText("Lesson one").closest("a")!;
        expect(
            row.querySelector('[data-testid="status-locked"]'),
        ).not.toBeNull();
    });

    it("shows a collapsed Complementos (n) toggle only under lessons that have complements", () => {
        renderPage(baseCourse(), enrolledProfile);

        const toggle = screen.getByRole("button", {
            name: /Complementos \(2\)/,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Tarea 1")).not.toBeInTheDocument();
        expect(
            screen.getAllByRole("button", { name: /Complementos/ }),
        ).toHaveLength(1);
    });

    it("expands to links that jump to each complement", () => {
        renderPage(baseCourse(), enrolledProfile);

        fireEvent.click(
            screen.getByRole("button", { name: /Complementos \(2\)/ }),
        );

        expect(
            screen.getByRole("button", { name: /Complementos \(2\)/ }),
        ).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("link", { name: /Tarea 1/ })).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1#complement-c1",
        );
        expect(screen.getByRole("link", { name: /Enlace 1/ })).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1#complement-c2",
        );
    });

    it("opens the complements of the lesson being viewed", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        renderPage(baseCourse(), enrolledProfile);
        expect(
            screen.getByRole("button", { name: /Complementos \(2\)/ }),
        ).toHaveAttribute("aria-expanded", "true");
        expect(
            screen.getByRole("link", { name: /Tarea 1/ }),
        ).toBeInTheDocument();
    });
});

describe("Course viewer layout", () => {
    beforeEach(() => {
        mockPathname = "/course/test-course/course-1";
        mockSearchParams = new URLSearchParams();
        mockIsEnrolled = true;
    });

    it("renders the preview badge in the viewer header when preview mode is active", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [],
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Course body</div>
            </ProductPage>,
        );

        expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("makes the lesson icon and title part of the same sidebar link", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [
                {
                    id: "group-1",
                    name: "First Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Video lesson",
                            type: "video",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
        } as unknown as CourseFrontend;

        render(
            <ProfileContext.Provider
                value={
                    {
                        profile: {
                            userId: "user-1",
                            purchases: [
                                {
                                    courseId: "course-1",
                                    accessibleGroups: ["group-1"],
                                },
                            ],
                        },
                    } as any
                }
            >
                <ProductPage product={course}>
                    <div>Course body</div>
                </ProductPage>
            </ProfileContext.Provider>,
        );

        const link = screen
            .getByTestId("lesson-icon-video")
            .closest("a") as HTMLAnchorElement | null;
        expect(link).not.toBeNull();
        expect(link?.getAttribute("href")).toBe(
            "/course/test-course/course-1/lesson-1",
        );
        expect(link).toHaveTextContent("Video lesson");
        expect(link?.querySelector("button")).toBeNull();
    });

    it("shows the discussions sidebar item only when discussions are enabled", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [],
            discussions: false,
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        expect(
            generateSideBarItems(
                course,
                profile,
                "/course/test-course/course-1",
            ).some((item) => item.title === "Discussions"),
        ).toBe(false);

        expect(
            generateSideBarItems(
                { ...course, discussions: true } as CourseFrontend,
                profile,
                "/course/test-course/course-1/discussions",
            ).find((item) => item.title === "Discussions"),
        ).toMatchObject({
            href: "/course/test-course/course-1/discussions",
            isActive: true,
        });
    });

    it("hides discussion sidebar and header actions for guests", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        expect(
            generateSideBarItems(
                course,
                {} as Profile,
                "/course/test-course/course-1/discussions",
            ).some((item) => item.title === "Discussions"),
        ).toBe(false);

        render(
            <ProfileContext.Provider value={{ profile: {} } as any}>
                <ProductPage product={course}>
                    <div>Public lesson body</div>
                </ProductPage>
            </ProfileContext.Provider>,
        );

        expect(screen.getByText("Public lesson body")).toBeInTheDocument();
        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("hides discussion sidebar and header actions for logged-in non-enrolled users", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        mockIsEnrolled = false;
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;
        const profile = {
            userId: "user-1",
            purchases: [],
        } as unknown as Profile;

        expect(
            generateSideBarItems(
                course,
                profile,
                "/course/test-course/course-1/discussions",
            ).some((item) => item.title === "Discussions"),
        ).toBe(false);

        render(
            <ProductPage product={course}>
                <div>Public lesson body</div>
            </ProductPage>,
        );

        expect(screen.getByText("Public lesson body")).toBeInTheDocument();
        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("does not show a discussions header action on the course overview page", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Course body</div>
            </ProductPage>,
        );

        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("does not show a discussions header action on the discussions hub page", () => {
        mockPathname = "/course/test-course/course-1/discussions";
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Discussions body</div>
            </ProductPage>,
        );

        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("opens the discussion panel from lesson pages", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(screen.getByLabelText("Discussions")).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1?discussion=open",
        );
    });

    it("preserves preview session params when opening the discussion panel", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        mockSearchParams = new URLSearchParams(
            "preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1",
        );
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(screen.getByLabelText("Discussions")).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1?preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1&discussion=open",
        );
    });

    it("preserves the open discussion panel while navigating lesson links", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        mockSearchParams = new URLSearchParams("discussion=open");
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [
                {
                    id: "group-1",
                    name: "Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Lesson 1",
                            requiresEnrollment: false,
                        },
                        {
                            lessonId: "lesson-2",
                            title: "Lesson 2",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
            discussions: true,
        } as unknown as CourseFrontend;

        const { container } = render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(
            container.querySelector(
                'a[href="/course/test-course/course-1/lesson-2?discussion=open"]',
            ),
        ).toBeInTheDocument();
    });
});
