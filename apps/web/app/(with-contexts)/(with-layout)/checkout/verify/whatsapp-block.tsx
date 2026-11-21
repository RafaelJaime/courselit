import { Button } from "@/components/ui/button";
import {
    VERIFY_WHATSAPP_CONSENT_LINK,
    VERIFY_WHATSAPP_JOIN,
    VERIFY_WHATSAPP_TEXT,
} from "@ui-config/strings";

const WHATSAPP_NUMBER = "34611124522";
const WHATSAPP_MESSAGE =
    "Hola, acabo de unirme a la membresía fit-leads y quiero recibir los avisos por WhatsApp";
// Served by another service on the same domain, hence a plain anchor.
const WHATSAPP_CONSENT_PATH = "/cuenta/whatsapp?src=post-checkout";

export function WhatsAppBlock() {
    return (
        <div className="flex flex-col items-center space-y-3">
            <p className="text-muted-foreground">{VERIFY_WHATSAPP_TEXT}</p>
            <Button asChild>
                <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                    target="_blank"
                    rel="noopener"
                >
                    {VERIFY_WHATSAPP_JOIN}
                </a>
            </Button>
            <a
                href={WHATSAPP_CONSENT_PATH}
                className="text-sm underline text-muted-foreground"
            >
                {VERIFY_WHATSAPP_CONSENT_LINK}
            </a>
        </div>
    );
}
