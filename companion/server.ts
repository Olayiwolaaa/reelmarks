import { createServer } from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const WEB_DIST = join(DIR, "..", "web", "dist");
const SAMPLE = join(DIR, "..", "web", "sample", "bundle.json");
const DATA = join(DIR, "data", "bundle.json");
const PORT = Number(process.env.PORT ?? 8787);

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4",
};

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readCert(): Promise<{ key: Buffer; cert: Buffer }> {
  try {
    return {
      key: await readFile(join(DIR, "cert", "key.pem")),
      cert: await readFile(join(DIR, "cert", "cert.pem")),
    };
  } catch {
    console.error("No cert found. Run:  npm run cert -w @reelmarks/companion");
    process.exit(1);
  }
}

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const { key, cert } = await readCert();

const server = createServer({ key, cert }, async (req: IncomingMessage, res: ServerResponse) => {
  cors(res);
  const path = new URL(req.url ?? "/", "https://localhost").pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Extension pushes the scraped bundle here.
  if (req.method === "POST" && path === "/ingest") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString("utf8");
    try {
      JSON.parse(body);
      await mkdir(join(DIR, "data"), { recursive: true });
      await writeFile(DATA, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "invalid json" }));
    }
    return;
  }

  // Phone pulls the latest bundle (falls back to the sample until ingested).
  if (req.method === "GET" && path === "/bundle.json") {
    const file = (await exists(DATA)) ? DATA : SAMPLE;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(await readFile(file));
    return;
  }

  // Static: serve the built PWA.
  const rel = path === "/" ? "/index.html" : path;
  const filePath = normalize(join(WEB_DIST, rel));
  if (!filePath.startsWith(WEB_DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (await exists(filePath)) {
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
    return;
  }
  // SPA fallback for routes without a file extension.
  if (extname(path) === "" && (await exists(join(WEB_DIST, "index.html")))) {
    res.writeHead(200, { "Content-Type": "text/html" });
    createReadStream(join(WEB_DIST, "index.html")).pipe(res);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found. Build the PWA first:  npm run build -w @reelmarks/web");
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n?.address);
  console.log("reelmarks companion running:");
  console.log(`  https://localhost:${PORT}`);
  for (const ip of ips) console.log(`  https://${ip}:${PORT}   <- open this on your iPhone`);
});
