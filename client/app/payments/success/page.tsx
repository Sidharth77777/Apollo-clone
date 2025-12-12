"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FiCheckCircle, FiDownload, FiChevronLeft } from "react-icons/fi";
import { SessionResponse } from "@/lib/types";

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams?.get("session_id") ?? "";

    const [loading, setLoading] = useState<boolean>(false);
    const [session, setSession] = useState<SessionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setError("Missing session id in URL.");
            return;
        }

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // <- CORRECT: session id is a path param
                const res = await api.get(`/payments/session/${encodeURIComponent(sessionId)}`);
                const data = res?.data?.data ?? res?.data;
                if (mounted) setSession(data ?? null);
            } catch (err: any) {
                console.error("Failed to fetch session:", err);
                const msg = err?.response?.data?.message ?? err?.message ?? "Failed to fetch session details.";
                if (mounted) setError(String(msg));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, [sessionId]);

    const renderMaybeId = (v: any) => {
        if (v == null) return "—";
        if (typeof v === "string" || typeof v === "number") return String(v);
        if (typeof v === "object") {
            if (v.id) return String(v.id);
            try {
                const s = JSON.stringify(v);
                return s.length > 200 ? s.slice(0, 200) + "…" : s;
            } catch {
                return "object";
            }
        }
        return String(v);
    };


    const formatCurrency = (cents?: number, currency?: string) => {
        if (!cents && cents !== 0) return "—";
        try {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: (currency ?? "USD").toUpperCase(),
            }).format((cents as number) / 100);
        } catch {
            return `${((cents as number) / 100).toFixed(2)} ${currency ?? "USD"}`;
        }
    };

    const getCreditsFromMetadata = (meta?: Record<string, any>) => {
        if (!meta) return null;
        const c = meta.credits ?? meta.credit ?? meta.credits_purchased;
        if (c == null) return null;
        const n = Number(c);
        return Number.isFinite(n) ? n : null;
    };

    const handleDownloadReceipt = () => {
        if (!session) {
            toast.error("No session to download");
            return;
        }
        const receipt = {
            sessionId: session.id,
            payment_status: session.payment_status,
            amount_total: session.amount_total,
            currency: session.currency,
            credits: getCreditsFromMetadata(session.metadata),
            metadata: session.metadata,
            customer: session.customer_details ?? null,
            createdAt: session.created ?? session.created_at ?? new Date().toISOString(),
            raw: session,
        };
        const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt_${session.id ?? "payment"}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Downloaded receipt");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-2xl w-full">
                <div className="mb-6 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex text-black items-center gap-2 rounded-md px-3 py-2 border bg-white"
                        aria-label="Back"
                    >
                        <FiChevronLeft /> Back
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-8">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center justify-center">
                            <div className="animate-pulse text-indigo-600 mb-4">
                                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /></svg>
                            </div>
                            <div className="text-sm text-black">Verifying payment details...</div>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center">
                            <div className="text-rose-600 font-semibold mb-2">Payment verification failed</div>
                            <div className="text-sm text-slate-600 mb-4">{error}</div>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => router.push("/payments")} className="border bg-white">Retry</Button>
                                <Button onClick={() => router.push("/")} className="bg-black text-white">Go home</Button>
                            </div>
                        </div>
                    ) : session ? (
                        <div>
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-emerald-50 text-emerald-600 p-3">
                                    <FiCheckCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg text-black font-semibold">Payment successful</h2>
                                    <p className="text-sm text-slate-600">Thank you — your payment was processed.</p>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                                    <div className="text-xs text-slate-500">Amount</div>
                                    <div className="text-lg text-black font-medium">{formatCurrency(session.amount_total, session.currency)}</div>

                                    <div className="mt-3 text-xs text-slate-500">Credits purchased</div>
                                    <div className="text-md font-medium text-black">
                                        {getCreditsFromMetadata(session.metadata) ?? (session.line_items?.data?.[0]?.description ?? "—")}
                                    </div>
                                </div>

                                <div className="p-4 rounded border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                                    <div className="text-xs text-slate-500">Payment status</div>
                                    <div className="mt-1 inline-flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${session.payment_status === "paid" || session.payment_status === "succeeded" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-50 text-yellow-800"}`}>
                                            {session.payment_status ?? "unknown"}
                                        </span>
                                    </div>

                                    <div className="mt-3 text-xs text-slate-500">Payer</div>
                                    <div className="text-sm">
                                        {session.customer_details?.email ? (
                                            <div className="font-medium text-black">{session.customer_details.email}</div>
                                        ) : (
                                            <div className="text-slate-600">Email not available</div>
                                        )}
                                        <div className="text-xs text-slate-500">{session.metadata?.userId ? `User: ${session.metadata.userId}` : ""}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="text-xs text-slate-500">Session ID</div>
                                <div className="text-sm break-all text-slate-700">{session.id}</div>
                            </div>

                            {session.payment_intent && (
                                <div className="mt-4 text-xs text-slate-500">
                                    Payment Intent: <span className="text-sm">{renderMaybeId(session.payment_intent)}</span>
                                </div>
                            )}


                            <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                <Button onClick={handleDownloadReceipt} className="flex items-center gap-2 border bg-white hover:text-white cursor-pointer text-black">
                                    <FiDownload /> Download receipt
                                </Button>

                                <Button onClick={() => router.push("/")} className="bg-black text-white">
                                    Go to dashboard
                                </Button>

                                {/* show transactions only to admins (quick local check)
                                {typeof window !== "undefined" && localStorage.getItem("user_isAdmin") === "true" && (
                                    <Button onClick={() => router.push("/admin")} className="border bg-white">
                                        View transactions
                                    </Button>
                                )} */}
                            </div>

                            <div className="mt-4 text-xs text-slate-500">
                                If the credits are not reflected in your account immediately, they will be updated shortly. You can also check your transactions in the admin panel (admins) or contact support.
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-500">No session information available.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
