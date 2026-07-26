"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ClipScorer Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6">
          <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-4" />
            <h2 className="text-on-dark text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-soft text-sm mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-active text-on-primary text-sm font-medium rounded-md transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
