const http = require("node:http");

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function request(baseUrl, options = {}) {
  const url = new URL(options.path || "/", baseUrl);
  const body = options.body || null;
  const headers = { ...(options.headers || {}) };
  if (body && !headers["content-length"]) headers["content-length"] = Buffer.byteLength(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function formBody(values) {
  return new URLSearchParams(values).toString();
}

function cookieHeader(previous, response) {
  const setCookie = response.headers["set-cookie"] || [];
  const next = new Map();
  if (previous) {
    for (const part of previous.split(";")) {
      const [name, ...valueParts] = part.trim().split("=");
      if (name) next.set(name, valueParts.join("="));
    }
  }
  for (const cookie of setCookie) {
    const [pair] = cookie.split(";");
    const [name, ...valueParts] = pair.split("=");
    next.set(name, valueParts.join("="));
  }
  return Array.from(next.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

function extractCsrf(html) {
  return html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] || null;
}

function multipartBody(boundary, fields, file) {
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  if (file) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
    );
    parts.push(file.content);
    parts.push("\r\n");
  }
  parts.push(`--${boundary}--\r\n`);
  return Buffer.concat(parts.map((part) => Buffer.isBuffer(part) ? part : Buffer.from(part)));
}

module.exports = {
  cookieHeader,
  extractCsrf,
  formBody,
  multipartBody,
  request,
  startServer,
};
