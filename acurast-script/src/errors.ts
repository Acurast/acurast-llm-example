// Error tracking system
interface ErrorEntry {
  message: string;
  timestamp: string;
  stack?: string;
  context?: string;
}

const errors: ErrorEntry[] = [];

/**
 * Logs an error to the errors array
 * @param error The error message or Error object
 * @param context Optional context information about where the error occurred
 */
export const logError = (error: Error | string, context?: string) => {
  const errorEntry: ErrorEntry = {
    message: error instanceof Error ? error.message : error,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof Error && error.stack) {
    errorEntry.stack = error.stack;
  }

  errors.push(errorEntry);
  console.error(
    `[ERROR] ${errorEntry.message}${context ? ` (${context})` : ""}`
  );
};

/**
 * Returns all logged errors
 */
export const getErrors = () => {
  return errors;
};

/**
 * Clears all logged errors
 */
export const clearErrors = () => {
  errors.length = 0;
};
