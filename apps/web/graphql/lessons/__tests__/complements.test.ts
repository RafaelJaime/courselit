import { Constants } from "@courselit/common-models";
import DomainModel from "@/models/Domain";
import UserModel from "@/models/User";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import { deleteLesson, getAllLessons, updateLesson } from "../logic";
import { getLessonComplements } from "../complements";
import { responses } from "@/config/strings";
import { deleteMedia, getMedia, sealMedia } from "@/services/medialit";

// the shared nanoid mock always returns the same id
jest.mock("nanoid", () => {
    let mockGenerated = 0;
    return { nanoid: jest.fn(() => `generated-id-${++mockGenerated}`) };
});

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn(),
    getMedia: jest.fn(),
    sealMedia: jest.fn(),
}));

const SUITE_PREFIX = `lesson-complements-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

const doc = (text: string) =>
    JSON.stringify({
        type: "doc",
        content: [
            { type: "paragraph", content: [{ type: "text", text: text }] },
        ],
    });

describe("Lesson complements", () => {
    let testDomain: any;
    let admin: any;
    let student: any;
    let outsider: any;
    let course: any;
    let groupId: string;
    let adminCtx: any;
    let studentCtx: any;
    let outsiderCtx: any;
    let anonymousCtx: any;
    let lessonCounter = 0;

    const createLesson = async (overrides: Record<string, unknown> = {}) => {
        lessonCounter += 1;
        return LessonModel.create({
            domain: testDomain._id,
            courseId: course.courseId,
            lessonId: id(`lesson-${lessonCounter}`),
            title: `Lesson ${lessonCounter}`,
            type: Constants.LessonType.TEXT,
            published: true,
            requiresEnrollment: false,
            content: { type: "doc", content: [] },
            creatorId: admin.userId,
            groupId,
            ...overrides,
        });
    };

    const sealedDocument = (mediaId: string, overrides = {}) => ({
        mediaId,
        originalFileName: "guide.pdf",
        mimeType: "application/pdf",
        size: 100,
        access: "private",
        group: testDomain.name,
        file: "https://media.example.com/unsigned.pdf",
        thumbnail: "",
        ...overrides,
    });

    const documentInput = (mediaId: string, title = "Guide") => ({
        type: "document",
        title,
        media: {
            mediaId,
            originalFileName: "guide.pdf",
            mimeType: "application/pdf",
            size: 100,
            access: "private",
        },
    });

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            features: [],
        });
        const makeUser = (suffix: string, permissions: string[]) =>
            UserModel.create({
                domain: testDomain._id,
                userId: id(suffix),
                email: email(suffix),
                name: suffix,
                active: true,
                permissions,
                unsubscribeToken: id(`unsubscribe-${suffix}`),
                purchases: [],
            });
        admin = await makeUser("admin", ["course:manage_any"]);
        student = await makeUser("student", []);
        outsider = await makeUser("outsider", []);

        groupId = id("group");
        course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: "Complements Course",
            lessons: [],
            creatorId: admin.userId,
            cost: 0,
            privacy: "public",
            type: "course",
            costType: "free",
            slug: id("course-slug"),
            published: true,
            groups: [
                {
                    _id: groupId,
                    name: "Group",
                    lessonsOrder: [],
                    rank: 1,
                    collapsed: true,
                    drip: { status: false, type: "relative-date" },
                },
            ],
        });

        student.purchases.push({
            courseId: course.courseId,
            accessibleGroups: [groupId],
            completedLessons: [],
        });
        student.markModified("purchases");
        await student.save();

        adminCtx = { user: admin, subdomain: testDomain } as any;
        studentCtx = { user: student, subdomain: testDomain } as any;
        outsiderCtx = { user: outsider, subdomain: testDomain } as any;
        anonymousCtx = { subdomain: testDomain } as any;
    });

    afterAll(async () => {
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (getMedia as jest.Mock).mockImplementation(async (mediaId: string) => ({
            mediaId,
            originalFileName: "guide.pdf",
            mimeType: "application/pdf",
            size: 100,
            access: "private",
            group: testDomain.name,
            file: `https://media.example.com/signed/${mediaId}.pdf?sig=abc`,
        }));
    });

    describe("updateLesson", () => {
        it("stores task, link and document complements in order with generated ids", async () => {
            const lesson = await createLesson();
            const mediaId = id("doc-media-1");
            (sealMedia as jest.Mock).mockResolvedValueOnce(
                sealedDocument(mediaId),
            );

            const updated = await updateLesson(
                {
                    id: lesson.lessonId,
                    complements: [
                        {
                            type: "task",
                            title: "Homework",
                            content: doc("Do it"),
                        },
                        {
                            type: "link",
                            title: "Reading",
                            url: "https://example.com/read",
                        },
                        documentInput(mediaId),
                    ],
                } as any,
                adminCtx,
            );

            expect(updated.complements!.map((c: any) => c.type)).toEqual([
                "task",
                "link",
                "document",
            ]);
            expect(updated.complements!.map((c: any) => c.title)).toEqual([
                "Homework",
                "Reading",
                "Guide",
            ]);
            const ids = updated.complements!.map((c: any) => c.complementId);
            expect(new Set(ids).size).toBe(3);
            expect(ids.every((x: string) => !!x)).toBe(true);
            expect(updated.complements![0].content?.type).toBe("doc");
            expect(updated.complements![1].url).toBe(
                "https://example.com/read",
            );
            expect(updated.complements![2].media?.mediaId).toBe(mediaId);
            expect(sealMedia).toHaveBeenCalledWith(mediaId);
            // private files are signed on read, never stored
            expect(updated.complements![2].media?.file).toBeUndefined();
        });

        it("keeps lessons without complements working (no migration needed)", async () => {
            const lesson = await createLesson();
            const updated = await updateLesson(
                { id: lesson.lessonId, title: "Renamed" } as any,
                adminCtx,
            );
            expect(updated.title).toBe("Renamed");
            expect(updated.complements ?? []).toEqual([]);
        });

        it("reorders complements keeping ids and without resealing stored media", async () => {
            const lesson = await createLesson();
            const mediaId = id("doc-media-reorder");
            (sealMedia as jest.Mock).mockResolvedValueOnce(
                sealedDocument(mediaId),
            );
            const first = await updateLesson(
                {
                    id: lesson.lessonId,
                    complements: [
                        { type: "task", title: "A", content: doc("a") },
                        documentInput(mediaId, "B"),
                    ],
                } as any,
                adminCtx,
            );
            const [a, b] = first.complements!.map((c: any) => c.complementId);
            (sealMedia as jest.Mock).mockClear();

            const second = await updateLesson(
                {
                    id: lesson.lessonId,
                    complements: [
                        { ...documentInput(mediaId, "B"), complementId: b },
                        {
                            complementId: a,
                            type: "task",
                            title: "A",
                            content: doc("a"),
                        },
                    ],
                } as any,
                adminCtx,
            );

            expect(second.complements!.map((c: any) => c.complementId)).toEqual(
                [b, a],
            );
            expect(sealMedia).not.toHaveBeenCalled();
            expect(deleteMedia).not.toHaveBeenCalled();
        });

        it.each([
            ["an unknown type", { type: "video", title: "x" }],
            [
                "an empty title",
                { type: "task", title: "  ", content: doc("x") },
            ],
            [
                "a task without valid content",
                { type: "task", title: "x", content: "not json" },
            ],
            [
                "a task whose content is not a doc",
                { type: "task", title: "x", content: JSON.stringify({ a: 1 }) },
            ],
            [
                "a javascript: link",
                { type: "link", title: "x", url: "javascript:alert(1)" },
            ],
            ["a link without url", { type: "link", title: "x" }],
            [
                "a link with a malformed url",
                { type: "link", title: "x", url: "not a url" },
            ],
            ["a document without media", { type: "document", title: "x" }],
            [
                "a link carrying document media",
                {
                    type: "link",
                    title: "x",
                    url: "https://a.b",
                    media: { mediaId: "m" },
                },
            ],
        ])("rejects %s", async (_label, complement) => {
            const lesson = await createLesson();
            await expect(
                updateLesson(
                    { id: lesson.lessonId, complements: [complement] } as any,
                    adminCtx,
                ),
            ).rejects.toThrow(responses.invalid_input);
            const stored = await LessonModel.findOne({
                lessonId: lesson.lessonId,
                domain: testDomain._id,
            });
            expect(stored!.complements ?? []).toHaveLength(0);
        });

        it("rejects duplicated complement ids", async () => {
            const lesson = await createLesson();
            await expect(
                updateLesson(
                    {
                        id: lesson.lessonId,
                        complements: [
                            {
                                complementId: "dup",
                                type: "link",
                                title: "a",
                                url: "https://a.b",
                            },
                            {
                                complementId: "dup",
                                type: "link",
                                title: "b",
                                url: "https://c.d",
                            },
                        ],
                    } as any,
                    adminCtx,
                ),
            ).rejects.toThrow(responses.invalid_input);
        });

        it("rejects document media uploaded under another school", async () => {
            const lesson = await createLesson();
            const mediaId = id("foreign-media");
            (sealMedia as jest.Mock).mockResolvedValueOnce(
                sealedDocument(mediaId, { group: "someone-else" }),
            );
            await expect(
                updateLesson(
                    {
                        id: lesson.lessonId,
                        complements: [documentInput(mediaId)],
                    } as any,
                    adminCtx,
                ),
            ).rejects.toThrow(responses.lesson_complement_media_not_allowed);
        });

        it("rejects public document media", async () => {
            const lesson = await createLesson();
            const mediaId = id("public-media");
            (sealMedia as jest.Mock).mockResolvedValueOnce(
                sealedDocument(mediaId, { access: "public" }),
            );
            await expect(
                updateLesson(
                    {
                        id: lesson.lessonId,
                        complements: [documentInput(mediaId)],
                    } as any,
                    adminCtx,
                ),
            ).rejects.toThrow(responses.lesson_complement_media_not_allowed);
        });

        it("rejects media already used by another lesson", async () => {
            const mediaId = id("shared-media");
            await createLesson({
                type: Constants.LessonType.PDF,
                media: {
                    mediaId,
                    originalFileName: "a.pdf",
                    mimeType: "application/pdf",
                    size: 1,
                    access: "private",
                },
            });
            const lesson = await createLesson();
            await expect(
                updateLesson(
                    {
                        id: lesson.lessonId,
                        complements: [documentInput(mediaId)],
                    } as any,
                    adminCtx,
                ),
            ).rejects.toThrow(responses.lesson_complement_media_not_allowed);
            expect(sealMedia).not.toHaveBeenCalled();
        });

        it("deletes the media of removed document complements", async () => {
            const lesson = await createLesson();
            const mediaId = id("doc-media-remove");
            (sealMedia as jest.Mock).mockResolvedValueOnce(
                sealedDocument(mediaId),
            );
            const withDoc = await updateLesson(
                {
                    id: lesson.lessonId,
                    complements: [
                        documentInput(mediaId),
                        { type: "link", title: "L", url: "https://a.b" },
                    ],
                } as any,
                adminCtx,
            );
            const linkId = withDoc.complements![1].complementId;

            const updated = await updateLesson(
                {
                    id: lesson.lessonId,
                    complements: [
                        {
                            complementId: linkId,
                            type: "link",
                            title: "L",
                            url: "https://a.b",
                        },
                    ],
                } as any,
                adminCtx,
            );

            expect(updated.complements).toHaveLength(1);
            expect(deleteMedia).toHaveBeenCalledWith(mediaId);
        });

        it("does not let a regular user edit complements", async () => {
            const lesson = await createLesson();
            await expect(
                updateLesson(
                    {
                        id: lesson.lessonId,
                        complements: [
                            { type: "link", title: "x", url: "https://a.b" },
                        ],
                    } as any,
                    studentCtx,
                ),
            ).rejects.toThrow();
        });
    });

    describe("getLessonComplements", () => {
        let lesson: any;
        let mediaId: string;

        beforeAll(async () => {
            mediaId = id("doc-media-read");
            lesson = await createLesson({
                complements: [
                    {
                        complementId: "t1",
                        type: "task",
                        title: "Task",
                        content: JSON.parse(doc("hi")),
                    },
                    {
                        complementId: "l1",
                        type: "link",
                        title: "Link",
                        url: "https://example.com",
                    },
                    {
                        complementId: "d1",
                        type: "document",
                        title: "Doc",
                        media: {
                            mediaId,
                            originalFileName: "guide.pdf",
                            mimeType: "application/pdf",
                            size: 100,
                            access: "private",
                        },
                    },
                ],
            });
        });

        it("gives enrolled members a signed document url", async () => {
            const result = await getLessonComplements(lesson, studentCtx);
            expect(result).toHaveLength(3);
            expect(result[2].media?.file).toContain("sig=abc");
            expect(getMedia).toHaveBeenCalledWith(mediaId);
        });

        it("gives course managers a signed document url", async () => {
            const result = await getLessonComplements(lesson, adminCtx);
            expect(result[2].media?.file).toContain("sig=abc");
        });

        it("never gives anonymous visitors a document url", async () => {
            const result = await getLessonComplements(lesson, anonymousCtx);
            expect(result[0].title).toBe("Task");
            expect(result[2].media?.file).toBeUndefined();
            expect(getMedia).not.toHaveBeenCalled();
            expect(JSON.stringify(result)).not.toContain("sig=abc");
        });

        it("never gives signed urls to users who are not enrolled", async () => {
            const result = await getLessonComplements(lesson, outsiderCtx);
            expect(result[2].media?.file).toBeUndefined();
            expect(getMedia).not.toHaveBeenCalled();
        });

        it("returns an empty list for lessons without complements", async () => {
            const bare = await createLesson();
            expect(await getLessonComplements(bare, studentCtx)).toEqual([]);
        });
    });

    describe("getAllLessons", () => {
        it("exposes complement titles for the sidebar but not urls or media", async () => {
            const lesson = await createLesson({
                complements: [
                    {
                        complementId: "meta-1",
                        type: "link",
                        title: "Sidebar link",
                        url: "https://example.com/secret",
                    },
                ],
            });
            const lessons: any[] = await getAllLessons(course, anonymousCtx);
            const found = lessons.find((l) => l.lessonId === lesson.lessonId);
            expect(found.complements).toHaveLength(1);
            expect(found.complements[0].title).toBe("Sidebar link");
        });
    });

    describe("deleteLesson", () => {
        it("deletes the media of document complements", async () => {
            const mediaId = id("doc-media-delete-lesson");
            const lesson = await createLesson({
                complements: [
                    {
                        complementId: "d-del",
                        type: "document",
                        title: "Doc",
                        media: {
                            mediaId,
                            originalFileName: "guide.pdf",
                            mimeType: "application/pdf",
                            size: 100,
                            access: "private",
                        },
                    },
                ],
            });
            await deleteLesson(lesson.lessonId, adminCtx);
            expect(deleteMedia).toHaveBeenCalledWith(mediaId);
        });
    });
});
