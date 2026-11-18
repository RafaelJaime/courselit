import { Media } from "./media";
import type { LessonComplement } from "./lesson-complement";
import { LessonType } from "./lesson-type";
import type { Quiz } from "./quiz";
import type { TextEditorContent } from "./text-editor-content";
import type { ScormContent } from "./scorm-content";

export default interface Lesson {
    lessonId: string;
    title: string;
    type: LessonType;
    content: Quiz | TextEditorContent | ScormContent | { value: string };
    requiresEnrollment: boolean;
    courseId: string;
    groupId: string;
    downloadable: boolean;
    published: boolean;
    media?: Partial<Media>;
    complements?: LessonComplement[];
    prevLesson?: string;
    nextLesson?: string;
}
