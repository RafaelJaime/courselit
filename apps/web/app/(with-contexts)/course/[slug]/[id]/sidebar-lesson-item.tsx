"use client";

import { ReactNode, useId, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Link2, ListChecks } from "lucide-react";
import { Constants, LessonComplementType } from "@courselit/common-models";
import { SidebarMenuButton, SidebarMenuItem } from "@components/ui/sidebar";
import { LESSON_COMPLEMENTS_VIEWER_HEADER } from "@ui-config/strings";

const { TASK, LINK, DOCUMENT } = Constants.LessonComplementType;

const COMPLEMENT_ICONS = {
    [TASK]: ListChecks,
    [LINK]: Link2,
    [DOCUMENT]: FileText,
};

export interface SidebarComplementEntry {
    complementId: string;
    type: LessonComplementType;
    title: string;
    href: string;
}

export interface SidebarLessonEntry {
    title: string;
    href: string;
    /** Completion or lock state, shown at the end of the row. */
    icon?: ReactNode;
    /** The lesson type icon, shown at the start of the row. */
    leadingIcon?: ReactNode;
    isActive?: boolean;
    complements?: SidebarComplementEntry[];
}

export function SidebarLessonItem({ item }: { item: SidebarLessonEntry }) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={item.isActive}
                className="h-auto items-start py-2 text-foreground"
            >
                <Link
                    href={item.href}
                    className="flex w-full items-start gap-2"
                >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {item.leadingIcon}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words text-left text-sm leading-snug">
                        {item.title}
                    </span>
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {item.icon}
                    </span>
                </Link>
            </SidebarMenuButton>
            {item.complements && item.complements.length > 0 && (
                <SidebarLessonComplements
                    complements={item.complements}
                    isLessonActive={Boolean(item.isActive)}
                />
            )}
        </SidebarMenuItem>
    );
}

function SidebarLessonComplements({
    complements,
    isLessonActive,
}: {
    complements: SidebarComplementEntry[];
    isLessonActive: boolean;
}) {
    // Follows the viewed lesson until the learner toggles it by hand.
    const [toggled, setToggled] = useState<boolean | null>(null);
    const open = toggled ?? isLessonActive;
    const listId = useId();

    return (
        <div className="ml-6 mt-0.5">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => setToggled(!open)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
                <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                />
                {`${LESSON_COMPLEMENTS_VIEWER_HEADER} (${complements.length})`}
            </button>
            {open && (
                <ul id={listId} className="mt-0.5 flex flex-col gap-0.5">
                    {complements.map((complement) => {
                        const Icon =
                            COMPLEMENT_ICONS[complement.type] ?? FileText;
                        return (
                            <li key={complement.complementId}>
                                <Link
                                    href={complement.href}
                                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                                >
                                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="break-words leading-snug">
                                        {complement.title}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
