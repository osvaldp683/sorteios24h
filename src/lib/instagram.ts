// ============================================================
// Sorteios 24h no Insta — Instagram URL & Comment Parser
// ============================================================

import { Participant } from './types';

/**
 * Valida se a string é uma URL do Instagram
 */
export function isValidInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'www.instagram.com' ||
        parsed.hostname === 'instagram.com') &&
      (parsed.pathname.includes('/p/') ||
        parsed.pathname.includes('/reel/') ||
        parsed.pathname.includes('/tv/'))
    );
  } catch {
    return false;
  }
}

/**
 * Extrai o shortcode de uma URL do Instagram
 */
export function extractShortcode(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

/**
 * Formata URL do Instagram para exibição limpa
 */
export function formatInstagramUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `instagram.com${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
}

/**
 * Estratégias de parsing de comentários
 *
 * Suporta formatos:
 * 1. "@usuario: texto do comentário"
 * 2. "@usuario texto do comentário"
 * 3. "usuario: texto"
 * 4. Uma linha por participante (sem @, trata toda a linha como username)
 * 5. CSV: "usuario,comentário"
 */
export function parseComments(rawText: string): Participant[] {
  if (!rawText.trim()) return [];

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const participants: Participant[] = [];

  for (const line of lines) {
    // Formato CSV: usuario,comentário
    if (line.includes(',') && !line.startsWith('@')) {
      const parts = line.split(',');
      const username = parts[0].trim().replace(/^@/, '');
      const commentText = parts.slice(1).join(',').trim();
      if (username) {
        participants.push({
          id: generateId(),
          username: username.toLowerCase(),
          commentText: commentText || line,
        });
      }
      continue;
    }

    // Formato "@usuario: comentário" ou "@usuario comentário"
    const withAt = line.match(/^@?([A-Za-z0-9_.]+)[:\s]+(.+)$/);
    if (withAt) {
      const username = withAt[1].toLowerCase();
      const commentText = withAt[2].trim();
      participants.push({
        id: generateId(),
        username,
        commentText,
      });
      continue;
    }

    // Linha simples com @ = apenas username
    const justAt = line.match(/^@([A-Za-z0-9_.]+)$/);
    if (justAt) {
      participants.push({
        id: generateId(),
        username: justAt[1].toLowerCase(),
        commentText: '',
      });
      continue;
    }

    // Linha simples sem @ = trata como username ou comentário genérico
    const cleanLine = line.replace(/^@/, '').trim();
    if (cleanLine && !/\s{2,}/.test(cleanLine)) {
      // Username simples (sem muitos espaços)
      const usernameOnly = cleanLine.match(/^([A-Za-z0-9_.]+)$/);
      if (usernameOnly) {
        participants.push({
          id: generateId(),
          username: cleanLine.toLowerCase(),
          commentText: '',
        });
        continue;
      }
    }

    // Fallback: trata toda a linha como comentário de usuário anônimo
    if (cleanLine) {
      participants.push({
        id: generateId(),
        username: `participante_${participants.length + 1}`,
        commentText: cleanLine,
      });
    }
  }

  return participants;
}

/**
 * Remove participantes duplicados (mesmo username = apenas 1 chance)
 */
export function removeDuplicateParticipants(participants: Participant[]): Participant[] {
  const seen = new Set<string>();
  return participants.filter((p) => {
    if (seen.has(p.username.toLowerCase())) return false;
    seen.add(p.username.toLowerCase());
    return true;
  });
}

/**
 * Filtra participantes que contêm determinada palavra/hashtag no comentário
 */
export function filterByKeyword(participants: Participant[], keyword: string): Participant[] {
  if (!keyword.trim()) return participants;
  const lower = keyword.toLowerCase();
  return participants.filter(
    (p) =>
      p.commentText.toLowerCase().includes(lower) ||
      p.username.toLowerCase().includes(lower)
  );
}

/**
 * Gera ID único para participante
 */
function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Detecta tipo de post do Instagram pela URL
 */
export function detectPostType(url: string): 'post' | 'reel' | 'tv' | 'unknown' {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/tv/')) return 'tv';
  if (url.includes('/p/')) return 'post';
  return 'unknown';
}
