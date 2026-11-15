import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: (retry: () => void) => ReactNode
  /** Changing this value clears the error, for example after a demo reset. */
  resetKey?: unknown
}

interface State {
  error: Error | null
  resetKey?: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  render() {
    if (this.state.error) return this.props.fallback(() => this.setState({ error: null }))
    return this.props.children
  }
}
