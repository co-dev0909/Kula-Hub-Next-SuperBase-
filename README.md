# Resume Builder 2.1

The application is a single Next.js deployment backed by hosted Supabase.

## Architecture

- Next.js 15: React UI, Server Actions, and `/api` Route Handlers
- Supabase: hosted PostgreSQL, Auth, and private Storage
- PostgreSQL RLS: user-level isolation for every record and resume file
- Supabase-backed FIFO application queue with an atomic per-user worker lock
- Vercel Queues: durable production wake-ups for background resume processing
- DeepSeek: ATS resume content generation
- Docxtemplater: in-memory DOCX generation
- Optional Google Drive API: editable native Google Docs copies

No Railway server, MongoDB database, Docker installation, persistent worker, LibreOffice installation, or local generated-file directory is required.

## Prerequisites

- Node.js 20 or newer
- Access to the hosted Supabase project
- A DeepSeek API key for resume generation

## Initial hosted Supabase setup

Install dependencies:

```powershell
npm.cmd install
```

Authenticate the Supabase CLI, link this repository to the configured project, and apply all migrations:

```powershell
npm.cmd run supabase:login
npm.cmd run supabase:link
npm.cmd run supabase:push
```

These operations use the hosted project `agdrxkevfupnniuagnue` and do not require Docker. If CLI access is unavailable, open the Supabase SQL Editor and run every file in `supabase/migrations` in filename order.

## Environment

Create `.env.local` using the project URL and publishable key from the Supabase Connect screen:

```env
NEXT_PUBLIC_BACKEND_URL=/api
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

The publishable key is safe for the browser. Never place a service-role key or database password in a `NEXT_PUBLIC_*` variable.

## Optional Google Docs upload

Google Drive is an additional copy; the private Supabase DOCX file remains the authoritative download. Apply `supabase/migrations/202607290002_google_drive.sql`, then configure fresh server-only credentials:

```env
UPLOAD_RESUMES_TO_DRIVE=true
ROOT_DRIVE_FOLDER_ID=YOUR_FOLDER_ID
GOOGLE_DRIVE_AUTH_MODE=oauth
GOOGLE_DRIVE_CLIENT_ID=YOUR_NEW_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN=YOUR_NEW_REFRESH_TOKEN
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3333/oauth2callback
```

Create a **Web application** OAuth client with `http://localhost:3333/oauth2callback` as an authorized redirect URI. Put its new client ID and secret in `.env.local`, leave the refresh token blank, and run:

```powershell
npm.cmd run google-drive:auth
```

Open the URL printed in the terminal, approve access, and copy the resulting `GOOGLE_DRIVE_REFRESH_TOKEN` into `.env.local`. Restart the development server after setting `UPLOAD_RESUMES_TO_DRIVE=true`. Never paste the generated token into chat.

Use OAuth for a personal My Drive folder. The OAuth account must be able to access `ROOT_DRIVE_FOLDER_ID`. Service-account mode is supported only when that folder is inside a Shared Drive and the service account is a Shared Drive member:

```env
UPLOAD_RESUMES_TO_DRIVE=true
ROOT_DRIVE_FOLDER_ID=YOUR_SHARED_DRIVE_FOLDER_ID
GOOGLE_DRIVE_AUTH_MODE=service_account
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

For local-only compatibility, `GOOGLE_DRIVE_KEY_FILE=key/google-drive.json` is accepted, and `/key/` is ignored by Git. Vercel should use `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`, never a repository key file. Legacy `GOOGLE_DRIVE_CREDENTIALS_JSON` and `GOOGLE_DRIVE_TOKEN_JSON` are also accepted, but scalar OAuth variables are easier to configure safely.

Never prefix Google credentials with `NEXT_PUBLIC_`. Any credential disclosed in chat, source control, or logs must be revoked and replaced before use.

## Run

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

When importing the Kula-Hub Git repository directly, leave Vercel's **Root Directory** at the repository root (`.`). If you import the parent workspace as a monorepo instead, set it to `Kula-Hub`. Vercel will detect Next.js and use `npm run build`; keep `package-lock.json` committed so production installs use the tested dependency graph.

Add these variables under **Project Settings → Environment Variables** for Production and any Preview environment you intend to test:

```env
NEXT_PUBLIC_BACKEND_URL=/api
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SB_SECRET_KEY

DEEPSEEK_API_KEY=YOUR_NEW_DEEPSEEK_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash

UPLOAD_RESUMES_TO_DRIVE=true
ROOT_DRIVE_FOLDER_ID=YOUR_FOLDER_ID
GOOGLE_DRIVE_AUTH_MODE=oauth
GOOGLE_DRIVE_CLIENT_ID=YOUR_NEW_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN=YOUR_NEW_REFRESH_TOKEN
```

`SUPABASE_SECRET_KEY` is used only by the private Vercel Queue consumer. Copy the current `sb_secret_...` key from the Supabase API Keys settings, never prefix it with `NEXT_PUBLIC_`, and never expose it in browser code. A legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback.

Generate the Google refresh token locally with `npm.cmd run google-drive:auth`; do not run the OAuth authorization helper on Vercel. `GOOGLE_DRIVE_REDIRECT_URI` and `GOOGLE_DRIVE_SCOPE` are only needed for that local authorization step, not for production refresh-token use. Do not configure MongoDB, Railway, JWT, workers, CORS, local key files, or Docker on Vercel.

`vercel.json` registers the private `resume-applications` queue consumer. The database remains the FIFO authority: it atomically allows only the oldest Pending application for each user to enter Generating. Locally, the persistent `/user` layout calls the same processor with the signed-in user's Supabase session, so Docker and a local worker are not needed.

In Supabase **Authentication → URL Configuration**, set the Site URL to the production Vercel domain and allow both `http://localhost:3000/**` and the production domain as redirect URLs. After changing any Vercel environment variable, create a new deployment because existing deployments do not receive updated values.

## Acceptance test

1. Register a user and sign in.
2. Create a profile with education, experience, and a resume template.
3. Save three jobs quickly. Each Save should return immediately, clear the form, and keep you on `/user/jobs`.
4. Open `/user/applications` and confirm the oldest application is **Generating** while the newer applications remain **Pending**.
5. Confirm each application automatically advances from **Pending** to **Generating**, one at a time, then becomes **Generated** with a DOCX object in the private `resumes` bucket.
6. If Drive upload is enabled, confirm each application stays **Generating** until **Open Google Doc** opens an editable native Google Doc.
7. Download a resume and mark the application Applied.
8. Confirm users cannot access another user's records or files.

Normal processing does not show manual Generate or Drive upload buttons. **Retry Generate** appears only after generation fails, and **Retry Drive** appears only after the local resume exists but its Google Drive upload fails or is interrupted.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
```

## Data model

The schema source of truth is the ordered set of files in `supabase/migrations`. In particular, `202607290003_application_queue.sql` adds the atomic FIFO claim function required by automatic processing, `202607310001_docx_only_resumes.sql` makes DOCX the sole generated resume artifact, and `202608070001_applications_list_index.sql` keeps the per-user application list query fast as data grows. The migrations create:

- `user_profiles`, linked one-to-one with `auth.users`
- `profiles`, including JSONB education and experience collections
- `jobs`
- `applications`
- Optional Google Drive file IDs, links, and retry diagnostics on `applications`
- FIFO queue metadata, an oldest-Pending index, and a per-user atomic claim function
- Private `resumes` Storage bucket
- Ownership and application-list indexes, update triggers, and complete RLS policies

Generated files use `<auth-user-id>/<application-id>/resume.docx` and are returned only through authenticated download handlers.

## Troubleshooting

If the application reports a missing table or column in the schema cache, Auth is connected but the hosted schema is not current. Run `npm.cmd run supabase:link` followed by `npm.cmd run supabase:push`, or execute every migration file in filename order in the Supabase SQL Editor. Do not create only the reported table or column manually; the application also requires the related types, triggers, indexes, RLS policies, Storage bucket, and integration metadata.

If applications stay Pending and `/api/applications/process` reports that the queue is not ready, apply every migration through `supabase/migrations/202607310001_docx_only_resumes.sql`. For durable Vercel processing after the browser closes, also configure the server-only `SUPABASE_SECRET_KEY` and redeploy.
