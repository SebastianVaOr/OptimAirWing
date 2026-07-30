import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error de Ejecución</h2>
            <p className="text-slate-300 text-sm mb-4">
              Se ha producido un error durante el renderizado.
            </p>
            <div className="bg-slate-950 p-3 rounded text-xs font-mono text-red-300 overflow-x-auto">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return (this as unknown as Component<Props, State>).props.children;
  }
}
