import React from "react";

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-sm border-2 border-ink bg-destructive px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-destructive-foreground">
          Error
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Something broke</h1>
        <p className="max-w-md font-mono text-xs text-muted-foreground">
          {this.state.error.message}
        </p>
        <button
          className="press rounded-sm border-2 border-ink bg-acid px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide text-acid-foreground"
          onClick={this.reset}
        >
          Try again
        </button>
      </div>
    );
  }
}
