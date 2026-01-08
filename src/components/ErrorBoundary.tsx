// src/components/ErrorBoundary.tsx
import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, info: any) {
        // keep this console for debugging
        console.error("UI crashed:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback ?? (
                    <div className="min-h-screen bg-slate-50">
                        <div className="mx-auto max-w-4xl px-4 py-10">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h1 className="text-lg font-semibold text-slate-900">
                                    Something went wrong
                                </h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    The page crashed while rendering. Please refresh.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
