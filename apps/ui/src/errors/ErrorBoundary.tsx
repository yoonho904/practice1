import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log error with telemetry
    this.logError(error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Send to error tracking service (placeholder)
    console.warn('Error logged:', errorData);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: '' });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2>Something went wrong</h2>
            <p>An error occurred while rendering the application.</p>

            <details className="error-boundary__details">
              <summary>Error Details (ID: {this.state.errorId})</summary>
              <pre className="error-boundary__stack">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>

            <div className="error-boundary__actions">
              <button
                onClick={this.handleRetry}
                className="error-boundary__button error-boundary__button--primary"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="error-boundary__button error-boundary__button--secondary"
              >
                Reload Page
              </button>
            </div>

            <p className="error-boundary__help">
              If this problem persists, please report it with error ID: <code>{this.state.errorId}</code>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for visualization components
interface VisualizationErrorState {
  hasWebGLError: boolean;
  hasWorkerError: boolean;
  fallbackMode: 'canvas2d' | 'static' | 'disabled';
}

export class VisualizationErrorBoundary extends Component<Props, State & VisualizationErrorState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      hasWebGLError: false,
      hasWorkerError: false,
      fallbackMode: 'static'
    };
  }

  static getDerivedStateFromError(error: Error): State & VisualizationErrorState {
    const errorMessage = error.message.toLowerCase();

    return {
      hasError: true,
      error,
      errorId: `viz_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hasWebGLError: errorMessage.includes('webgl') || errorMessage.includes('context'),
      hasWorkerError: errorMessage.includes('worker') || errorMessage.includes('postmessage'),
      fallbackMode: errorMessage.includes('webgl') ? 'canvas2d' : 'static'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VisualizationErrorBoundary caught an error:', error, errorInfo);

    // Specific handling for different types of errors
    if (this.state.hasWebGLError) {
      console.warn('WebGL error detected, falling back to Canvas2D mode');
    }

    if (this.state.hasWorkerError) {
      console.warn('Web Worker error detected, falling back to main thread calculations');
    }

    this.props.onError?.(error, errorInfo);
  }

  private renderFallback() {
    if (this.state.hasWebGLError) {
      return (
        <div className="visualization-error">
          <div className="visualization-error__icon">⚠️</div>
          <h3>WebGL Not Supported</h3>
          <p>Your browser or device doesn't support WebGL, which is required for 3D visualization.</p>
          <div className="visualization-error__suggestions">
            <h4>Try these solutions:</h4>
            <ul>
              <li>Update your browser to the latest version</li>
              <li>Enable hardware acceleration in browser settings</li>
              <li>Try a different browser (Chrome, Firefox, Edge)</li>
              <li>Update your graphics drivers</li>
            </ul>
          </div>
          <button onClick={() => window.location.reload()} className="visualization-error__retry">
            Retry with Hardware Acceleration
          </button>
        </div>
      );
    }

    if (this.state.hasWorkerError) {
      return (
        <div className="visualization-error">
          <div className="visualization-error__icon">🔧</div>
          <h3>Background Processing Unavailable</h3>
          <p>Web Workers are not available. Calculations will run on the main thread.</p>
          <button onClick={this.handleRetry} className="visualization-error__retry">
            Continue with Reduced Performance
          </button>
        </div>
      );
    }

    return (
      <div className="visualization-error">
        <div className="visualization-error__icon">❌</div>
        <h3>Visualization Error</h3>
        <p>An error occurred in the visualization system.</p>
        <button onClick={this.handleRetry} className="visualization-error__retry">
          Try Again
        </button>
      </div>
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: '',
      hasWebGLError: false,
      hasWorkerError: false
    });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || this.renderFallback();
    }

    return this.props.children;
  }
}
