import path from "path";
import express from "express";
import { MODEL_URL, MODEL_NAME, STORAGE_DIR } from "./constants";
import { createWriteStream, existsSync, readFileSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { createTunnelWithRetry } from "./tunnel";

declare let _STD_: any;

const MODEL_FILE = path.resolve(STORAGE_DIR, MODEL_NAME);
const app = express();

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ADDRESS = _STD_.device.getAddress().toLowerCase();

// Read the built frontend HTML file
const htmlContent = readFileSync(
  path.join(__dirname, "../../chat-frontend/dist/index.html"),
  "utf-8"
).replace("http://localhost:1234", `https://${ADDRESS}.acu.run/llm`);

// Serve the HTML content for the root route
app.get("/", (req, res) => {
  res.send(htmlContent);
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

    // Format the request body to match LM Studio's expectations
    const body = {
      messages: Array.isArray(req.body.messages) ? req.body.messages : [],
      temperature: req.body.temperature || 0.7,
      stream: req.body.stream || false,
      model: req.body.model || "llama-3.1-8b-lexi-uncensored-v2",
      max_tokens: req.body.max_tokens || 2048,
      stop: req.body.stop || null,
      frequency_penalty: req.body.frequency_penalty || 0,
      presence_penalty: req.body.presence_penalty || 0,
      top_p: req.body.top_p || 1,
    };

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
    res.status(502).json({ error: "Proxy error" });
  }
});

async function downloadModel(url: string, destination: string) {
  console.log("Downloading model", MODEL_NAME);
  const res = await fetch(url);

  if (!res.body) {
    throw new Error("No response body");
  }

  console.log("Writing model to file:", destination);
  const writer = createWriteStream(destination);
  await finished(Readable.fromWeb(res.body as any).pipe(writer));
}
async function main() {
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
    },
    (error: any) => {
      // onError
      console.log("Llama server error:", error);
      throw error;
    }
  );

  const PORT = 3000;

  const tunnel = await createTunnelWithRetry(ADDRESS, {
    port: PORT,
  });

  // Start Express server
  app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
  });

  console.log("Server started at", tunnel.url);
}

main();
