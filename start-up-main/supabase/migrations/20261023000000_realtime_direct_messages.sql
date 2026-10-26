create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    username text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view profiles"
    on public.profiles;
create policy "Authenticated users can view profiles"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "Users can update their own profile"
    on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, username)
    values (
        new.id,
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
            nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
            split_part(new.email, '@', 1),
            'Usuário'
        ),
        nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '^@', ''), '')
    )
    on conflict (id) do update
        set display_name = excluded.display_name,
            username = excluded.username,
            updated_at = now();

    return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
    after insert or update of raw_user_meta_data, email on auth.users
    for each row execute function public.sync_profile_from_auth_user();

insert into public.profiles (id, display_name, username)
select
    id,
    coalesce(
        nullif(trim(raw_user_meta_data ->> 'name'), ''),
        nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
        split_part(email, '@', 1),
        'Usuário'
    ),
    nullif(regexp_replace(coalesce(raw_user_meta_data ->> 'username', ''), '^@', ''), '')
from auth.users
on conflict (id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        updated_at = now();

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    direct_key text not null unique,
    created_at timestamptz not null default now(),
    last_message text,
    last_message_at timestamptz
);

alter table public.conversations
    add column if not exists last_message text,
    add column if not exists last_message_at timestamptz;

create table if not exists public.conversation_participants (
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_id_idx
    on public.conversation_participants (user_id, conversation_id);

create table if not exists public.messages (
    id bigint generated always as identity primary key,
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    sender_id uuid not null references auth.users (id) on delete cascade,
    content text not null check (char_length(trim(content)) between 1 and 4000),
    created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
    on public.messages (conversation_id, created_at desc);

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.conversations
    set last_message = left(new.content, 200),
        last_message_at = new.created_at
    where id = new.conversation_id;

    return new;
end;
$$;

drop trigger if exists on_message_update_conversation_preview on public.messages;
create trigger on_message_update_conversation_preview
    after insert on public.messages
    for each row execute function public.update_conversation_last_message();

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.conversation_participants participant
        where participant.conversation_id = target_conversation_id
          and participant.user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "Participants can view their conversations"
    on public.conversations;
create policy "Participants can view their conversations"
    on public.conversations for select
    to authenticated
    using (public.is_conversation_participant(id));

drop policy if exists "Users can view participants in their conversations"
    on public.conversation_participants;
create policy "Users can view participants in their conversations"
    on public.conversation_participants for select
    to authenticated
    using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants can view conversation messages"
    on public.messages;
create policy "Participants can view conversation messages"
    on public.messages for select
    to authenticated
    using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants can send messages as themselves"
    on public.messages;
create policy "Participants can send messages as themselves"
    on public.messages for insert
    to authenticated
    with check (
        sender_id = (select auth.uid())
        and public.is_conversation_participant(conversation_id)
    );

create or replace function public.open_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid := auth.uid();
    canonical_key text;
    conversation_uuid uuid;
begin
    if current_user_id is null then
        raise exception 'É necessário entrar na conta para iniciar uma conversa.';
    end if;

    if other_user_id is null or other_user_id = current_user_id then
        raise exception 'Selecione outra pessoa para iniciar a conversa.';
    end if;

    if not exists (
        select 1 from public.profiles where id = other_user_id
    ) then
        raise exception 'Este perfil não está disponível.';
    end if;

    canonical_key := least(current_user_id::text, other_user_id::text)
        || ':'
        || greatest(current_user_id::text, other_user_id::text);

    insert into public.conversations (direct_key)
    values (canonical_key)
    on conflict (direct_key) do nothing;

    select id
    into conversation_uuid
    from public.conversations
    where direct_key = canonical_key;

    insert into public.conversation_participants (conversation_id, user_id)
    values
        (conversation_uuid, current_user_id),
        (conversation_uuid, other_user_id)
    on conflict do nothing;

    return conversation_uuid;
end;
$$;

revoke all on function public.open_direct_conversation(uuid) from public;
grant execute on function public.open_direct_conversation(uuid) to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, username) on public.profiles to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant select, insert on public.messages to authenticated;

do $$
begin
    alter publication supabase_realtime add table public.messages;
exception
    when duplicate_object then null;
    when undefined_object then
        raise notice 'Publication supabase_realtime is unavailable; enable Realtime for public.messages in Supabase.';
end;
$$;
