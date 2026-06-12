// ============================================================
// Sorteios 24h no Insta — Shared Types
// ============================================================

export interface Participant {
  id: string;
  username: string;
  commentText: string;
}

export interface AuditData {
  id: string;
  instagramUrl: string;
  seedHex: string;
  seedHash: string;
  timestamp: string;
  participants: Participant[];
  totalParticipants: number;
  winnerIndex: number;
  winner: Participant;
  numberOfWinners: number;
  winners: Participant[];
  winnerIndices: number[];
  algorithm: string;
  version: string;
  organizerName?: string;
  raffleRules?: string;
  logoUrl?: string;
}

export interface SorteioRecord {
  id: string;
  instagram_url: string;
  seed_hex: string;
  seed_hash: string;
  total_participants: number;
  winners_json: string;
  participants_json: string;
  algorithm: string;
  created_at: string;
}

export type AppStep = 'import' | 'review' | 'raffle' | 'result';

export interface AppState {
  currentStep: AppStep;
  instagramUrl: string;
  participants: Participant[];
  filteredParticipants: Participant[];
  removeDuplicates: boolean;
  numberOfWinners: number;
  auditData: AuditData | null;
  isRaffling: boolean;
  organizerName?: string;
  raffleRules?: string;
  logoUrl?: string;
}
