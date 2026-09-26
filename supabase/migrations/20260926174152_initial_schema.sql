-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists vector;


-- ============================================
-- WORKSPACES
-- ============================================

create table public.workspaces (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    name text not null
        check (char_length(trim(name)) > 0),

    created_at timestamptz not null default now()
);


-- ============================================
-- DOCUMENTS
-- ============================================

create table public.documents (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null
        references public.workspaces(id)
        on delete cascade,

    filename text not null,

    content_hash text not null,

    created_at timestamptz not null default now(),

    unique (workspace_id, content_hash)
);


-- ============================================
-- CHUNKS
-- ============================================

create table public.chunks (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null
        references public.workspaces(id)
        on delete cascade,

    document_id uuid not null
        references public.documents(id)
        on delete cascade,

    content text not null,

    embedding extensions.vector(768),

    chunk_index integer not null,

    created_at timestamptz not null default now(),

    unique (document_id, chunk_index)
);


-- ============================================
-- TASKS
-- ============================================

create table public.tasks (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null
        references public.workspaces(id)
        on delete cascade,

    title text not null
        check (char_length(trim(title)) > 0),

    created_at timestamptz not null default now()
);


-- ============================================
-- TOOL CALLS
-- ============================================

create table public.tool_calls (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null
        references public.workspaces(id)
        on delete cascade,

    tool_name text not null,

    args jsonb,

    result jsonb,

    status text not null default 'pending',

    created_at timestamptz not null default now(),

    check (status in ('pending', 'success', 'failed'))
);


-- ============================================
-- CHAT MESSAGES
-- ============================================

create table public.chat_messages (
    id uuid primary key default gen_random_uuid(),

    workspace_id uuid not null
        references public.workspaces(id)
        on delete cascade,

    role text not null,

    content text not null,

    citations jsonb,

    created_at timestamptz not null default now(),

    check (role in ('user', 'assistant', 'system', 'tool'))
);

create index idx_documents_workspace_id
    on public.documents(workspace_id);

create index idx_chunks_workspace_id
    on public.chunks(workspace_id);

create index idx_chunks_document_id
    on public.chunks(document_id);

create index idx_tasks_workspace_id
    on public.tasks(workspace_id);

create index idx_tool_calls_workspace_id
    on public.tool_calls(workspace_id);

create index idx_chat_messages_workspace_id
    on public.chat_messages(workspace_id);

create index idx_chat_messages_workspace_created
    on public.chat_messages(workspace_id, created_at);


alter table public.workspaces enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.tasks enable row level security;
alter table public.tool_calls enable row level security;
alter table public.chat_messages enable row level security;