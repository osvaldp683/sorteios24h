// ============================================================
// API: GET /api/instagram/comments?url=...&max_comments=...
// Busca comentários de um post do Instagram via RapidAPI
// Variável de ambiente necessária: RAPIDAPI_KEY
// ============================================================

export const config = {
  runtime: 'edge',
};

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
        hint: 'Configure a variável de ambiente RAPIDAPI_KEY no Vercel com sua chave do RapidAPI',
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

  const shortcode = shortcodeMatch[2];

  try {
    const allComments: { username: string; text: string; id: string }[] = [];
    let nextCursor: string | null = null;
    let page = 0;
    const MAX_PAGES = Math.ceil(maxComments / 12); // ~12 comments per page

    do {
      const apiUrl = new URL('https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php');
      apiUrl.searchParams.set('media_code', shortcode);
      apiUrl.searchParams.set('sort_order', 'recent');
      if (nextCursor) {
        apiUrl.searchParams.set('pagination_token', nextCursor);
      }

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        if (page === 0) {
          if (response.status === 403 || response.status === 401) {
            return new Response(
              JSON.stringify({
                error: 'Chave da API inválida ou sem permissão',
                hint: 'Verifique sua RAPIDAPI_KEY.',
              }),
              { status: 403, headers }
            );
          }
          if (response.status === 429) {
            return new Response(
              JSON.stringify({
                error: 'Limite de requisições atingido',
                hint: 'Aguarde alguns segundos e tente novamente.',
              }),
              { status: 429, headers }
            );
          }
          return new Response(
            JSON.stringify({ error: `Erro na API do Instagram: ${response.status}`, detail: errText }),
            { status: 502, headers }
          );
        }
        break; // Ignora erros em páginas subsequentes e retorna o que já temos
      }

      const data: any = await response.json();

      // Dependendo da estrutura da resposta, pegamos os itens
      const items = data.data?.items || data.items || data.comments || data.data?.comments || data.data || [];

      if (!items || items.length === 0) {
        break;
      }

      for (const item of items) {
        if (allComments.length >= maxComments) break;
        const username = item.user?.username || item.owner?.username || item.username;
        const text = item.text || item.comment_text;
        if (username && text) {
          allComments.push({
            id: item.id || item.pk || `${username}_${allComments.length}`,
            username: username.toLowerCase(),
            text: text.trim(),
          });
        }
      }

      // Procura pelo token de paginação na resposta (vários formatos suportados)
      nextCursor = data.pagination_token || data.data?.pagination_token || data.next_page || data.data?.next_page || data.end_cursor || data.data?.end_cursor || data.next_min_id || data.data?.next_min_id || null;
      
      // Alguns payloads usam 'has_more' ou algo similar
      const hasMore = data.has_next_page !== false && data.data?.has_next_page !== false;
      if (!hasMore && !nextCursor) {
        nextCursor = null;
      }

      page++;

      if (nextCursor && allComments.length < maxComments) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } while (nextCursor && allComments.length < maxComments && page < MAX_PAGES);

    return new Response(
      JSON.stringify({
        success: true,
        total: allComments.length,
        hasMore: nextCursor !== null && allComments.length >= maxComments,
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
