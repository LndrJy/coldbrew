This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase Multi-User Data Isolation (Required)

Run this SQL once in your Supabase SQL Editor so each user only sees their own records:

```sql
alter table public.companies
	add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.emails
	add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.companies alter column owner_id set default auth.uid();
alter table public.emails alter column owner_id set default auth.uid();

-- IMPORTANT (legacy data before owner_id existed):
-- You MUST resolve null owner_id rows before NOT NULL.
--
-- RECOMMENDED: Option A (keep legacy rows, no data loss)
-- 1) Run: select id, email from auth.users;
-- 2) Pick a user id and replace <USER_UUID> below:
-- update public.companies
-- set owner_id = '<USER_UUID>'
-- where owner_id is null;
--
-- update public.emails e
-- set owner_id = c.owner_id
-- from public.companies c
-- where e.company_id = c.id
--   and e.owner_id is null;
--
-- Option B: Remove legacy unowned rows (quickest, but data loss)
-- delete from public.emails where owner_id is null;
-- delete from public.companies where owner_id is null;

-- Safety checks (should both be 0 before continuing)
-- select count(*) from public.companies where owner_id is null;
-- select count(*) from public.emails where owner_id is null;

alter table public.companies alter column owner_id set not null;
alter table public.emails alter column owner_id set not null;

alter table public.companies enable row level security;
alter table public.emails enable row level security;

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
on public.companies for select
using (owner_id = auth.uid());

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own"
on public.companies for insert
with check (owner_id = auth.uid());

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
on public.companies for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own"
on public.companies for delete
using (owner_id = auth.uid());

drop policy if exists "emails_select_own" on public.emails;
create policy "emails_select_own"
on public.emails for select
using (owner_id = auth.uid());

drop policy if exists "emails_insert_own" on public.emails;
create policy "emails_insert_own"
on public.emails for insert
with check (owner_id = auth.uid());
```

After running this SQL, refresh the app and test with two different accounts. Each account should only see/import/update/delete its own `companies` records.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
