// ============================================================
// API: POST /api/sorteios — Salva registro de sorteio no Neon
// GET  /api/sorteios — Lista últimos sorteios (histórico)
// ============================================================

import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

type AuditWinner = {
  id: string;
  username: string;
  commentText: string;
};

type AuditParticipant = {
  id: string;
  username: string;
  commentText: string;
};

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return new Response(
      JSON.stringify({ error: 'DATABASE_URL não configurada' }),
      { status: 500, headers }
    );
  }

  const sql = neon(dbUrl);

  // Auto-migração silenciosa para suportar novos campos de marca
  try {
    await sql`ALTER TABLE sorteios ADD COLUMN IF NOT EXISTS organizer_name TEXT`;
    await sql`ALTER TABLE sorteios ADD COLUMN IF NOT EXISTS logo_url TEXT`;
    await sql`ALTER TABLE sorteios ADD COLUMN IF NOT EXISTS raffle_rules TEXT`;
  } catch (e) {
    console.warn('[Neon Auto-Migration] Warning:', e);
  }

  // ---- POST: salvar sorteio ----
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const {
        id,
        instagramUrl,
        seedHex,
        seedHash,
        totalParticipants,
        numberOfWinners,
        winners,
        participants,
        algorithm,
        version,
        timestamp,
        organizerName,
        logoUrl,
        raffleRules,
      } = body;

      if (!id || !seedHex || !seedHash || !totalParticipants || !winners || !participants) {
        return new Response(
          JSON.stringify({ error: 'Dados obrigatórios ausentes' }),
          { status: 400, headers }
        );
      }

      await sql`
        INSERT INTO sorteios (
          id, instagram_url, seed_hex, seed_hash,
          total_participants, number_of_winners,
          winners_json, participants_json,
          algorithm, version, created_at,
          organizer_name, logo_url, raffle_rules
        ) VALUES (
          ${id},
          ${instagramUrl || ''},
          ${seedHex},
          ${seedHash},
          ${totalParticipants},
          ${numberOfWinners || 1},
          ${JSON.stringify(winners)},
          ${JSON.stringify(participants)},
          ${algorithm || 'Fisher-Yates + xorshift PRNG'},
          ${version || '1.0.0'},
          ${timestamp || new Date().toISOString()},
          ${organizerName || ''},
          ${logoUrl || ''},
          ${raffleRules || ''}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      return new Response(
        JSON.stringify({ success: true, id }),
        { status: 201, headers }
      );
    } catch (err) {
      console.error('[POST /api/sorteios]', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar sorteio', detail: String(err) }),
        { status: 500, headers }
      );
    }
  }

  // ---- GET: listar sorteios ----
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
      const page = parseInt(url.searchParams.get('page') || '0');
      const offset = page * limit;

      const rows = await sql`
        SELECT
          id,
          instagram_url,
          seed_hash,
          total_participants,
          number_of_winners,
          winners_json,
          algorithm,
          version,
          created_at,
          organizer_name,
          logo_url,
          raffle_rules
        FROM sorteios
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const countResult = await sql`SELECT COUNT(*) as total FROM sorteios`;
      const total = parseInt(String(countResult[0]?.total || '0'));

      return new Response(
        JSON.stringify({
          sorteios: rows,
          total,
          page,
          limit,
          hasMore: offset + limit < total,
        }),
        { status: 200, headers }
      );
    } catch (err) {
      console.error('[GET /api/sorteios]', err);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar sorteios', detail: String(err) }),
        { status: 500, headers }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Método não suportado' }),
    { status: 405, headers }
  );
}
