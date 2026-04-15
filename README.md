# Agency Finance SaaS (Next.js + Supabase)

Simple multi-tenant finance SaaS for agencies:
- Track earnings and expenses
- Track team members
- Dashboard with profit overview
- Supabase Auth + Postgres + Row Level Security

## 1) Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env.local
   ```
3. Set values in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended for automatic agency provisioning without RLS policy friction)
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `AZURE_OPENAI_API_VERSION` (optional, default: `2024-10-21`)

## 2) Setup Supabase DB

1. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
2. In Supabase Auth, create your first user (email/password).
3. Agency is auto-created on first write (adding a member/entry/import) when no agency exists for the user.

## 3) Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Currency is formatted as INR by default.
- RLS ensures users only access records for agencies they belong to.
- File import supports standard CSV directly, and AI-assisted normalization for non-standard CSV/text and screenshots.
# couture_finance
