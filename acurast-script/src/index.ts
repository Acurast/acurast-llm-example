import path from "path";
import express from "express";
import {
  MODEL_URL,
  MODEL_NAME,
  STORAGE_DIR,
  HTML_CONTENT,
  CUSTOM_WEBSITE_TITLE,
  CUSTOM_SYSTEM_PROMPT,
  REPORT_URL,
  FAVICON_BASE64,
} from "./constants";
import { createWriteStream, existsSync, readFileSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { createTunnelWithRetry } from "./tunnel";
import { getErrors, logError, clearErrors } from "./errors";

declare let _STD_: any;

const MODEL_FILE = path.resolve(STORAGE_DIR, MODEL_NAME);
const app = express();

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ADDRESS = _STD_.device.getAddress().toLowerCase();

// Use the bundled HTML content with the correct URL and custom title if provided
let processedHtmlContent = HTML_CONTENT.replace(
  /http:\/\/localhost:1234/g,
  `https://${ADDRESS}.acu.run/llm`
);

// Apply custom website title if provided
if (CUSTOM_WEBSITE_TITLE) {
  processedHtmlContent = processedHtmlContent.replace(
    /<title>Acurast Confidential LLM<\/title>/,
    `<title>Acurast Confidential LLM: ${CUSTOM_WEBSITE_TITLE}</title>`
  );
}

// Serve the HTML content for the root route
app.get("/", (req, res) => {
  res.send(processedHtmlContent);
});

// Serve favicon.ico
app.get("/favicon.ico", (req, res) => {
  try {
    const faviconBuffer = Buffer.from(FAVICON_BASE64, "base64");
    res.set("Content-Type", "image/x-icon");
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
    res.send(faviconBuffer);
  } catch (error) {
    console.error("Error serving favicon:", error);
    res.status(404).send("Favicon not found");
  }
});

app.get("/health", (req, res) => {
  try {
    // Check if llama server is running
    if (_STD_.llama.server.isRunning?.()) {
      res.json({ status: "ok" });
    } else {
      res.json({
        status:
          "Error: LLM server not running. Give it some time and try again, or report to the Acurast team.",
      });
    }
  } catch (error) {
    res.json({
      status: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

app.get("/errors", (req, res) => {
  res.json(getErrors());
});

app.post("/errors/clear", (req, res) => {
  clearErrors();
  res.json({ success: true, message: "Errors cleared" });
});

// LLM proxy route
app.all("/llm/*", async (req, res) => {
  console.log("LLM proxy route", req.url);
  const targetUrl = `http://127.0.0.1:8080${req.url.replace("/llm", "")}`;
  console.log("targetUrl", targetUrl);
  try {
    // Clean up headers that might cause issues
    const headers = { ...req.headers };
    delete headers.host;
    delete headers["x-forwarded-for"];
    delete headers["x-real-ip"];
    delete headers["x-forwarded-proto"];
    delete headers["x-nginx-proxy"];
    delete headers.connection;
    delete headers["accept-encoding"];

    // Log the raw request body
    console.log("Raw request body:", req.body);

    // Format the request body to match LLM Server's expectations
    const body = {
      messages: Array.isArray(req.body.messages) ? req.body.messages : [],
      temperature: req.body.temperature || 0.7,
      stream: req.body.stream || false,
      model: req.body.model,
      max_tokens: req.body.max_tokens || 2048,
      stop: req.body.stop || null,
      frequency_penalty: req.body.frequency_penalty || 0,
      presence_penalty: req.body.presence_penalty || 0,
      top_p: req.body.top_p || 1,
    };

    // Add custom system prompt if provided
    if (CUSTOM_SYSTEM_PROMPT && body.messages.length > 0) {
      body.messages = [
        {
          role: "system",
          content: CUSTOM_SYSTEM_PROMPT,
        },
        ...body.messages,
      ];
    }

    const stringifiedBody = JSON.stringify(body);
    console.log("Sending body:", stringifiedBody);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(stringifiedBody).toString(),
      },
      body: stringifiedBody,
    });

    // Forward the response status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream the response body
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Proxy error:", error);
    logError(error as Error, "LLM Proxy Route");
    res.status(502).json({ error: "Proxy error" });
  }
});

async function downloadModel(url: string, destination: string) {
  console.log("Downloading model", MODEL_NAME);
  try {
    const res = await fetch(url);

    if (!res.body) {
      throw new Error("No response body");
    }

    console.log("Writing model to file:", destination);
    const writer = createWriteStream(destination);
    await finished(Readable.fromWeb(res.body as any).pipe(writer));
  } catch (error) {
    logError(error as Error, "Model Download");
    throw error; // Re-throw to handle in the main function
  }
}

async function main() {
  try {
    if (!existsSync(MODEL_FILE)) {
      await downloadModel(MODEL_URL, MODEL_FILE);
    } else {
      console.log("Using already downloaded model:", MODEL_FILE);
    }
    console.log("Model downloaded, starting server...");

    _STD_.llama.server.start(
      ["--model", MODEL_FILE, "--ctx-size", "2048", "--threads", "8"],
      () => {
        // onCompletion
        console.log("Llama server closed.");
        logError("Llama server closed unexpectedly", "Llama Server");
      },
      (error: any) => {
        // onError
        console.log("Llama server error:", error);
        logError(error, "Llama Server");
        throw error;
      }
    );

    const PORT = 3000;

    try {
      const tunnel = await createTunnelWithRetry(ADDRESS, {
        port: PORT,
      });
      console.log("Server started at", tunnel.url);

      // Report deployment URL if configured
      if (REPORT_URL) {
        try {
          await fetch(REPORT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              deploymentUrl: tunnel.url,
              address: ADDRESS,
              timestamp: new Date().toISOString(),
            }),
          });
          console.log("Deployment URL reported successfully");
        } catch (reportError) {
          console.error("Failed to report deployment URL:", reportError);
          logError(reportError as Error, "URL Reporting");
        }
      }
    } catch (tunnelError) {
      logError(tunnelError as Error, "Tunnel Creation");
      console.error(
        "Failed to create tunnel, continuing with local server only"
      );
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Express server listening on port ${PORT}`);
    });
  } catch (error) {
    logError(error as Error, "Application Startup");
    console.error("Fatal error during startup:", error);
    process.exit(1);
  }
}

// Add global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  logError(error, "Uncaught Exception");
  console.error("Uncaught Exception:", error);
  // Don't exit the process to keep the application running
});

process.on("unhandledRejection", (reason, promise) => {
  logError(
    reason instanceof Error ? reason : new Error(String(reason)),
    "Unhandled Promise Rejection"
  );
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

main();
