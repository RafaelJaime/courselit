import LayoutWithContext from "./layout-with-context";
import React from "react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getFullSiteSetup } from "@ui-lib/utils";
import { getAddressFromHeaders } from "@/app/actions";
import { defaultState } from "@components/default-state";
import { ServerConfig } from "@courselit/common-models";
import constants from "@config/constants";
import { formatSiteInfo } from "./format-site-info";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const address = await getAddressFromHeaders(headers);
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const siteSetup = await getFullSiteSetup(address);
    const config: ServerConfig = {
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
        queueServer: process.env.QUEUE_SERVER || "",
        cacheEnabled: constants.cacheEnabled,
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    };

    return (
        <LayoutWithContext
            address={address}
            siteinfo={formatSiteInfo(siteSetup?.settings)}
            theme={siteSetup?.theme || defaultState.theme}
            config={config}
            session={session}
            features={siteSetup?.features || defaultState.features}
        >
            {children}
        </LayoutWithContext>
    );
}
