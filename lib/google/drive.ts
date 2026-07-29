import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { google } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

type JsonObject = Record<string, unknown>;

type GoogleDocUpload = {
  fileId: string;
  viewLink: string;
  downloadLink: string;
};

function parseJson(value: string, variableName: string): JsonObject {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
    return parsed as JsonObject;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON.";
    throw new Error(`${variableName} is not valid JSON: ${detail}`);
  }
}

function nestedObject(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function serviceAccountCredentials() {
  const inlineCredentials = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineCredentials) return parseJson(inlineCredentials, "GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON");

  const keyFile = process.env.GOOGLE_DRIVE_KEY_FILE?.trim();
  if (!keyFile) {
    throw new Error(
      "Service-account mode requires GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON. " +
      "GOOGLE_DRIVE_KEY_FILE is supported for local development only."
    );
  }

  const contents = await readFile(resolve(process.cwd(), keyFile), "utf8");
  return parseJson(contents, "GOOGLE_DRIVE_KEY_FILE");
}

function oauthSettings() {
  const credentialsJson = process.env.GOOGLE_DRIVE_CREDENTIALS_JSON?.trim();
  const credentials = credentialsJson ? parseJson(credentialsJson, "GOOGLE_DRIVE_CREDENTIALS_JSON") : {};
  const appCredentials = nestedObject(credentials.web) || nestedObject(credentials.installed) || credentials;
  const tokenJson = process.env.GOOGLE_DRIVE_TOKEN_JSON?.trim();
  const token = tokenJson ? parseJson(tokenJson, "GOOGLE_DRIVE_TOKEN_JSON") : {};

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() || stringValue(appCredentials.client_id);
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() || stringValue(appCredentials.client_secret);
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim() || stringValue(token.refresh_token);
  const configuredRedirect = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim();
  const redirectUris = Array.isArray(appCredentials.redirect_uris) ? appCredentials.redirect_uris : [];
  const redirectUri = configuredRedirect || stringValue(redirectUris[0]);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "OAuth mode requires GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and " +
      "GOOGLE_DRIVE_REFRESH_TOKEN (or the legacy credentials/token JSON variables)."
    );
  }

  return { clientId, clientSecret, refreshToken, redirectUri };
}

async function driveClient() {
  const mode = (process.env.GOOGLE_DRIVE_AUTH_MODE || "oauth").trim().toLowerCase();

  if (mode === "service_account") {
    const credentials = await serviceAccountCredentials();
    const auth = new google.auth.GoogleAuth({ credentials, scopes: [DRIVE_SCOPE] });
    return { drive: google.drive({ version: "v3", auth }), mode };
  }

  if (mode === "oauth") {
    const { clientId, clientSecret, refreshToken, redirectUri } = oauthSettings();
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });
    return { drive: google.drive({ version: "v3", auth }), mode };
  }

  throw new Error("GOOGLE_DRIVE_AUTH_MODE must be either oauth or service_account.");
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const response = nestedObject((error as JsonObject).response);
    const data = nestedObject(response?.data);
    const apiError = nestedObject(data?.error);
    return stringValue(apiError?.message) || stringValue(data?.error_description) || "Unknown Google API error.";
  }
  return "Unknown Google API error.";
}

export function googleDriveUploadsEnabled() {
  return process.env.UPLOAD_RESUMES_TO_DRIVE?.trim().toLowerCase() === "true";
}

function queryLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function uploadDocxAsGoogleDoc(
  docx: Buffer,
  fileName: string,
  applicationId: string,
): Promise<GoogleDocUpload> {
  const folderId = process.env.ROOT_DRIVE_FOLDER_ID?.trim();
  if (!folderId) throw new Error("ROOT_DRIVE_FOLDER_ID is required when Google Drive uploads are enabled.");

  const { drive, mode } = await driveClient();

  try {
    const existing = await drive.files.list({
      q: `'${queryLiteral(folderId)}' in parents and trashed = false and appProperties has { key='resumeApplicationId' and value='${queryLiteral(applicationId)}' }`,
      spaces: "drive",
      pageSize: 1,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: "files(id,name,mimeType,webViewLink)",
    });
    const existingFile = existing.data.files?.[0];
    if (existingFile?.id) {
      return {
        fileId: existingFile.id,
        viewLink: existingFile.webViewLink || `https://docs.google.com/document/d/${existingFile.id}/edit`,
        downloadLink: `https://docs.google.com/document/d/${existingFile.id}/export?format=docx`,
      };
    }

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: GOOGLE_DOC_MIME,
        parents: [folderId],
        appProperties: { resumeApplicationId: applicationId },
      },
      media: {
        mimeType: DOCX_MIME,
        body: Readable.from([docx]),
      },
      supportsAllDrives: true,
      fields: "id,name,mimeType,webViewLink",
    });

    const fileId = uploaded.data.id;
    if (!fileId) throw new Error("Google Drive did not return a file ID.");

    return {
      fileId,
      viewLink: uploaded.data.webViewLink || `https://docs.google.com/document/d/${fileId}/edit`,
      downloadLink: `https://docs.google.com/document/d/${fileId}/export?format=docx`,
    };
  } catch (error) {
    const detail = errorMessage(error);
    const serviceAccountHint = mode === "service_account"
      ? " Service-account mode only works when ROOT_DRIVE_FOLDER_ID belongs to a Shared Drive and the service account is a member."
      : "";
    throw new Error(`Google Drive upload failed: ${detail}.${serviceAccountHint}`);
  }
}
