import dotenv from "@dotenvx/dotenvx";
dotenv.config();

declare let _STD_: any;
// HTML_CONTENT is defined by webpack at build time as a global variable

if (typeof _STD_ === "undefined") {
  // If _STD_ is not defined, we know it's not running in the Acurast Cloud.
  // Define _STD_ here for local testing.
  console.log("Running in local environment");
  (global as any)._STD_ = {
    app_info: { version: "local" },
    job: { getId: () => "local", storageDir: "./" },
    device: {
      getAddress: () => `local-${Math.random().toString(36).substring(2, 15)}`,
    },
    chains: {
      bitcoin: {
        signer: {
          rawSign: () => "local",
          sha256: () => "local",
        },
      },
    },
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
export const MODEL_URL = _STD_.env?.MODEL_URL || process.env.MODEL_URL || "";
export const MODEL_NAME = _STD_.env?.MODEL_NAME || process.env.MODEL_NAME || "";
export const STORAGE_DIR = _STD_.job.storageDir;

if (!MODEL_URL || !MODEL_NAME) {
  throw new Error("MODEL_URL and MODEL_NAME must be set");
}

// Custom configuration from environment variables
export const CUSTOM_SYSTEM_PROMPT =
  _STD_.env?.CUSTOM_SYSTEM_PROMPT || process.env.CUSTOM_SYSTEM_PROMPT || "";
export const CUSTOM_WEBSITE_TITLE =
  _STD_.env?.CUSTOM_WEBSITE_TITLE || process.env.CUSTOM_WEBSITE_TITLE || "";
export const REGISTER_URL =
  _STD_.env?.REGISTER_URL || process.env.REGISTER_URL || "";

console.log("CUSTOM_SYSTEM_PROMPT", CUSTOM_SYSTEM_PROMPT);
console.log("CUSTOM_WEBSITE_TITLE", CUSTOM_WEBSITE_TITLE);
console.log("REGISTER_URL", REGISTER_URL);

// Base64 encoded favicon.ico (green Acurast-style favicon)
export const FAVICON_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAHlBMVEUAAAAAAAAAAAC05gAAAAC36gCbxgAeJgBJXQCCpgCyUr7OAAAAA3RSTlOorG6FpXe8AAABmklEQVR4nO3bwQ7CMAwD0I3Sdf3/HwbONIkTkk1I7hUkHsZtxhDbY99uXPtj25+3rvfbvxewEUAAAQQQQAABBBBAAAEEEEAAAQQQQMCfAc4mr3kF4Ogy4LwAoATQYwE4AUoAfVwAOJXXDwbgA+Q3wAcoaIAPUNAAF6CiAS5ARQM8gJoAHAAtgHADHICSLeABFAUAA4oagANqtgAOqGoADCg5BB2AsgaggLIGgIC6BoCAugZggMIGYACrAUNYWQArgHGsFxYOADAbMPt6QfvDBthbYLRvYm+9HzkAYAzO5VOwCEwAsgWG8DgSgQmADsF1BA2JwAJgh+APEVgA8BCMt8AAoIfgED6DwzyNDAA8BsMt0AH4GBSeabdABzjGYLQFKsAzBsUW/AJwXQgFI9AApzBkPut71AVboAGmMGc/a7G9YhtBA0gXGsLFRuw4zLxTGmpBJiAUQeq94kgLUgGRCHLvlgdakAtYXR02fSgm/14w1x+C8gXy336wIIAAAggggAACCCCAAAIIIIAAAggggIAKwO1/fr/77/8v9t718JRtiCUAAAAASUVORK5CYII=";

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
