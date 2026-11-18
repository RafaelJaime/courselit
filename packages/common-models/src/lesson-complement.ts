import { LessonComplementType } from "./constants";
import type { Media } from "./media";
import type { TextEditorContent } from "./text-editor-content";

export type LessonComplementType =
    (typeof LessonComplementType)[keyof typeof LessonComplementType];

/**
 * Extra material attached to a lesson: a task (rich text), a link or a
 * private document.
 */
export interface LessonComplement {
    complementId: string;
    type: LessonComplementType;
    title: string;
    content?: TextEditorContent;
    url?: string;
    media?: Partial<Media>;
}
