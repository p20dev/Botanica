ALTER TABLE plants ADD COLUMN name text NOT NULL DEFAULT 'Velvetleaf' CHECK (char_length(name) BETWEEN 1 AND 60);
ALTER TABLE plants ADD COLUMN creation_source text NOT NULL DEFAULT 'designed' CHECK (creation_source IN ('designed','bred','demo'));
ALTER TABLE plants ADD COLUMN rarity_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;
