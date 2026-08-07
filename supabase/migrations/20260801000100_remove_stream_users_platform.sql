alter table public."streamUsers"
  drop constraint streamusers_login_platform_unique,
  drop column platform,
  add constraint streamusers_login_unique unique (login);
