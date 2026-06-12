// ============================================================
// API: GET /api/sorteios/[id] — Busca sorteio por ID
// ============================================================

import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não suportado' }), {
      status: 405,
      headers,
    });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'DATABASE_URL não configurada' }), {
      status: 500,
      headers,
    });
  }

  // Extract ID from URL
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1];

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID não informado' }), {
      status: 400,
      headers,
    });
  }

  try {
    const sql = neon(dbUrl);
    const rows = await sql`
      SELECT
        id,
        instagram_url,
        seed_hex,
        seed_hash,
        total_participants,
        number_of_winners,
        winners_json,
        participants_json,
        algorithm,
        version,
        created_at,
        organizer_name,
        logo_url,
        raffle_rules
      FROM sorteios
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Sorteio não encontrado' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify({ sorteio: rows[0] }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[GET /api/sorteios/[id]]', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar sorteio', detail: String(err) }),
      { status: 500, headers }
    );
  }
}
