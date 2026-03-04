-- Enable PostgreSQL trigram extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on technologies.name for fast ILIKE searches
-- This enables efficient "contains" searches like '%query%'
CREATE INDEX IF NOT EXISTS technologies_name_trgm_idx
ON technologies USING GIN (name gin_trgm_ops);

-- Create GIN index on technologies.slug for fast ILIKE searches
-- Useful for fallback searches if name search doesn't yield results
CREATE INDEX IF NOT EXISTS technologies_slug_trgm_idx
ON technologies USING GIN (slug gin_trgm_ops);
