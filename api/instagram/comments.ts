// ============================================================
// API: GET /api/instagram/comments?url=...&max_comments=...
// Busca comentários de um post do Instagram via RapidAPI
// Variável de ambiente necessária: RAPIDAPI_KEY
// ============================================================

export const config = {
  runtime: 'edge',
};

interface RapidAPIComment {
  id?: string;
  pk?: string;
  user?: {
    username?: string;
    pk?: string;
  };
  text?: string;
  timestamp?: number;
  like_count?: number;
}

interface RapidAPIResponse {
  data?: {
    items?: RapidAPIComment[];
    next_page?: string | null;
    next_min_id?: string | null;
    count?: number;
  };
  status?: string;
  message?: string;
}

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não suportado' }), {
      status: 405,
      headers,
    });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'RAPIDAPI_KEY não configurada',
        hint: 'Configure a variável de ambiente RAPIDAPI_KEY no Vercel com sua chave do RapidAPI (instagram-scraper21)',
      }),
      { status: 503, headers }
    );
  }

  const url = new URL(req.url);
  const postUrl = url.searchParams.get('url');
  const maxComments = Math.min(
    parseInt(url.searchParams.get('max_comments') || '500'),
    5000
  );

  if (!postUrl) {
    return new Response(
      JSON.stringify({ error: 'Parâmetro "url" é obrigatório' }),
      { status: 400, headers }
    );
  }

  // Extrai o shortcode da URL do Instagram
  const shortcodeMatch = postUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!shortcodeMatch) {
    return new Response(
      JSON.stringify({ error: 'URL do Instagram inválida. Use um link de post, reel ou IGTV.' }),
      { status: 400, headers }
    );
  }

  const codeOrUrl = encodeURIComponent(postUrl.split('?')[0].replace(/\/$/, ''));

  try {
    const allComments: { username: string; text: string; id: string }[] = [];
    let nextMinId: string | null = null;
    let page = 0;
    const MAX_PAGES = Math.ceil(maxComments / 12); // ~12 comments per page

    do {
      const apiUrl = new URL('https://instagram-scraper21.p.rapidapi.com/api/v1/post/comments');
      apiUrl.searchParams.set('code_or_id_or_url', decodeURIComponent(codeOrUrl));
      if (nextMinId) {
        apiUrl.searchParams.set('min_id', nextMinId);
      }

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper21.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        // Se a primeira página falhar, retorna erro
        if (page === 0) {
          if (response.status === 403 || response.status === 401) {
            return new Response(
              JSON.stringify({
                error: 'Chave da API inválida ou sem permissão',
                hint: 'Verifique sua RAPIDAPI_KEY e se está inscrito na API instagram-scraper21',
              }),
              { status: 403, headers }
            );
          }
          if (response.status === 429) {
            return new Response(
              JSON.stringify({
                error: 'Limite de requisições atingido',
                hint: 'Aguarde alguns segundos e tente novamente, ou atualize seu plano no RapidAPI',
              }),
              { status: 429, headers }
            );
          }
          return new Response(
            JSON.stringify({ error: `Erro na API do Instagram: ${response.status}`, detail: errText }),
            { status: 502, headers }
          );
        }
        // Se páginas subsequentes falharem, retorna o que temos
        break;
      }

      const data: RapidAPIResponse = await response.json();

      if (!data.data?.items) {
        break;
      }

      for (const item of data.data.items) {
        if (allComments.length >= maxComments) break;
        const username = item.user?.username;
        const text = item.text;
        if (username && text) {
          allComments.push({
            id: item.id || item.pk || `${username}_${allComments.length}`,
            username: username.toLowerCase(),
            text: text.trim(),
          });
        }
      }

      nextMinId = data.data.next_min_id || data.data.next_page || null;
      page++;

      // Pequeno delay para não sobrecarregar a API
      if (nextMinId && allComments.length < maxComments) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } while (nextMinId && allComments.length < maxComments && page < MAX_PAGES);

    return new Response(
      JSON.stringify({
        success: true,
        total: allComments.length,
        hasMore: nextMinId !== null && allComments.length >= maxComments,
        comments: allComments,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[GET /api/instagram/comments]', err);
    return new Response(
      JSON.stringify({
        error: 'Erro ao buscar comentários',
        detail: String(err),
      }),
      { status: 500, headers }
    );
  }
}
