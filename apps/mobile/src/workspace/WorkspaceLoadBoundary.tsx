import { Component, type ReactNode } from 'react'
import { captureMobileError } from '../analytics/mobileCrashChannel'

type Props = { children: ReactNode; fallback: ReactNode }

/** Keep vault recovery controls mounted when reading or rendering a workspace fails. */
export class WorkspaceLoadBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    captureMobileError(error, 'workspace')
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
