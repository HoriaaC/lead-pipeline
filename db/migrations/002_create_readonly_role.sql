-- 002: read-only role for the MCP server (step 6).
-- The MCP server connects as this role, so it physically cannot write,
-- whatever the agent asks for.
-- No password here: migrations are committed. Set it once by hand:
--   alter role leads_reader password '...';
create role leads_reader login;
grant usage on schema public to leads_reader;
grant select on leads to leads_reader;

-- RLS is on for leads with no policies (001). The table owner bypasses RLS, but this
-- role doesn't: without a policy it would silently see 0 rows instead of an error.
create policy leads_reader_select on leads for select to leads_reader using (true);
