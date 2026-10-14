import fs from "node:fs";
import path from "node:path";
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "akeanquest-content-autosave",
      configureServer(server) {
        server.middlewares.use("/__akeanquest/save", (req, res, next) => {
          const requestedFile = decodeURIComponent((req.url?.split("?")[0] ?? "").replace(/^\//, ""));
          const allowedFixedFiles = new Set([
            "chapter1.json", "chapter2.json", "chapter3.json",
            "chapter4.json", "chapter5.json", "chapter6.json",
            "word_bank.json", "actors.json",
          ]);
          const isScriptFile = requestedFile.startsWith("scene_scripts/") &&
            requestedFile.endsWith(".json") &&
            requestedFile.split("/").every((part) => part && part !== "." && part !== "..") &&
            /^scene_scripts\/[a-zA-Z0-9_./-]+\.json$/.test(requestedFile);
          if (!allowedFixedFiles.has(requestedFile) && !isScriptFile) {
            res.statusCode = 404;
            res.end("Unknown content file");
            return;
          }

          const dataRoot = path.resolve(process.cwd(), "src", "data");
          const filePath = path.resolve(dataRoot, requestedFile);
          if (!filePath.startsWith(dataRoot + path.sep)) {
            res.statusCode = 400;
            res.end("Invalid content path");
            return;
          }

          if (req.method === "DELETE") {
            if (!isScriptFile) {
              res.statusCode = 405;
              res.end("Only scene script files can be deleted");
              return;
            }
            try {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (error) {
              res.statusCode = 500;
              res.end(error instanceof Error ? error.message : "Could not delete file");
            }
            return;
          }

          if (req.method !== "POST") {
            next();
            return;
          }

          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          req.on("end", () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed: unknown = JSON.parse(raw);
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (error) {
              res.statusCode = 400;
              res.end(error instanceof Error ? error.message : "Invalid JSON");
            }
          });
        });
      },
    },
  ],
})
