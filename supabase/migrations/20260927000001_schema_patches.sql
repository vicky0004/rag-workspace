-- ============================================
-- PATCH 1: Add status column to documents
-- ============================================

alter table public.documents
  add column if not exists status text not null default 'ready'
    check (status in ('processing', 'ready', 'failed'));

-- ============================================
-- PATCH 2: Add INSERT policy for tool_calls
-- (service role bypasses RLS, but add for completeness)
-- ============================================

create policy "Users can create workspace tool calls"
on public.tool_calls
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = tool_calls.workspace_id
        and w.user_id = auth.uid()
    )
);

-- ============================================
-- PATCH 3: Add vector similarity search index
-- ============================================

create index if not exists idx_chunks_embedding
  on public.chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);
