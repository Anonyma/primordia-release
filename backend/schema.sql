CREATE TABLE IF NOT EXISTS application_submissions (
 id uuid PRIMARY KEY,
 fingerprint text NOT NULL,
 envelope jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS application_outbox (
 id uuid PRIMARY KEY REFERENCES application_submissions(id),
 state text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0,
 next_attempt timestamptz NOT NULL DEFAULT now(),
 record_id text,
 last_error text,
 synced_at timestamptz
);
CREATE TABLE IF NOT EXISTS application_rate_limits (
 bucket text PRIMARY KEY,
 count integer NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE OR REPLACE FUNCTION protect_application_original() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Original applications are immutable; use the approved retention procedure'; END;
$$;
DROP TRIGGER IF EXISTS protect_original ON application_submissions;
CREATE TRIGGER protect_original BEFORE UPDATE OR DELETE ON application_submissions
FOR EACH ROW EXECUTE FUNCTION protect_application_original();
