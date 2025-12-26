-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create sessions table
create table sessions (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create responses table
create table responses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  agent_name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create embeddings table (storing embeddings for responses)
-- We can store the embedding directly in the responses table or a separate table.
-- Let's add it to a separate table to keep things clean, or just add a column to responses.
-- Adding a column is easier for simple setups. Let's do a separate table for clarity as requested.
create table embeddings (
  id uuid default gen_random_uuid() primary key,
  response_id uuid references responses(id) on delete cascade not null,
  embedding vector(384) -- Assuming 384 dimensions for all-MiniLM-L6-v2
);

-- Create clusters table
create table clusters (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create cluster assignments table
create table cluster_assignments (
  response_id uuid references responses(id) on delete cascade not null,
  cluster_id uuid references clusters(id) on delete cascade not null,
  primary key (response_id, cluster_id)
);

-- Create custom_agents table
-- Stores user-created agents
create table custom_agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  prompt text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
