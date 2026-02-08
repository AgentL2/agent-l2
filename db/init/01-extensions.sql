-- Enable useful PostgreSQL extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search improvements
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- JSON improvements
CREATE EXTENSION IF NOT EXISTS "jsonb_plperl" CASCADE;
