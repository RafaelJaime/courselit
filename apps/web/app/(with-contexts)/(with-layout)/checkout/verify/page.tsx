"use client";

import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PaymentVerificationStatus } from "./payment-verification-status";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { InvoicesStatus } from "@courselit/common-models";
import {
    GUEST_EXISTING_ACCOUNT_TEXT,
    GUEST_GO_TO_CONTENT,
    GUEST_LOGIN_LINK,
    GUEST_PURCHASE_DONE_TITLE,
    GUEST_SIGNED_IN_TEXT,
} from "@ui-config/strings";
import { GuestPhoneForm } from "./guest-phone-form";

type GuestOutcome = "signed-in" | "existing-account" | "already-claimed";

// A guest checkout is confirmed by the payment provider's webhook, which can
// land a little after the buyer is back on this page.
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 12;

export default function Page() {
    const params = useSearchParams();
    const id = params?.get("id");
    const [paymentStatus, setPaymentStatus] =
        useState<InvoicesStatus>("pending");
    const [loading, setLoading] = useState(false);
    const [guest, setGuest] = useState<GuestOutcome | null>(null);
    const [phoneDone, setPhoneDone] = useState(false);
    const [polls, setPolls] = useState(0);
    const address = useContext(AddressContext);

    const verifyPayment = async () => {
        setPaymentStatus("pending"); // Hide check status again
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/verify-new`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify({ id }))
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.status) {
                setPaymentStatus(response.status);
            }
            // The session is only created on the first confirmed return, so
            // keep "signed-in" once seen.
            if (response.guest) {
                setGuest((previous) =>
                    previous === "signed-in" ? previous : response.guest,
                );
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        verifyPayment();
    }, []);

    useEffect(() => {
        if (paymentStatus !== "pending" || polls >= MAX_POLLS || loading) {
            return;
        }
        const timer = setTimeout(() => {
            setPolls((count) => count + 1);
            verifyPayment();
        }, POLL_INTERVAL_MS);
        return () => clearTimeout(timer);
    }, [paymentStatus, polls, loading]);

    return (
        <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto pt-20">
            {paymentStatus === "paid" && guest ? (
                <>
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <h2 className="text-2xl font-bold">
                        {GUEST_PURCHASE_DONE_TITLE}
                    </h2>
                    {guest === "signed-in" ? (
                        <>
                            <p className="text-muted-foreground">
                                {GUEST_SIGNED_IN_TEXT}
                            </p>
                            {!phoneDone && (
                                <GuestPhoneForm
                                    onDone={() => setPhoneDone(true)}
                                />
                            )}
                            <Button asChild>
                                <a href="/dashboard/my-content">
                                    {GUEST_GO_TO_CONTENT}
                                </a>
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-muted-foreground">
                                {GUEST_EXISTING_ACCOUNT_TEXT}
                            </p>
                            <Button asChild>
                                <Link href="/login">{GUEST_LOGIN_LINK}</Link>
                            </Button>
                        </>
                    )}
                </>
            ) : paymentStatus === "paid" ? (
                <>
                    {/* <CheckCircle className="w-16 h-16 text-green-500" /> */}
                    <h2 className="text-2xl font-bold">
                        Thank you for your purchase!
                    </h2>
                    <p className="text-muted-foreground">
                        Your order number is:{" "}
                        <span className="font-medium">{id}</span>
                    </p>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <p className="text-lg font-medium text-green-600">
                        Payment verified successfully!
                    </p>
                    <p className="text-muted-foreground">
                        We have sent a confirmation email with order details and
                        tracking information.
                    </p>
                </>
            ) : (
                <>
                    <h2 className="text-2xl font-bold">
                        Thank you for your order!
                    </h2>
                    <p className="text-muted-foreground">
                        Your order number is:{" "}
                        <span className="font-medium">{id}</span>
                    </p>
                    <PaymentVerificationStatus
                        status={paymentStatus}
                        onRetryVerification={verifyPayment}
                        loading={loading}
                    />
                </>
            )}

            <div className="flex space-x-4 mt-6">
                {paymentStatus === "paid" && (
                    <Button asChild>
                        <Link href="/dashboard/my-content">
                            Go to Dashboard
                        </Link>
                    </Button>
                )}
                {/* <Button variant="outline" asChild>
          <Link href="/support">Need Help?</Link>
        </Button> */}
            </div>
        </div>
    );
}
