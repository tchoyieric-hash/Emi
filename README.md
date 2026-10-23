# EMi

EMi is a fresh social-app foundation built with Next.js, React, TypeScript and Supabase, designed for deployment on Vercel.

## Current state

- Responsive French-language starter interface
- Interactive navigation, story placeholders and post likes
- Supabase browser-client helper and environment template
- No production database credentials committed
- No live authentication, posts, messaging, media upload or ephemeral stories yet

## Local development

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and public anon/publishable key.
5. Run `npm run dev`.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never put a Supabase service-role key or other server secret in a `NEXT_PUBLIC_*` variable or commit it to Git.

## Deployment

Import this repository into Vercel, configure the environment variables in Preview first, then test the preview before promoting any production deployment.
