"use client";

import { useContext, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    GUEST_PHONE_DESCRIPTION,
    GUEST_PHONE_HEADING,
    GUEST_PHONE_INVALID,
    GUEST_PHONE_PLACEHOLDER,
    GUEST_PHONE_SAVE,
    GUEST_PHONE_SKIP,
} from "@ui-config/strings";

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;

interface GuestPhoneFormProps {
    onDone: () => void;
}

export function GuestPhoneForm({ onDone }: GuestPhoneFormProps) {
    const address = useContext(AddressContext);
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!PHONE_PATTERN.test(phone.trim())) {
            setError(GUEST_PHONE_INVALID);
            return;
        }
        setError("");
        setSaving(true);
        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/account/phone`)
                .setHeaders({ "Content-Type": "application/json" })
                .setPayload(JSON.stringify({ phone: phone.trim() }))
                .build();
            await fetch.exec();
            onDone();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full space-y-3 text-left">
            <h3 className="text-lg font-semibold">{GUEST_PHONE_HEADING}</h3>
            <p className="text-sm text-muted-foreground">
                {GUEST_PHONE_DESCRIPTION}
            </p>
            <Input
                type="tel"
                autoComplete="tel"
                placeholder={GUEST_PHONE_PLACEHOLDER}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            />
            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}
            <div className="flex gap-3">
                <Button type="button" onClick={save} disabled={saving}>
                    {GUEST_PHONE_SAVE}
                </Button>
                <Button type="button" variant="outline" onClick={onDone}>
                    {GUEST_PHONE_SKIP}
                </Button>
            </div>
        </div>
    );
}
