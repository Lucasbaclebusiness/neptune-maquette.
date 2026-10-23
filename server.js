// Serveur statique minimal pour la maquette Neptune (Node, sans dépendance).
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DIR = path.join(__dirname, "public");
const PASS = process.env.SITE_PASSWORD || "";
const PORT = Number(process.env.PORT) || 3000;
const REDIRECT = {
  "/main": "/",
  "/clipper": "/Clipper.dc.html",
  "/espace": "/Espace.dc.html",
  "/espace-clipper": "/EspaceClipper.dc.html",
  "/fiche": "/Fiche.dc.html",
};

const FILES = {};
for (const f of fs.readdirSync(DIR)) {
  const buf = fs.readFileSync(path.join(DIR, f));
  FILES[f] = { raw: buf, gz: zlib.gzipSync(buf, { level: 9 }) };
}

const HUB =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex"><title>Neptune - maquette</title>' +
  "<style>body{margin:0;background:#07111F;color:#EFE6D2;font-family:system-ui,sans-serif;padding:48px 24px}" +
  "main{max-width:560px;margin:0 auto}h1{font-size:28px;margin:0 0 6px}p{color:#9DB2C8;margin:0 0 28px}" +
  "a{display:block;padding:16px 18px;margin-bottom:12px;border:1px solid #1F3A5A;border-radius:14px;background:#0C1D33;color:#EFE6D2;text-decoration:none;font-weight:600}" +
  "a:hover{border-color:#2FD4C0}a span{display:block;font-weight:400;color:#9DB2C8;font-size:14px;margin-top:2px}</style></head><body><main>" +
  "<h1>Neptune - maquette</h1><p>Toutes les pages sont cliquables.</p>" +
  '<a href="/">Parcours prospect<span>Le site, de l\'accueil &agrave; l\'espace client</span></a>' +
  '<a href="/Clipper.dc.html">Page clipper<span>Landing, connexion et inscription clipper</span></a>' +
  '<a href="/Espace.dc.html">Espace client (tracker)</a>' +
  '<a href="/EspaceClipper.dc.html">Espace clipper (priv&eacute;)</a>' +
  '<a href="/Fiche.dc.html">Fiche de closing (mail)</a>' +
  "</main></body></html>";

http
  .createServer((req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    if (p === "/healthz") return res.end("ok");
    if (PASS) {
      const h = req.headers.authorization || "";
      let ok = false;
      if (h.startsWith("Basic ")) {
        const dec = Buffer.from(h.slice(6), "base64").toString();
        ok = dec.slice(dec.indexOf(":") + 1) === PASS;
      }
      if (!ok) {
        res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Neptune maquette"' });
        return res.end("Acces protege");
      }
    }
    const head = { "Cache-Control": "no-cache", "X-Robots-Tag": "noindex, nofollow", Vary: "Accept-Encoding" };
    if (p === "/robots.txt") {
      res.writeHead(200, { ...head, "Content-Type": "text/plain" });
      return res.end("User-agent: *\nDisallow: /\n");
    }
    if (REDIRECT[p]) {
      res.writeHead(302, { Location: REDIRECT[p] });
      return res.end();
    }
    if (p === "/liens") {
      res.writeHead(200, { ...head, "Content-Type": "text/html; charset=utf-8" });
      return res.end(HUB);
    }
    const name = p === "/" ? "Main.dc.html" : p.slice(1);
    const f = Object.prototype.hasOwnProperty.call(FILES, name) ? FILES[name] : null;
    if (!f) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Introuvable");
    }
    const type = name.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
    const gz = (req.headers["accept-encoding"] || "").includes("gzip");
    res.writeHead(200, { ...head, "Content-Type": type, ...(gz ? { "Content-Encoding": "gzip" } : {}) });
    res.end(gz ? f.gz : f.raw);
  })
  .listen(PORT, "0.0.0.0", () => console.log("neptune maquette sur le port " + PORT));
