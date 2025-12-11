-- Run this in the Supabase SQL Editor

-- 1. Create the Quotes table
create table quotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn on Security
alter table quotes enable row level security;

-- 3. Create Access Rules (Policies)
-- Allow users to SEE their own quotes
create policy "Users can view their own quotes"
  on quotes for select using ( auth.uid() = user_id );

-- Allow users to CREATE their own quotes
create policy "Users can insert their own quotes"
  on quotes for insert with check ( auth.uid() = user_id );

-- Allow users to UPDATE their own quotes
create policy "Users can update their own quotes"
  on quotes for update using ( auth.uid() = user_id );

-- 4. (Optional) Profiles table if you want to store extra user info later
create table public.profiles (
  id uuid references auth.users on delete cascade,
  email text,
  full_name text,
  primary key (id)
);

alter table public.profiles enable row level security;
