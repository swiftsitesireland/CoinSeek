alter table profiles
  add column if not exists plan text not null default 'free',
  add column if not exists trial_started_at timestamptz;
