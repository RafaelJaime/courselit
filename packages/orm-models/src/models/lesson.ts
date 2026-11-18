import {
    LessonComplement,
    LessonType,
    Media,
    Quiz,
    TextEditorContent,
    Constants,
    ScormContent,
} from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { MediaSchema } from "./media";

export interface InternalLesson {
    id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    lessonId: string;
    title: string;
    type: LessonType;
    content?: Quiz | TextEditorContent | ScormContent | { value: string };
    media?: Media;
    complements?: LessonComplement[];
    downloadable: boolean;
    creatorId: string;
    courseId: string;
    requiresEnrollment: boolean;
    published: boolean;
    groupId: string;
}

export const LessonComplementSchema = new mongoose.Schema(
    {
        complementId: {
            type: String,
            required: true,
            default: generateUniqueId,
        },
        type: {
            type: String,
            required: true,
            enum: Object.values(Constants.LessonComplementType),
        },
        title: { type: String, required: true },
        content: { type: mongoose.Schema.Types.Mixed },
        url: String,
        media: MediaSchema,
    },
    { _id: false },
);

export const LessonSchema = new mongoose.Schema<InternalLesson>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    lessonId: { type: String, required: true, default: generateUniqueId },
    title: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: Object.values(Constants.LessonType),
    },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    media: MediaSchema,
    complements: { type: [LessonComplementSchema], default: undefined },
    downloadable: { type: Boolean, default: false },
    creatorId: { type: String, required: true },
    courseId: { type: String, required: true },
    requiresEnrollment: { type: Boolean, default: true },
    published: { type: Boolean, required: true, default: false },
    groupId: { type: String, required: true },
});
