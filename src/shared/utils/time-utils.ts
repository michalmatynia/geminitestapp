/**
 * Time Utilities
 * 
 * Collection of time-related utility functions for delays, formatting, and calculations.
 * Provides consistent time handling patterns across the application.
 */

/**
 * Delays execution for a specified number of milliseconds.
 * Useful for implementing timeouts, rate limiting, and animation delays.
 */
export const delay = (ms: number): Promise<void> =>
  new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) => {
    setTimeout(resolve, ms);
  });
