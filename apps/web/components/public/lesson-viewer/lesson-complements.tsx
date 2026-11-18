import React from "react";
import {
    ExternalLink,
    FileDown,
    FileText,
    Link2,
    ListChecks,
} from "lucide-react";
import {
    Constants,
    LessonComplement,
    LessonComplementType,
    TextEditorContent,
} from "@courselit/common-models";
import { TextRenderer } from "@courselit/page-blocks";
import WidgetErrorBoundary from "../base-layout/template/widget-error-boundary";
import {
    LESSON_COMPLEMENTS_VIEWER_HEADER,
    LESSON_COMPLEMENT_VIEWER_TYPE_TASK,
    LESSON_COMPLEMENT_VIEWER_TYPE_LINK,
    LESSON_COMPLEMENT_VIEWER_TYPE_DOCUMENT,
    LESSON_COMPLEMENT_VIEWER_DOWNLOAD,
    LESSON_COMPLEMENT_VIEWER_OPEN_LINK,
    LESSON_COMPLEMENT_VIEWER_UNAVAILABLE,
} from "@/ui-config/strings";

const { TASK, LINK, DOCUMENT } = Constants.LessonComplementType;

const TYPE_LABELS: Record<LessonComplementType, string> = {
    [TASK]: LESSON_COMPLEMENT_VIEWER_TYPE_TASK,
    [LINK]: LESSON_COMPLEMENT_VIEWER_TYPE_LINK,
    [DOCUMENT]: LESSON_COMPLEMENT_VIEWER_TYPE_DOCUMENT,
};

const TYPE_ICONS = {
    [TASK]: ListChecks,
    [LINK]: Link2,
    [DOCUMENT]: FileText,
};

export const getComplementAnchorId = (complementId: string) =>
    `complement-${complementId}`;

function isHttpUrl(value?: string): value is string {
    if (!value) return false;
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
}

// Headings in a task are section labels inside a card, not page titles, so
// they drop the theme's display style (huge uppercase) for the body font.
// Class names are written out in full so Tailwind can see them.
const TASK_HEADINGS_CLASS_NAME = [
    "[&_h1]:!font-sans [&_h1]:!normal-case [&_h1]:!font-semibold [&_h1]:!leading-snug [&_h1]:!tracking-normal [&_h1]:!text-xl",
    "[&_h2]:!font-sans [&_h2]:!normal-case [&_h2]:!font-semibold [&_h2]:!leading-snug [&_h2]:!tracking-normal [&_h2]:!text-lg",
    "[&_h3]:!font-sans [&_h3]:!normal-case [&_h3]:!font-semibold [&_h3]:!leading-snug [&_h3]:!tracking-normal [&_h3]:!text-base",
    "[&_h4]:!font-sans [&_h4]:!normal-case [&_h4]:!font-semibold [&_h4]:!leading-snug [&_h4]:!tracking-normal [&_h4]:!text-base",
    "[&_h5]:!font-sans [&_h5]:!normal-case [&_h5]:!font-semibold [&_h5]:!leading-snug [&_h5]:!tracking-normal [&_h5]:!text-base",
    "[&_h6]:!font-sans [&_h6]:!normal-case [&_h6]:!font-semibold [&_h6]:!leading-snug [&_h6]:!tracking-normal [&_h6]:!text-base",
].join(" ");

const actionClassName =
    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors";

export function LessonComplementCards({
    complements,
    theme,
}: {
    complements?: LessonComplement[];
    theme: any;
}) {
    if (!complements?.length) {
        return null;
    }

    return (
        <section className="mt-10 flex flex-col gap-4">
            <h2 className="text-xl font-semibold">
                {LESSON_COMPLEMENTS_VIEWER_HEADER}
            </h2>
            {complements.map((complement) => {
                const Icon = TYPE_ICONS[complement.type] ?? FileText;
                return (
                    <article
                        key={complement.complementId}
                        id={getComplementAnchorId(complement.complementId)}
                        className="scroll-mt-20 min-w-0 [overflow-wrap:anywhere] rounded-lg border p-4 flex flex-col gap-3"
                    >
                        <header className="flex items-center gap-2">
                            <Icon
                                className="h-4 w-4 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {TYPE_LABELS[complement.type]}
                            </span>
                        </header>
                        <h3 className="text-base font-semibold">
                            {complement.title}
                        </h3>
                        {complement.type === TASK && complement.content && (
                            <div
                                data-testid="task-content"
                                className={TASK_HEADINGS_CLASS_NAME}
                            >
                                <WidgetErrorBoundary widgetName="text-editor">
                                    <TextRenderer
                                        json={
                                            complement.content as TextEditorContent
                                        }
                                        theme={theme}
                                    />
                                </WidgetErrorBoundary>
                            </div>
                        )}
                        {complement.type === LINK &&
                            isHttpUrl(complement.url) && (
                                <a
                                    href={complement.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${actionClassName} w-fit`}
                                >
                                    <ExternalLink
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                    {LESSON_COMPLEMENT_VIEWER_OPEN_LINK}
                                </a>
                            )}
                        {complement.type === DOCUMENT &&
                            (complement.media?.file ? (
                                <a
                                    href={complement.media.file}
                                    download={
                                        complement.media.originalFileName ||
                                        true
                                    }
                                    className={`${actionClassName} w-fit`}
                                >
                                    <FileDown className="h-4 w-4" aria-hidden />
                                    {LESSON_COMPLEMENT_VIEWER_DOWNLOAD}
                                    {complement.media.originalFileName && (
                                        <span className="font-normal text-muted-foreground">
                                            {complement.media.originalFileName}
                                        </span>
                                    )}
                                </a>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {LESSON_COMPLEMENT_VIEWER_UNAVAILABLE}
                                </p>
                            ))}
                    </article>
                );
            })}
        </section>
    );
}
