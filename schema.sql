-- ============================================================
-- Sorteios 24h no Insta — Neon PostgreSQL Schema
-- Execute este script no seu banco Neon
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela principal de sorteios
CREATE TABLE IF NOT EXISTS sorteios (
  id TEXT PRIMARY KEY,
  instagram_url TEXT,
  seed_hex TEXT NOT NULL,
  seed_hash TEXT NOT NULL,
  total_participants INTEGER NOT NULL,
  number_of_winners INTEGER NOT NULL DEFAULT 1,
  winners_json JSONB NOT NULL,
  participants_json JSONB NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  organizer_name TEXT,
  logo_url TEXT,
  raffle_rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_sorteios_created_at ON sorteios (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sorteios_seed_hash ON sorteios (seed_hash);
CREATE INDEX IF NOT EXISTS idx_sorteios_instagram_url ON sorteios (instagram_url);

-- View para histórico público (sem seed_hex por segurança pós-sorteio)
CREATE OR REPLACE VIEW sorteios_publico AS
SELECT
  id,
  instagram_url,
  seed_hash,
  total_participants,
  number_of_winners,
  winners_json,
  algorithm,
  version,
  organizer_name,
  logo_url,
  raffle_rules,
  created_at
FROM sorteios
ORDER BY created_at DESC;

-- Comentários
COMMENT ON TABLE sorteios IS 'Registros auditáveis de sorteios realizados';
COMMENT ON COLUMN sorteios.seed_hex IS 'Seed criptográfica em hexadecimal — mantida para auditoria';
COMMENT ON COLUMN sorteios.seed_hash IS 'SHA-256 da seed — publicado antes do sorteio';
COMMENT ON COLUMN sorteios.winners_json IS 'Array JSON com dados dos ganhadores';
COMMENT ON COLUMN sorteios.participants_json IS 'Array JSON com todos os participantes';
