/* Star Finance — tiny zero-dependency static server
   Run:  node serve.js   →  http://localhost:4890        */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4890;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}).listen(PORT, () => {
  const os = require("os");
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address);
  console.log(`\n  ★ Star Finance is running:\n\n     Local:   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`     Network: http://${ip}:${PORT}   ← open on your Android (same Wi-Fi)`));
  console.log(`\n  Demo login → demo@starfinance.app / demo1234\n`);
});
