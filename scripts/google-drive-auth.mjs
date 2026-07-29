import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim() || "http://localhost:3333/oauth2callback";
const scope = process.env.GOOGLE_DRIVE_SCOPE?.trim() || "https://www.googleapis.com/auth/drive";

if (!clientId || !clientSecret) {
  throw new Error("Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local first.");
}

const callbackUrl = new URL(redirectUri);
if (!["localhost", "127.0.0.1", "[::1]"].includes(callbackUrl.hostname) || !callbackUrl.port) {
  throw new Error("GOOGLE_DRIVE_REDIRECT_URI must be a localhost URL with an explicit port.");
}

const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authorizationUrl = auth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [scope],
});

async function saveRefreshToken(refreshToken) {
  const envPath = resolve(process.cwd(), ".env.local");
  let contents = await readFile(envPath, "utf8");
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";

  for (const [name, value] of [
    ["GOOGLE_DRIVE_REFRESH_TOKEN", refreshToken],
    ["UPLOAD_RESUMES_TO_DRIVE", "true"],
  ]) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    contents = pattern.test(contents)
      ? contents.replace(pattern, () => line)
      : `${contents.trimEnd()}${newline}${line}${newline}`;
  }

  await writeFile(envPath, contents, "utf8");
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", redirectUri);
  if (requestUrl.pathname !== callbackUrl.pathname) {
    response.writeHead(404).end("Not found");
    return;
  }

  const oauthError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  if (oauthError || !code) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Google authorization failed: ${oauthError || "authorization code missing"}`);
    server.close();
    return;
  }

  try {
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Revoke the prior app grant, then run this command again.");
    }

    await saveRefreshToken(tokens.refresh_token);

    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Google Drive authorization succeeded. The refresh token was saved to .env.local. You can close this tab.");
    process.stdout.write(
      "\nGoogle Drive authorization succeeded. The refresh token was saved privately to .env.local, " +
      "and Drive uploads were enabled. Restart the Next.js development server.\n"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed.";
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
    process.stderr.write(`${message}\n`);
  } finally {
    server.close();
  }
});

server.on("error", (error) => {
  const message = error && error.code === "EADDRINUSE"
    ? `Port ${callbackUrl.port} is already in use. Close the previous Google Drive authorization window and try again.`
    : error instanceof Error ? error.message : "The OAuth callback server could not start.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

// Chrome resolves localhost to IPv4 on this Windows setup, so bind explicitly
// to the IPv4 loopback while keeping the registered redirect URI unchanged.
server.listen(Number(callbackUrl.port), "127.0.0.1", () => {
  process.stdout.write(
    `\nOpen this URL in your browser:\n\n${authorizationUrl}\n\nWaiting for Google to redirect to ${redirectUri} ...\n`
  );
});
