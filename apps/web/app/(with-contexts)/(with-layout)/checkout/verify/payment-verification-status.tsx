import { XCircle, Loader2, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    VERIFY_CHECK_AGAIN,
    VERIFY_FAILED,
    VERIFY_MAY_TAKE_A_MOMENT,
    VERIFY_NOT_RECEIVED,
    VERIFY_VERIFYING,
} from "@ui-config/strings";
import { InvoicesStatus } from "@courselit/common-models";

interface PaymentVerificationStatusProps {
    status: InvoicesStatus;
    onRetryVerification: () => Promise<void>;
    loading: boolean;
}

export function PaymentVerificationStatus({
    status,
    onRetryVerification,
    loading,
}: PaymentVerificationStatusProps) {
    return (
        <div className="flex flex-col items-center space-y-4">
            {status !== "paid" && (
                <>
                    {status === "pending" && (
                        <>
                            <Button
                                onClick={onRetryVerification}
                                disabled={loading}
                            >
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    {VERIFY_CHECK_AGAIN}
                                </>
                            </Button>
                            {!loading && (
                                <>
                                    <Clock className="w-8 h-8 text-black-500" />
                                    <p className="text-lg font-medium">
                                        {VERIFY_NOT_RECEIVED}
                                    </p>
                                </>
                            )}
                            {loading && (
                                <>
                                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                                    <h2 className="text-2xl font-bold">
                                        {VERIFY_VERIFYING}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {VERIFY_MAY_TAKE_A_MOMENT}
                                    </p>
                                </>
                            )}
                        </>
                    )}
                    {status === "failed" && (
                        <>
                            <XCircle className="w-8 h-8 text-red-500" />
                            <p className="text-lg font-medium">
                                {VERIFY_FAILED}
                            </p>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
