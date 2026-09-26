-- ============================================
-- WORKSPACES
-- ============================================

create policy "Users can view their own workspaces"
on public.workspaces
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own workspaces"
on public.workspaces
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own workspaces"
on public.workspaces
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own workspaces"
on public.workspaces
for delete
to authenticated
using (user_id = auth.uid());


-- ============================================
-- DOCUMENTS
-- ============================================

create policy "Users can view workspace documents"
on public.documents
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = documents.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can create workspace documents"
on public.documents
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = documents.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can update workspace documents"
on public.documents
for update
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = documents.workspace_id
        and w.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = documents.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can delete workspace documents"
on public.documents
for delete
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = documents.workspace_id
        and w.user_id = auth.uid()
    )
);


-- ============================================
-- CHUNKS
-- ============================================

create policy "Users can view workspace chunks"
on public.chunks
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chunks.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can create workspace chunks"
on public.chunks
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = chunks.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can update workspace chunks"
on public.chunks
for update
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chunks.workspace_id
        and w.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = chunks.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can delete workspace chunks"
on public.chunks
for delete
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chunks.workspace_id
        and w.user_id = auth.uid()
    )
);


-- ============================================
-- TASKS
-- ============================================

create policy "Users can view workspace tasks"
on public.tasks
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can create workspace tasks"
on public.tasks
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = tasks.workspace_id
        and w.user_id = auth.uid()
    )
);


-- ============================================
-- TOOL CALLS
-- ============================================

create policy "Users can view workspace tool calls"
on public.tool_calls
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = tool_calls.workspace_id
        and w.user_id = auth.uid()
    )
);


-- ============================================
-- CHAT MESSAGES
-- ============================================

create policy "Users can view workspace chat"
on public.chat_messages
for select
to authenticated
using (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_messages.workspace_id
        and w.user_id = auth.uid()
    )
);

create policy "Users can create workspace chat"
on public.chat_messages
for insert
to authenticated
with check (
    exists (
        select 1
        from public.workspaces w
        where w.id = chat_messages.workspace_id
        and w.user_id = auth.uid()
    )
);