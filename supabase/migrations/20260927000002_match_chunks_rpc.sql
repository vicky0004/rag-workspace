-- Ensure the vector type is visible in the search path first
set search_path to extensions, public, pg_catalog;

-- Create a Postgres function for pgvector cosine similarity search
-- scoped to a specific workspace

create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  match_workspace_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  filename text,
  similarity float
)
language plpgsql
stable
set search_path = extensions, public, pg_catalog
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    d.filename,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.workspace_id = match_workspace_id
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Reset search path
reset search_path;
