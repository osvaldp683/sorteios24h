// ============================================================
// Sorteios 24h no Insta — API Client (Neon via Vercel Edge)
// ============================================================

import { AuditData } from './types';

const BASE_URL = '/api';

/**
 * Salva o resultado do sorteio no banco de dados Neon via API
 */
export async function saveSorteio(auditData: AuditData): Promise<{ success: boolean; id: string }> {
  try {
    const res = await fetch(`${BASE_URL}/sorteios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: auditData.id,
        instagramUrl: auditData.instagramUrl,
        seedHex: auditData.seedHex,
        seedHash: auditData.seedHash,
        totalParticipants: auditData.totalParticipants,
        numberOfWinners: auditData.numberOfWinners,
        winners: auditData.winners,
        participants: auditData.participants,
        algorithm: auditData.algorithm,
        version: auditData.version,
        timestamp: auditData.timestamp,
        organizerName: auditData.organizerName,
        raffleRules: auditData.raffleRules,
        logoUrl: auditData.logoUrl,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[saveSorteio] API error:', err);
      return { success: false, id: auditData.id };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[saveSorteio] Network error:', err);
    // Não bloqueia o sorteio se o banco falhar
    return { success: false, id: auditData.id };
  }
}

/**
 * Lista os últimos sorteios (histórico público)
 */
export async function listSorteios(limit = 20, page = 0) {
  try {
    const res = await fetch(`${BASE_URL}/sorteios?limit=${limit}&page=${page}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Busca um sorteio específico por ID (para verificação/auditoria)
 */
export async function getSorteio(id: string) {
  try {
    const res = await fetch(`${BASE_URL}/sorteios/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
