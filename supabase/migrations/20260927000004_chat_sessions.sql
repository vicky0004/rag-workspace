-- ============================================
-- CHAT SESSIONS / CONVERSATIONS
-- ============================================

create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null default 'New Chat',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.chat_messages
  add column if not exists session_id uuid references public.chat_sessions(id) on delete cascade;

create index if not exists idx_chat_sessions_workspace_id
    on public.chat_sessions(workspace_id);

create index if not exists idx_chat_messages_session_id
    on public.chat_messages(session_id);

alter table public.chat_sessions enable row level security;
