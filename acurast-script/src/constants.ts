declare let _STD_: any;
// HTML_CONTENT is defined by webpack at build time as a global variable

if (typeof _STD_ === "undefined") {
  // If _STD_ is not defined, we know it's not running in the Acurast Cloud.
  // Define _STD_ here for local testing.
  console.log("Running in local environment");
  (global as any)._STD_ = {
    app_info: { version: "local" },
    job: { getId: () => "local", storageDir: "./" },
    device: { getAddress: () => "local" },
    llama: {
      server: {
        start: () => {
          console.log("Llama server not started because we're in local mode");
        },
      },
    },
  };
}

// Model constants
export const MODEL_URL =
  "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
export const MODEL_NAME = "Qwen2.5-0.5B-Instruct-Q4_K_M.gguf";
export const STORAGE_DIR = _STD_.job.storageDir;

/**
 * HTML_CONTENT is defined by webpack.DefinePlugin at build time.
 * This approach ensures we can access it regardless of the environment:
 * 1. First try to access it from the global scope (Node.js environment)
 * 2. Then try to access it from the window object (browser environment)
 * 3. If neither is available, provide a fallback HTML content
 *
 * This ensures the application won't crash if the HTML content isn't properly inlined.
 */
export const HTML_CONTENT: string = (function () {
  try {
    // Try to access from global scope (Node.js)
    if (typeof global !== "undefined" && (global as any).HTML_CONTENT) {
      return (global as any).HTML_CONTENT;
    }

    // Try to access from window object (browser)
    if (typeof window !== "undefined" && (window as any).HTML_CONTENT) {
      return (window as any).HTML_CONTENT;
    }

    // Direct access (should work if webpack properly inlined it)
    // Use a different name to avoid the circular reference
    if (
      typeof globalThis !== "undefined" &&
      Object.prototype.hasOwnProperty.call(globalThis, "HTML_CONTENT")
    ) {
      return (globalThis as any).HTML_CONTENT;
    }

    // Fallback
    console.warn("HTML_CONTENT not found, using fallback content");
    return "<html><body><h1>Fallback HTML Content</h1><p>The actual HTML content was not properly inlined during build.</p></body></html>";
  } catch (error) {
    console.error("Error accessing HTML_CONTENT:", error);
    return "<html><body><h1>Error HTML Content</h1><p>There was an error accessing the HTML content.</p></body></html>";
  }
})();
