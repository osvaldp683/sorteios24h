// ============================================================
// Sorteios 24h no Insta — Audit Module
// Criptografia real com WebCrypto API para auditabilidade
// ============================================================

import { AuditData, Participant } from './types';

/**
 * Gera uma seed criptograficamente segura (32 bytes = 64 hex chars)
 */
export function generateSeed(): Uint8Array {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return seed;
}

/**
 * Converte Uint8Array para string hexadecimal
 */
export function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calcula SHA-256 da seed e retorna como hex
 */
export async function hashSeed(seedHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seedHex);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converte seed hex para array de números para uso no PRNG
 */
function hexToNumbers(hex: string): number[] {
  const nums: number[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    nums.push(parseInt(hex.slice(i, i + 8), 16));
  }
  return nums;
}

/**
 * PRNG determinístico (xorshift) baseado na seed
 * Permite auditabilidade: mesma seed = mesmo resultado
 */
class SeededRNG {
  private state: number[];
  private index: number = 0;

  constructor(seedHex: string) {
    this.state = hexToNumbers(seedHex);
    if (this.state.length < 4) {
      while (this.state.length < 4) {
        this.state.push(0xdeadbeef);
      }
    }
  }

  next(): number {
    let x = this.state[this.index % this.state.length];
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state[this.index % this.state.length] = x;
    this.index++;
    // Normaliza para [0, 1)
    return (x >>> 0) / 0x100000000;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Embaralha participantes usando Fisher-Yates com seed determinística
 */
export function shuffleWithSeed(participants: Participant[], seedHex: string): Participant[] {
  const arr = [...participants];
  const rng = new SeededRNG(seedHex);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Seleciona N ganhadores de forma auditável
 */
export async function drawWinners(
  participants: Participant[],
  numberOfWinners: number,
  instagramUrl: string,
  organizerName?: string,
  raffleRules?: string,
  logoUrl?: string
): Promise<AuditData> {
  const seed = generateSeed();
  const seedHex = uint8ToHex(seed);
  const seedHash = await hashSeed(seedHex);
  const timestamp = new Date().toISOString();

  const shuffled = shuffleWithSeed(participants, seedHex);
  const winners = shuffled.slice(0, numberOfWinners);
  const winnerIndices = winners.map((w) =>
    participants.findIndex((p) => p.id === w.id)
  );

  const auditData: AuditData = {
    id: `sort_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    instagramUrl,
    seedHex,
    seedHash,
    timestamp,
    participants,
    totalParticipants: participants.length,
    winnerIndex: winnerIndices[0],
    winner: winners[0],
    numberOfWinners,
    winners,
    winnerIndices,
    algorithm: 'Fisher-Yates com xorshift PRNG + WebCrypto seed (SHA-256)',
    version: '1.0.0',
    organizerName,
    raffleRules,
    logoUrl,
  };

  return auditData;
}

/**
 * Verifica se um resultado é válido dado a seed e lista de participantes
 */
export function verifyResult(
  participants: Participant[],
  seedHex: string,
  claimedWinners: Participant[]
): boolean {
  const shuffled = shuffleWithSeed(participants, seedHex);
  const computedWinners = shuffled.slice(0, claimedWinners.length);
  return computedWinners.every((w, i) => w.id === claimedWinners[i].id);
}

/**
 * Exporta certificado de auditoria como JSON formatado
 */
export function exportCertificate(auditData: AuditData): string {
  const certificate = {
    titulo: 'CERTIFICADO DE SORTEIO — Sorteios 24h no Insta',
    versao: auditData.version,
    id: auditData.id,
    data_hora: auditData.timestamp,
    publicacao_instagram: auditData.instagramUrl,
    organizador: auditData.organizerName || undefined,
    logo: auditData.logoUrl || undefined,
    regras: auditData.raffleRules || undefined,
    ganhadores: auditData.winners.map((w) => ({
      usuario: w.username,
      comentario: w.commentText,
    })),
    total_participantes: auditData.totalParticipants,
    auditoria: {
      seed_hex: auditData.seedHex,
      seed_sha256: auditData.seedHash,
      algoritmo: auditData.algorithm,
      instrucoes_verificacao: [
        '1. Copie a lista completa de participantes abaixo',
        '2. Use a seed_hex para reproduzir o embaralhamento (Fisher-Yates com xorshift PRNG)',
        '3. Os N primeiros da lista embaralhada são os ganhadores',
        '4. Verifique que SHA-256(seed_hex) === seed_sha256',
      ],
    },
    participantes: auditData.participants.map((p) => ({
      usuario: p.username,
      comentario: p.commentText,
    })),
  };
  return JSON.stringify(certificate, null, 2);
}

/**
 * Baixa o certificado como arquivo JSON
 */
export function downloadCertificate(auditData: AuditData): void {
  const json = exportCertificate(auditData);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificado-sorteio-${auditData.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
