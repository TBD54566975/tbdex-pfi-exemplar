-- migrate:up
ALTER TABLE offering ALTER COLUMN payoutcurrency TYPE CHAR(4);
ALTER TABLE offering ALTER COLUMN payincurrency TYPE CHAR(4);

-- migrate:down
ALTER TABLE offering ALTER COLUMN payoutcurrency TYPE CHAR(3);
ALTER TABLE offering ALTER COLUMN payincurrency TYPE CHAR(3);
