-- consent.issue_access_grant is SECURITY DEFINER owned by sf_migrator and uses
-- SELECT ... FOR UPDATE to keep its authority check stable. PostgreSQL requires
-- UPDATE on at least one selected column for that row lock. Grant only the
-- non-authority timestamp column; runtime roles retain no UPDATE privilege.
grant update (updated_at)
on identity.assisted_context
to sf_migrator;
