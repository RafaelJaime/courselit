"use client";

import { useContext, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    FileText,
    Link as LinkIcon,
    ListChecks,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import {
    Constants,
    LessonComplement,
    LessonComplementType,
    Media,
    Profile,
    TextEditorContent,
} from "@courselit/common-models";
import { MediaSelector, useToast } from "@courselit/components-library";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";
import { FetchBuilder } from "@courselit/utils";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { AddressContext, ProfileContext } from "@components/contexts";
import { isTextEditorNonEmpty } from "@ui-lib/utils";
import {
    LESSON_COMPLEMENTS_HEADER,
    LESSON_COMPLEMENTS_DESCRIPTION,
    LESSON_COMPLEMENTS_EMPTY,
    LESSON_COMPLEMENT_TYPE_TASK,
    LESSON_COMPLEMENT_TYPE_LINK,
    LESSON_COMPLEMENT_TYPE_DOCUMENT,
    LESSON_COMPLEMENT_ADD_TASK,
    LESSON_COMPLEMENT_ADD_LINK,
    LESSON_COMPLEMENT_ADD_DOCUMENT,
    LESSON_COMPLEMENT_TITLE_LABEL,
    LESSON_COMPLEMENT_URL_LABEL,
    LESSON_COMPLEMENT_TASK_LABEL,
    LESSON_COMPLEMENT_DOCUMENT_LABEL,
    LESSON_COMPLEMENT_SAVE,
    LESSON_COMPLEMENT_CANCEL,
    LESSON_COMPLEMENT_ERROR_TITLE,
    LESSON_COMPLEMENT_ERROR_URL,
    LESSON_COMPLEMENT_ERROR_FILE,
    LESSON_COMPLEMENT_ERROR_TASK,
    LESSON_COMPLEMENT_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";

const { TASK, LINK, DOCUMENT } = Constants.LessonComplementType;

const TYPE_LABELS: Record<LessonComplementType, string> = {
    [TASK]: LESSON_COMPLEMENT_TYPE_TASK,
    [LINK]: LESSON_COMPLEMENT_TYPE_LINK,
    [DOCUMENT]: LESSON_COMPLEMENT_TYPE_DOCUMENT,
};

const TYPE_ICONS = {
    [TASK]: ListChecks,
    [LINK]: LinkIcon,
    [DOCUMENT]: FileText,
};

interface LessonComplementsEditorProps {
    lessonId: string;
    complements?: LessonComplement[];
}

interface Draft {
    complementId?: string;
    type: LessonComplementType;
    title: string;
    content: TextEditorContent;
    url: string;
    media?: Partial<Media>;
}

type DraftErrors = Partial<
    Record<"title" | "url" | "file" | "content", string>
>;

const UPDATE_COMPLEMENTS_MUTATION = `
    mutation ($lessonData: LessonUpdateInput!) {
        lesson: updateLesson(lessonData: $lessonData) {
            lessonId
            complements {
                complementId
                type
                title
                content
                url
                media {
                    mediaId
                    originalFileName
                    mimeType
                    size
                    access
                    thumbnail
                    caption
                }
            }
        }
    }
`;

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// Private file URLs are signed and temporary, so only the reference is sent.
function toInput(complement: LessonComplement | Draft) {
    const { complementId, type, title } = complement;
    const base = { complementId, type, title };
    if (type === TASK) {
        return { ...base, content: JSON.stringify(complement.content) };
    }
    if (type === LINK) {
        return { ...base, url: (complement as any).url?.trim() };
    }
    const media = complement.media || {};
    return {
        ...base,
        media: {
            mediaId: media.mediaId,
            originalFileName: media.originalFileName,
            mimeType: media.mimeType,
            size: media.size,
            access: media.access,
            thumbnail: media.thumbnail,
            caption: media.caption,
        },
    };
}

export function LessonComplementsEditor({
    lessonId,
    complements: initialComplements = [],
}: LessonComplementsEditorProps) {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const [complements, setComplements] =
        useState<LessonComplement[]>(initialComplements);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [errors, setErrors] = useState<DraftErrors>({});
    const [saving, setSaving] = useState(false);

    const persist = async (next: (LessonComplement | Draft)[]) => {
        setSaving(true);
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query: UPDATE_COMPLEMENTS_MUTATION,
                    variables: {
                        lessonData: {
                            id: lessonId,
                            complements: next.map(toInput),
                        },
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            setComplements(response.lesson?.complements ?? []);
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: LESSON_COMPLEMENT_SAVED,
            });
            return true;
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const startDraft = (type: LessonComplementType) => {
        setErrors({});
        setDraft({
            type,
            title: "",
            content: TextEditorEmptyDoc as unknown as TextEditorContent,
            url: "",
        });
    };

    const startEdit = (complement: LessonComplement) => {
        setErrors({});
        setDraft({
            complementId: complement.complementId,
            type: complement.type,
            title: complement.title,
            content:
                complement.content ??
                (TextEditorEmptyDoc as unknown as TextEditorContent),
            url: complement.url ?? "",
            media: complement.media,
        });
    };

    const validate = (current: Draft): DraftErrors => {
        const found: DraftErrors = {};
        if (!current.title.trim()) {
            found.title = LESSON_COMPLEMENT_ERROR_TITLE;
        }
        if (current.type === LINK && !isHttpUrl(current.url)) {
            found.url = LESSON_COMPLEMENT_ERROR_URL;
        }
        if (current.type === DOCUMENT && !current.media?.mediaId) {
            found.file = LESSON_COMPLEMENT_ERROR_FILE;
        }
        if (current.type === TASK && !isTextEditorNonEmpty(current.content)) {
            found.content = LESSON_COMPLEMENT_ERROR_TASK;
        }
        return found;
    };

    const saveDraft = async () => {
        if (!draft) return;
        const found = validate(draft);
        setErrors(found);
        if (Object.keys(found).length) return;

        const next: (LessonComplement | Draft)[] = draft.complementId
            ? complements.map((item) =>
                  item.complementId === draft.complementId ? draft : item,
              )
            : [...complements, draft];
        if (await persist(next)) {
            setDraft(null);
        }
    };

    const remove = (complementId: string) =>
        persist(complements.filter((c) => c.complementId !== complementId));

    const move = (index: number, offset: -1 | 1) => {
        const next = [...complements];
        const [item] = next.splice(index, 1);
        next.splice(index + offset, 0, item);
        return persist(next);
    };

    return (
        <section className="space-y-4" aria-labelledby="complements-heading">
            <div>
                <h2 id="complements-heading" className="text-lg font-semibold">
                    {LESSON_COMPLEMENTS_HEADER}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {LESSON_COMPLEMENTS_DESCRIPTION}
                </p>
            </div>

            {complements.length === 0 && !draft && (
                <p className="text-sm text-muted-foreground">
                    {LESSON_COMPLEMENTS_EMPTY}
                </p>
            )}

            <ul className="space-y-2">
                {complements.map((complement, index) => {
                    const Icon = TYPE_ICONS[complement.type] ?? FileText;
                    return (
                        <li
                            key={complement.complementId}
                            className="flex items-center gap-3 rounded-md border p-3"
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {complement.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {TYPE_LABELS[complement.type]}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move ${complement.title} up`}
                                disabled={saving || index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Move ${complement.title} down`}
                                disabled={
                                    saving || index === complements.length - 1
                                }
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${complement.title}`}
                                disabled={saving}
                                onClick={() => startEdit(complement)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${complement.title}`}
                                disabled={saving}
                                onClick={() => remove(complement.complementId)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    );
                })}
            </ul>

            {draft ? (
                <div className="space-y-4 rounded-md border p-4">
                    <div className="space-y-2">
                        <Label htmlFor="complement-title">
                            {LESSON_COMPLEMENT_TITLE_LABEL}
                        </Label>
                        <Input
                            id="complement-title"
                            value={draft.title}
                            onChange={(e) =>
                                setDraft({ ...draft, title: e.target.value })
                            }
                            aria-invalid={!!errors.title}
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    {draft.type === TASK && (
                        <div className="space-y-2">
                            <Label>{LESSON_COMPLEMENT_TASK_LABEL}</Label>
                            <Editor
                                initialContent={draft.content}
                                onChange={(state: any) =>
                                    setDraft((current) =>
                                        current
                                            ? { ...current, content: state }
                                            : current,
                                    )
                                }
                                url={address.backend}
                            />
                            {errors.content && (
                                <p className="text-sm text-red-500">
                                    {errors.content}
                                </p>
                            )}
                        </div>
                    )}

                    {draft.type === LINK && (
                        <div className="space-y-2">
                            <Label htmlFor="complement-url">
                                {LESSON_COMPLEMENT_URL_LABEL}
                            </Label>
                            <Input
                                id="complement-url"
                                type="url"
                                inputMode="url"
                                placeholder="https://"
                                value={draft.url}
                                onChange={(e) =>
                                    setDraft({ ...draft, url: e.target.value })
                                }
                                aria-invalid={!!errors.url}
                            />
                            {errors.url && (
                                <p className="text-sm text-red-500">
                                    {errors.url}
                                </p>
                            )}
                        </div>
                    )}

                    {draft.type === DOCUMENT && (
                        <div className="space-y-2">
                            <Label>{LESSON_COMPLEMENT_DOCUMENT_LABEL}</Label>
                            <MediaSelector
                                title=""
                                src={draft.media?.thumbnail || ""}
                                srcTitle={draft.media?.originalFileName || ""}
                                mediaId={draft.media?.mediaId}
                                onSelection={(media?: Media) =>
                                    media &&
                                    setDraft((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  media,
                                                  title:
                                                      current.title ||
                                                      media.originalFileName,
                                              }
                                            : current,
                                    )
                                }
                                onRemove={() =>
                                    setDraft((current) =>
                                        current
                                            ? { ...current, media: undefined }
                                            : current,
                                    )
                                }
                                deleteOnRemove={false}
                                access="private"
                                hidePreview
                                strings={{}}
                                profile={profile as Profile}
                                address={address}
                                type="lesson"
                            />
                            {draft.media?.originalFileName && (
                                <p className="text-sm text-muted-foreground break-all">
                                    {draft.media.originalFileName}
                                </p>
                            )}
                            {errors.file && (
                                <p className="text-sm text-red-500">
                                    {errors.file}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            disabled={saving}
                            onClick={saveDraft}
                        >
                            {LESSON_COMPLEMENT_SAVE}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={() => setDraft(null)}
                        >
                            {LESSON_COMPLEMENT_CANCEL}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => startDraft(TASK)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {LESSON_COMPLEMENT_ADD_TASK}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => startDraft(LINK)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {LESSON_COMPLEMENT_ADD_LINK}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => startDraft(DOCUMENT)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {LESSON_COMPLEMENT_ADD_DOCUMENT}
                    </Button>
                </div>
            )}
        </section>
    );
}
