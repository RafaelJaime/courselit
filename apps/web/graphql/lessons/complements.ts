/**
 * Lesson complements: tasks, links and private documents attached to a lesson.
 *
 * Kept apart from `logic.ts` so the feature stays isolated from the core lesson
 * code and is cheap to carry across upstream updates.
 */
import {
    Constants,
    LessonComplement,
    Media,
    Progress,
    TextEditorContent,
} from "@courselit/common-models";
import { extractMediaIDs, generateUniqueId } from "@courselit/utils";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import LessonModel, { Lesson } from "../../models/Lesson";
import CourseModel from "../../models/Course";
import { getMedia, sealMedia } from "../../services/medialit";
import { replaceTempMediaWithSealedMediaInProseMirrorDoc } from "../../lib/replace-temp-media-with-sealed-media-in-prosemirror-doc";
import { canManageCourseInContext } from "../courses/permissions";

const { privateMedia } = constants;
const { TASK, LINK, DOCUMENT } = Constants.LessonComplementType;

export const MAX_COMPLEMENTS_PER_LESSON = 50;
const MAX_TITLE_LENGTH = 200;

export interface LessonComplementInput {
    complementId?: string;
    type: string;
    title: string;
    content?: string;
    url?: string;
    media?: Partial<Media>;
}

function invalid(): never {
    throw new Error(responses.invalid_input);
}

function parseTaskContent(content: unknown): string {
    if (typeof content !== "string" || !content) {
        invalid();
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(content as string);
    } catch {
        invalid();
    }
    const doc = parsed as TextEditorContent;
    if (
        typeof doc !== "object" ||
        doc === null ||
        Array.isArray(doc) ||
        doc.type !== "doc" ||
        !Array.isArray(doc.content)
    ) {
        invalid();
    }
    return content as string;
}

function parseLinkUrl(url: unknown): string {
    if (typeof url !== "string") {
        invalid();
    }
    let parsed: URL;
    try {
        parsed = new URL((url as string).trim());
    } catch {
        return invalid();
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        invalid();
    }
    return parsed.toString();
}

function mediaIdsOf(complements?: LessonComplement[]): string[] {
    return (complements || [])
        .map((complement) => complement.media?.mediaId)
        .filter((mediaId): mediaId is string => !!mediaId);
}

async function sealNewDocument(
    mediaId: string,
    ctx: GQLContext,
    lessonId: string | undefined,
): Promise<Media> {
    // A file used elsewhere would be deleted from under that other use when
    // this complement is removed, so only unused files are accepted.
    const used = await LessonModel.exists({
        domain: ctx.subdomain._id,
        $or: [
            { "media.mediaId": mediaId },
            { "complements.media.mediaId": mediaId },
        ],
        ...(lessonId ? { lessonId: { $ne: lessonId } } : {}),
    });
    if (used) {
        throw new Error(responses.lesson_complement_media_not_allowed);
    }

    const sealed = await sealMedia(mediaId);
    if (
        !sealed ||
        sealed.group !== ctx.subdomain.name ||
        sealed.access !== privateMedia
    ) {
        throw new Error(responses.lesson_complement_media_not_allowed);
    }

    // Private file URLs are signed and expire, so they are fetched on read.
    delete sealed.file;
    delete sealed.group;
    return sealed;
}

/**
 * Validates the complements sent by the editor and turns them into what gets
 * stored. Documents already on the lesson are kept as stored.
 */
export async function prepareComplements(
    input: LessonComplementInput[] | null | undefined,
    ctx: GQLContext,
    lesson?: Lesson,
): Promise<LessonComplement[]> {
    if (input == null) {
        return [];
    }
    if (!Array.isArray(input) || input.length > MAX_COMPLEMENTS_PER_LESSON) {
        invalid();
    }

    const stored = new Map<string, LessonComplement>(
        (lesson?.complements || []).map((complement) => [
            complement.complementId,
            complement,
        ]),
    );
    const seenIds = new Set<string>();
    const seenMediaIds = new Set<string>();
    const result: LessonComplement[] = [];

    for (const item of input) {
        if (!item || typeof item !== "object") {
            invalid();
        }
        const title = typeof item.title === "string" ? item.title.trim() : "";
        if (!title || title.length > MAX_TITLE_LENGTH) {
            invalid();
        }
        const complementId = item.complementId || generateUniqueId();
        if (seenIds.has(complementId)) {
            invalid();
        }
        seenIds.add(complementId);

        if (item.type === TASK) {
            if (item.url || item.media) invalid();
            const content = parseTaskContent(item.content);
            result.push({
                complementId,
                type: TASK,
                title,
                content:
                    await replaceTempMediaWithSealedMediaInProseMirrorDoc(
                        content,
                    ),
            });
        } else if (item.type === LINK) {
            if (item.content || item.media) invalid();
            result.push({
                complementId,
                type: LINK,
                title,
                url: parseLinkUrl(item.url),
            });
        } else if (item.type === DOCUMENT) {
            if (item.content || item.url) invalid();
            const mediaId = item.media?.mediaId;
            if (!mediaId || seenMediaIds.has(mediaId)) {
                invalid();
            }
            seenMediaIds.add(mediaId as string);

            const previous = stored.get(complementId);
            const media =
                previous?.type === DOCUMENT &&
                previous.media?.mediaId === mediaId
                    ? (previous.media as Media)
                    : await sealNewDocument(
                          mediaId as string,
                          ctx,
                          lesson?.lessonId,
                      );
            result.push({
                complementId,
                type: DOCUMENT,
                title,
                media,
            });
        } else {
            invalid();
        }
    }

    return result;
}

/**
 * Media that was referenced by `previous` and is no longer by `next`.
 */
export function getRemovedComplementMediaIds(
    previous: LessonComplement[] | undefined,
    next: LessonComplement[] | undefined,
): string[] {
    const kept = new Set(mediaIdsOf(next));
    const removed = mediaIdsOf(previous).filter((id) => !kept.has(id));

    // Images embedded in task descriptions
    const keptImages = new Set<string>();
    for (const complement of next || []) {
        if (complement.content) {
            extractMediaIDs(JSON.stringify(complement.content)).forEach((id) =>
                keptImages.add(id),
            );
        }
    }
    for (const complement of previous || []) {
        if (complement.content) {
            extractMediaIDs(JSON.stringify(complement.content)).forEach(
                (id) => {
                    if (!keptImages.has(id)) removed.push(id);
                },
            );
        }
    }
    return removed;
}

/**
 * Every media id a lesson owns through its complements (for deletion).
 */
export function getComplementMediaIds(lesson: Lesson): string[] {
    return getRemovedComplementMediaIds(lesson.complements, []);
}

async function canAccessComplementFiles(
    lesson: Lesson,
    ctx: GQLContext,
): Promise<boolean> {
    if (!ctx.user) {
        return false;
    }
    const enrolled = (ctx.user.purchases || []).some(
        (purchase: Progress) => purchase.courseId === lesson.courseId,
    );
    if (enrolled) {
        return true;
    }
    const course = await CourseModel.findOne({
        courseId: lesson.courseId,
        domain: ctx.subdomain._id,
    }).select("creatorId");
    return course ? canManageCourseInContext(course, ctx) : false;
}

/**
 * The complements of a lesson as seen by the current user. Documents only get
 * a (signed, expiring) file URL when the user is enrolled or manages the
 * course; everyone else sees their metadata only.
 */
export async function getLessonComplements(
    lesson: Lesson,
    ctx: GQLContext,
): Promise<LessonComplement[]> {
    const complements: LessonComplement[] = lesson.complements || [];
    if (!complements.length) {
        return [];
    }

    const allowed = await canAccessComplementFiles(lesson, ctx);
    const result: LessonComplement[] = [];
    for (const complement of complements) {
        const plain: LessonComplement = {
            complementId: complement.complementId,
            type: complement.type,
            title: complement.title,
            content: complement.content,
            url: complement.url,
        };
        if (complement.type === DOCUMENT && complement.media) {
            const stored = (complement.media as any).toObject
                ? (complement.media as any).toObject()
                : complement.media;
            plain.media =
                allowed && complement.media.mediaId
                    ? await getMedia(complement.media.mediaId)
                    : { ...stored, file: undefined, thumbnail: undefined };
        }
        result.push(plain);
    }
    return result;
}
