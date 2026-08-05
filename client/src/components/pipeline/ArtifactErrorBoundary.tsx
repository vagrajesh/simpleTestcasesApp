import { Component, type ReactNode } from 'react';

interface Props {
  raw: unknown;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors from an individual artifact view (e.g. a pass's data
 * shape not matching what the view expects) so one broken pass can't blank
 * the whole page. Falls back to the raw JSON, which is always renderable.
 *
 * Error boundaries must be class components — React has no hook equivalent.
 * The parent (ArtifactPanel, via PipelineView's `key={pipelineId-passId}`)
 * fully remounts on every pass switch, so this never needs to reset itself
 * mid-life — a fresh mount always starts with error: null.
 */
export default class ArtifactErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="space-y-3">
          <div className="bg-red-950/60 border border-red-800 rounded-lg p-3 text-xs text-red-300">
            Couldn't render this pass's output ({this.state.error.message}). Showing the raw data instead.
          </div>
          <pre className="text-[11px] text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(this.props.raw, null, 2)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
