# NEON // TASK TRACKER

Minimalist cyberpunk task tracker + 14-day timesheet.

**Features**
- Tasks categorized as **Urgent / Daily / Weekly**
- Configurable aggressive reminder frequency (5–60 min)
- **No mute option** — alarms + browser notifications keep firing until the task is marked COMPLETE
- Rolling 14-day timesheet (calendar view)
- Manual clock-in / clock-out + dedicated Overtime field (especially useful for weekends)
- Private (Supabase Auth)
- Dark neon cyan + purple aesthetic

---

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once ready, go to **SQL Editor** and run the following:

```sql
-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('urgent', 'daily', 'weekly')),
  reminder_interval_minutes integer not null default 15,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  notes text,
  last_reminded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Time entries table
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  clock_in time,
  clock_out time,
  overtime_hours numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Indexes
create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_status_idx on public.tasks(status);
create index time_entries_user_date_idx on public.time_entries(user_id, date);

-- Row Level Security
alter table public.tasks enable row level security;
alter table public.time_entries enable row level security;

-- Policies: users can only see/edit their own data
create policy "Users can manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own time entries"
  on public.time_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key

---

## 2. Local Development

```bash
git clone <your-repo>
cd neon-task-tracker
npm install

# Create .env
cp .env.example .env
# Edit .env and paste your Supabase URL + anon key
```

```bash
npm run dev
```

Open http://localhost:5173

---

## 3. Deploy to GitHub Pages

1. Create a new GitHub repository and push this code.
2. In the repo go to **Settings → Pages**
3. Because this is a Vite SPA, the easiest reliable way is:

**Option A – Use Vercel / Netlify (recommended)**  
- Connect the GitHub repo  
- Build command: `npm run build`  
- Output directory: `dist`  
- Add the two env vars (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

**Option B – Pure GitHub Pages**
- Install `gh-pages`: `npm i -D gh-pages`
- Add to `package.json` scripts:
  ```json
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
  ```
- Change `base` in `vite.config.ts` if needed (already set to `'./'`)
- Run `npm run deploy`
- In GitHub Pages settings choose the `gh-pages` branch

---

## 4. First Use

1. Open the site → Create an account (or sign in)
2. Allow **Notifications** when the browser asks (required for the aggressive alarms)
3. Create a task → the alarm system starts immediately and will keep notifying + playing a short alarm tone on the chosen interval until you hit **COMPLETE**

---

## Notes on the Alarm System

- Uses the browser Notification API + Web Audio API (no external sound files)
- Alarms are **per pending task** and fire on the interval you chose
- There is intentionally **no mute / snooze / dismiss** button inside the app
- Browser / OS can still mute the tab or system sound — this is a hard platform limitation we cannot fully override
- Best results: keep the tab open (or at least the browser running) and grant notification permission

---

Built for personal private use. Stay productive, boss.
