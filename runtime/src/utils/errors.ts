/**
 * ErrorTracker - Accumulates errors with timestamps for monitoring and alerting.
 *
 * Provides:
 * - getErrorRate()    : errors per minute over a sliding window
 * - getRecentErrors(n): last N errors with context
 * - track()           : record a new error
 * - clear()           : reset all tracked errors
 */

export interface TrackedError {
  timestamp: string;
  message: string;
  source: string;
  context?: Record<string, unknown>;
}

export class ErrorTracker {
  private errors: TrackedError[] = [];
  private readonly maxErrors: number;
  private readonly windowMs: number;

  /**
   * @param maxErrors Maximum number of errors to retain (default 500)
   * @param windowMs  Sliding window for rate calculation in ms (default 60000 = 1 minute)
   */
  constructor(maxErrors = 500, windowMs = 60_000) {
    this.maxErrors = maxErrors;
    this.windowMs = windowMs;
  }

  /**
   * Record a new error.
   */
  track(error: Error | string, source: string, context?: Record<string, unknown>): void {
    const entry: TrackedError = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      source,
      context,
    };

    this.errors.push(entry);

    // Evict oldest if over capacity
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * Returns the error rate (errors per minute) within the sliding window.
   */
  getErrorRate(): number {
    const cutoff = Date.now() - this.windowMs;
    const recentCount = this.errors.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    ).length;

    // Normalize to errors-per-minute
    const windowMinutes = this.windowMs / 60_000;
    return parseFloat((recentCount / windowMinutes).toFixed(2));
  }

  /**
   * Returns the last N errors with full context.
   */
  getRecentErrors(n: number): TrackedError[] {
    return this.errors.slice(-n);
  }

  /**
   * Returns total number of tracked errors (up to maxErrors).
   */
  get totalTracked(): number {
    return this.errors.length;
  }

  /**
   * Clear all tracked errors.
   */
  clear(): void {
    this.errors = [];
  }
}

/**
 * Global singleton error tracker instance shared across the runtime.
 */
export const errorTracker = new ErrorTracker();
