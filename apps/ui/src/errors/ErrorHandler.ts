export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  WEBGL = 'webgl',
  WORKER = 'worker',
  CALCULATION = 'calculation',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERFORMANCE = 'performance',
  USER_INPUT = 'user_input',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  timestamp: number;
  userAgent: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  attempts: number;
  resolved: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors = new Map<string, ErrorReport>();
  private listeners = new Set<(error: ErrorReport) => void>();
  private sessionId: string;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.setupGlobalErrorHandling();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandling(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        {
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.HIGH,
          recoverable: false,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          sessionId: this.sessionId,
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      );
    });

    // Catch unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason),
        {
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          recoverable: true,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          sessionId: this.sessionId,
          metadata: {
            type: 'unhandled_promise_rejection'
          }
        }
      );
    });
  }

  handleError(error: Error, context: ErrorContext): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: ErrorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      context,
      attempts: 0,
      resolved: false
    };

    this.errors.set(errorId, report);

    // Log error based on severity
    this.logError(report);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Attempt automatic recovery for recoverable errors
    if (context.recoverable) {
      this.attemptRecovery(errorId);
    }

    return errorId;
  }

  private logError(report: ErrorReport): void {
    const logLevel = this.getLogLevel(report.context.severity);
    const logMessage = `[${report.context.category.toUpperCase()}] ${report.message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, report);
        break;
      case 'warn':
        console.warn(logMessage, report);
        break;
      case 'info':
        console.info(logMessage, report);
        break;
      default:
        console.log(logMessage, report);
    }

    // Send to remote logging service (placeholder)
    this.sendToRemoteLogging(report);
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  private async sendToRemoteLogging(report: ErrorReport): Promise<void> {
    // Placeholder for remote error reporting
    // In production, this would send to services like Sentry, LogRocket, etc.
    try {
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
    } catch (error) {
      console.warn('Failed to send error report to remote service:', error);
    }
  }

  private async attemptRecovery(errorId: string): Promise<boolean> {
    const report = this.errors.get(errorId);
    if (!report || report.attempts >= 3) {
      return false;
    }

    report.attempts++;

    try {
      const recovered = await this.executeRecoveryStrategy(report);
      if (recovered) {
        report.resolved = true;
        console.info(`Successfully recovered from error ${errorId}`);
      }
      return recovered;
    } catch (recoveryError) {
      console.error(`Recovery attempt ${report.attempts} failed for error ${errorId}:`, recoveryError);
      return false;
    }
  }

  private async executeRecoveryStrategy(report: ErrorReport): Promise<boolean> {
    switch (report.context.category) {
      case ErrorCategory.WEBGL:
        return this.recoverFromWebGLError(report);

      case ErrorCategory.WORKER:
        return this.recoverFromWorkerError(report);

      case ErrorCategory.CALCULATION:
        return this.recoverFromCalculationError(report);

      case ErrorCategory.NETWORK:
        return this.recoverFromNetworkError(report);

      default:
        return this.genericRecovery(report);
    }
  }

  private async recoverFromWebGLError(report: ErrorReport): Promise<boolean> {
    // Try to reinitialize WebGL context or fallback to Canvas2D
    console.warn('Attempting WebGL recovery...');

    // Check if WebGL is available
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      console.warn('WebGL not available, switching to fallback renderer');
      // Signal to switch to Canvas2D or static mode
      window.dispatchEvent(new CustomEvent('webgl-fallback-required'));
      return true;
    }

    return false;
  }

  private async recoverFromWorkerError(report: ErrorReport): Promise<boolean> {
    console.warn('Attempting Worker recovery...');

    // Test if Workers are available
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not available, switching to main thread calculations');
      window.dispatchEvent(new CustomEvent('worker-fallback-required'));
      return true;
    }

    // Try to create a test worker
    try {
      const testWorker = new Worker(
        URL.createObjectURL(new Blob(['self.postMessage("test")'], { type: 'application/javascript' }))
      );
      testWorker.terminate();
      return true;
    } catch (error) {
      console.warn('Worker creation failed, using main thread fallback');
      window.dispatchEvent(new CustomEvent('worker-fallback-required'));
      return true;
    }
  }

  private async recoverFromCalculationError(report: ErrorReport): Promise<boolean> {
    console.warn('Attempting calculation recovery...');

    // Clear calculation caches and retry with simplified parameters
    window.dispatchEvent(new CustomEvent('calculation-cache-clear'));

    // Reduce precision/complexity for next attempt
    const retryEvent = new CustomEvent('calculation-retry', {
      detail: { reducedPrecision: true, errorId: report.id }
    });
    window.dispatchEvent(retryEvent);

    return true;
  }

  private async recoverFromNetworkError(report: ErrorReport): Promise<boolean> {
    console.warn('Attempting network recovery...');

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test network connectivity
    try {
      await fetch(window.location.origin, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch (error) {
      console.warn('Network still unavailable');
      return false;
    }
  }

  private async genericRecovery(report: ErrorReport): Promise<boolean> {
    // Generic recovery: clear caches and restart components
    console.warn('Attempting generic recovery...');

    window.dispatchEvent(new CustomEvent('generic-error-recovery', {
      detail: { errorId: report.id }
    }));

    return true;
  }

  addErrorListener(listener: (error: ErrorReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  getAllErrors(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  getErrorsByCategory(category: ErrorCategory): ErrorReport[] {
    return this.getAllErrors().filter(error => error.context.category === category);
  }

  clearResolvedErrors(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        this.errors.delete(id);
      }
    }
  }

  getErrorStats(): {
    total: number;
    resolved: number;
    critical: number;
    categories: Record<ErrorCategory, number>;
  } {
    const errors = this.getAllErrors();

    const stats = {
      total: errors.length,
      resolved: errors.filter(e => e.resolved).length,
      critical: errors.filter(e => e.context.severity === ErrorSeverity.CRITICAL).length,
      categories: {} as Record<ErrorCategory, number>
    };

    // Count by category
    for (const category of Object.values(ErrorCategory)) {
      stats.categories[category] = errors.filter(e => e.context.category === category).length;
    }

    return stats;
  }
}

// Convenience functions for common error scenarios
export function handleWebGLError(error: Error, metadata?: Record<string, any>): string {
  return ErrorHandler.getInstance().handleError(error, {
    category: ErrorCategory.WEBGL,
    severity: ErrorSeverity.HIGH,
    recoverable: true,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    sessionId: 'current',
    metadata
  });
}

export function handleWorkerError(error: Error, metadata?: Record<string, any>): string {
  return ErrorHandler.getInstance().handleError(error, {
    category: ErrorCategory.WORKER,
    severity: ErrorSeverity.MEDIUM,
    recoverable: true,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    sessionId: 'current',
    metadata
  });
}

export function handleCalculationError(error: Error, metadata?: Record<string, any>): string {
  return ErrorHandler.getInstance().handleError(error, {
    category: ErrorCategory.CALCULATION,
    severity: ErrorSeverity.MEDIUM,
    recoverable: true,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    sessionId: 'current',
    metadata
  });
}

export const errorHandler = ErrorHandler.getInstance();