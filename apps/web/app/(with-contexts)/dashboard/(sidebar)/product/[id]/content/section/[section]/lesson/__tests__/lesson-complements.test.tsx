import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AddressContext, ProfileContext } from "@components/contexts";
import { LessonComplementsEditor } from "../lesson-complements";

let mockPayloads: any[] = [];
let mockGenerated = 0;

jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => {
        const state: { payload?: any } = {};
        const builder: any = {
            setUrl: jest.fn().mockReturnThis(),
            setPayload: jest.fn((payload: any) => {
                state.payload = payload;
                return builder;
            }),
            setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnThis(),
            exec: jest.fn(async () => {
                mockPayloads.push(state.payload);
                const sent = state.payload.variables.lessonData.complements;
                return {
                    lesson: {
                        lessonId: state.payload.variables.lessonData.id,
                        complements: sent.map((item: any) => ({
                            ...item,
                            complementId:
                                item.complementId ||
                                `generated-${++mockGenerated}`,
                            content: item.content
                                ? JSON.parse(item.content)
                                : undefined,
                        })),
                    },
                };
            }),
        };
        return builder;
    }),
}));

jest.mock("@courselit/text-editor", () => {
    const React = jest.requireActual("react");
    return {
        emptyDoc: { type: "doc", content: [] },
        Editor: ({ onChange }: any) =>
            React.createElement(
                "button",
                {
                    type: "button",
                    onClick: () =>
                        onChange({
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Write a summary",
                                        },
                                    ],
                                },
                            ],
                        }),
                },
                "Type task text",
            ),
    };
});

jest.mock("@courselit/components-library", () => {
    const React = jest.requireActual("react");
    return {
        useToast: () => ({ toast: jest.fn() }),
        MediaSelector: ({ onSelection, mediaId, onRemove }: any) =>
            React.createElement(
                "div",
                null,
                mediaId
                    ? React.createElement(
                          "button",
                          { type: "button", onClick: onRemove },
                          "Remove file",
                      )
                    : React.createElement(
                          "button",
                          {
                              type: "button",
                              onClick: () =>
                                  onSelection({
                                      mediaId: "media-1",
                                      originalFileName: "guide.pdf",
                                      mimeType: "application/pdf",
                                      size: 10,
                                      access: "private",
                                      file: "https://temp/signed",
                                      thumbnail: "",
                                  }),
                          },
                          "Upload file",
                      ),
            ),
    };
});

const address = { backend: "https://backend.test", frontend: "" } as any;

const existing = [
    {
        complementId: "c-task",
        type: "task",
        title: "Homework",
        content: { type: "doc", content: [] },
    },
    {
        complementId: "c-link",
        type: "link",
        title: "Reading",
        url: "https://example.com/read",
    },
] as any;

const renderEditor = (complements: any[] = existing) =>
    render(
        <AddressContext.Provider value={address}>
            <ProfileContext.Provider value={{ profile: {} as any } as any}>
                <LessonComplementsEditor
                    lessonId="lesson-1"
                    complements={complements}
                />
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );

const lastSent = () =>
    mockPayloads[mockPayloads.length - 1].variables.lessonData.complements;

describe("LessonComplementsEditor", () => {
    beforeEach(() => {
        mockPayloads = [];
        mockGenerated = 0;
    });

    it("lists the existing complements with their type", () => {
        renderEditor();
        expect(screen.getByText("Homework")).toBeInTheDocument();
        expect(screen.getByText("Reading")).toBeInTheDocument();
        expect(screen.getByText("Task")).toBeInTheDocument();
        expect(screen.getByText("Link")).toBeInTheDocument();
    });

    it("adds a link keeping the existing complements and their ids", async () => {
        renderEditor();
        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Docs" },
        });
        fireEvent.change(screen.getByLabelText("URL"), {
            target: { value: "https://example.com/docs" },
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        const sent = lastSent();
        expect(sent.map((c: any) => c.complementId)).toEqual([
            "c-task",
            "c-link",
            undefined,
        ]);
        expect(sent[2]).toMatchObject({
            type: "link",
            title: "Docs",
            url: "https://example.com/docs",
        });
        expect(await screen.findByText("Docs")).toBeInTheDocument();
    });

    it("does not send a link without a valid http(s) url", async () => {
        renderEditor([]);
        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Bad" },
        });
        fireEvent.change(screen.getByLabelText("URL"), {
            target: { value: "javascript:alert(1)" },
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );

        expect(
            await screen.findByText("Enter a valid http(s) URL."),
        ).toBeInTheDocument();
        expect(mockPayloads).toHaveLength(0);
    });

    it("requires a title", async () => {
        renderEditor([]);
        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );
        expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
        expect(mockPayloads).toHaveLength(0);
    });

    it("adds a task with its rich text as a JSON string", async () => {
        renderEditor([]);
        fireEvent.click(screen.getByRole("button", { name: "Add task" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Summary" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Type task text" }));
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        const task = lastSent()[0];
        expect(task.type).toBe("task");
        expect(JSON.parse(task.content).content[0].content[0].text).toBe(
            "Write a summary",
        );
    });

    it("adds a document with the uploaded media but never its temporary file url", async () => {
        renderEditor([]);
        fireEvent.click(screen.getByRole("button", { name: "Add document" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Guide" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Upload file" }));
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        const doc = lastSent()[0];
        expect(doc.type).toBe("document");
        expect(doc.media.mediaId).toBe("media-1");
        expect(doc.media.file).toBeUndefined();
    });

    it("requires a file for documents", async () => {
        renderEditor([]);
        fireEvent.click(screen.getByRole("button", { name: "Add document" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Guide" },
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );
        expect(await screen.findByText("Upload a file.")).toBeInTheDocument();
        expect(mockPayloads).toHaveLength(0);
    });

    it("edits a complement keeping its id", async () => {
        renderEditor();
        fireEvent.click(screen.getByRole("button", { name: "Edit Reading" }));
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Reading list" },
        });
        fireEvent.click(
            screen.getByRole("button", { name: "Save complement" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        expect(lastSent()[1]).toMatchObject({
            complementId: "c-link",
            title: "Reading list",
            url: "https://example.com/read",
        });
    });

    it("deletes a complement", async () => {
        renderEditor();
        fireEvent.click(
            screen.getByRole("button", { name: "Delete Homework" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        expect(lastSent().map((c: any) => c.complementId)).toEqual(["c-link"]);
        await waitFor(() =>
            expect(screen.queryByText("Homework")).not.toBeInTheDocument(),
        );
    });

    it("reorders complements", async () => {
        renderEditor();
        fireEvent.click(
            screen.getByRole("button", { name: "Move Homework down" }),
        );

        await waitFor(() => expect(mockPayloads).toHaveLength(1));
        expect(lastSent().map((c: any) => c.complementId)).toEqual([
            "c-link",
            "c-task",
        ]);
    });

    it("cannot move the first complement up or the last one down", () => {
        renderEditor();
        expect(
            screen.getByRole("button", { name: "Move Homework up" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Move Reading down" }),
        ).toBeDisabled();
    });
});
