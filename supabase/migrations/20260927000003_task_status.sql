-- Add status column to tasks (pending, completed)
alter table public.tasks
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'completed'));
