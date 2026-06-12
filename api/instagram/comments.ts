// ============================================================
// API: GET /api/instagram/comments?url=...&max_comments=...&cursor=...
// Busca comentários de um post do Instagram via RapidAPI
// Variável de ambiente necessária: RAPIDAPI_KEY
// ============================================================

export const config = {
  runtime: 'edge',
};

// Converte o shortcode do Instagram para o ID numérico exigido pela nova API
function shortcodeToMediaId(shortcode: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
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
        hint: 'Configure a variável de ambiente RAPIDAPI_KEY no Vercel com sua chave do RapidAPI',
      }),
      { status: 503, headers }
    );
  }

  const url = new URL(req.url);
  const postUrl = url.searchParams.get('url');
  const startCursor = url.searchParams.get('cursor');

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
  let mediaId: string;
  try {
    mediaId = shortcodeToMediaId(shortcode);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Falha ao converter a URL para Media ID interno do Instagram.' }),
      { status: 400, headers }
    );
  }

  try {
    const allComments: { username: string; text: string; id: string }[] = [];
    let nextCursor: string | null = startCursor || null;

    const apiUrl = new URL('https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments');
    apiUrl.searchParams.set('id', mediaId);
    
    if (nextCursor) {
      apiUrl.searchParams.set('min_id', nextCursor);
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
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

    const data: any = await response.json();

    const items = data.data?.items || data.items || data.comments || data.data?.comments || data.data || [];

    if (items && items.length > 0) {
      for (const item of items) {
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
    }

    let parsedNextCursor = null;
    if (data.next_min_id) {
      parsedNextCursor = typeof data.next_min_id === 'object' ? JSON.stringify(data.next_min_id) : String(data.next_min_id);
    } else if (data.data?.next_min_id) {
      parsedNextCursor = typeof data.data.next_min_id === 'object' ? JSON.stringify(data.data.next_min_id) : String(data.data.next_min_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: allComments.length,
        hasMore: parsedNextCursor !== null,
        nextCursor: parsedNextCursor,
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
