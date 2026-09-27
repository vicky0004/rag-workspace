-- ============================================
-- RLS POLICIES FOR CHAT SESSIONS
-- ============================================

create policy "Users can view workspace chat sessions"
on public.chat_sessions
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_sessions.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can create workspace chat sessions"
on public.chat_sessions
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_sessions.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can update workspace chat sessions"
on public.chat_sessions
for update
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_sessions.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can delete workspace chat sessions"
on public.chat_sessions
for delete
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_sessions.workspace_id
        and w.user_id = auth.uid()
    )
);
