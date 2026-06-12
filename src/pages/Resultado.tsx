import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSorteio } from '@/lib/api';
import { AuditData, Participant } from '@/lib/types';
import { verifyResult, downloadCertificate, hashSeed } from '@/lib/audit';
import { formatInstagramUrl } from '@/lib/instagram';
import ConfettiEffect from '@/components/ConfettiEffect';
import { Shield, CheckCircle2, AlertTriangle, Download, Lock, Check, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Resultado: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawSorteio, setRawSorteio] = useState<any>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [verificationError, setVerificationError] = useState<string>('');

  // Carregar dados do sorteio
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSorteio(id)
      .then((data) => {
        if (!data || !data.sorteio) {
          setError('Sorteio não encontrado ou ID inválido.');
        } else {
          setRawSorteio(data.sorteio);
          setConfettiActive(true);
          setTimeout(() => setConfettiActive(false), 5000);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Falha ao conectar com o servidor para buscar o sorteio.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Converte do modelo de banco snake_case para camelCase
  const auditData = useMemo<AuditData | null>(() => {
    if (!rawSorteio) return null;

    // Trata JSONB que pode vir como string ou já parseado pelo banco
    let winners: Participant[] = [];
    try {
      winners = typeof rawSorteio.winners_json === 'string'
        ? JSON.parse(rawSorteio.winners_json)
        : rawSorteio.winners_json;
    } catch (e) {
      console.error(e);
    }

    let participants: Participant[] = [];
    try {
      participants = typeof rawSorteio.participants_json === 'string'
        ? JSON.parse(rawSorteio.participants_json)
        : rawSorteio.participants_json;
    } catch (e) {
      console.error(e);
    }

    return {
      id: rawSorteio.id,
      instagramUrl: rawSorteio.instagram_url || '',
      seedHex: rawSorteio.seed_hex,
      seedHash: rawSorteio.seed_hash,
      timestamp: rawSorteio.created_at || rawSorteio.timestamp,
      participants,
      totalParticipants: rawSorteio.total_participants || participants.length,
      winnerIndex: 0,
      winner: winners[0],
      numberOfWinners: rawSorteio.number_of_winners || winners.length,
      winners,
      winnerIndices: [],
      algorithm: rawSorteio.algorithm || 'Fisher-Yates + xorshift PRNG',
      version: rawSorteio.version || '1.0.0',
      organizerName: rawSorteio.organizer_name,
      raffleRules: rawSorteio.raffle_rules,
      logoUrl: rawSorteio.logo_url,
    };
  }, [rawSorteio]);

  // Executar re-verificação matemática no client-side
  const handleVerify = async () => {
    if (!auditData) return;
    setVerificationStatus('verifying');
    setVerificationError('');

    await new Promise((r) => setTimeout(r, 1200));

    try {
      // 1. Verificar Hash da Seed
      const computedHash = await hashSeed(auditData.seedHex);
      if (computedHash !== auditData.seedHash) {
        setVerificationStatus('failed');
        setVerificationError('A assinatura digital da seed não confere com o hash publicado.');
        return;
      }

      // 2. Verificar correspondência dos ganhadores
      const isCorrect = verifyResult(auditData.participants, auditData.seedHex, auditData.winners);
      if (isCorrect) {
        setVerificationStatus('verified');
      } else {
        setVerificationStatus('failed');
        setVerificationError('O embaralhamento matemático com esta Seed gera vencedores diferentes.');
      }
    } catch (e) {
      setVerificationStatus('failed');
      setVerificationError('Erro durante o cálculo de integridade.');
    }
  };

  const formattedDate = useMemo(() => {
    if (!auditData) return '';
    return new Date(auditData.timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  }, [auditData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-ig-pink/50 border-t-ig-pink animate-spin mx-auto" />
          <p className="text-white/60 text-sm animate-pulse">Carregando resultado oficial...</p>
        </div>
      </div>
    );
  }

  if (error || !auditData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full ig-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Sorteio não encontrado</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {error || 'Não foi possível encontrar os dados deste sorteio. Verifique se a URL está correta.'}
          </p>
          <Link
            to="/"
            className="inline-block py-2.5 px-5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 transition-all"
          >
            Ir para página inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ConfettiEffect active={confettiActive} duration={5000} />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl ig-gradient flex items-center justify-center text-base">
              🎰
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none">Sorteios 24h</h1>
              <p className="text-[10px] text-white/40 leading-none">no Insta</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Shield size={10} className="text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-semibold">Auditado</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        {/* Certificate Card Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden bg-emerald-500/20 border border-emerald-500/30 mb-3 animate-bounce-in shadow-lg">
            {auditData.logoUrl ? (
              <img src={auditData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🏆</span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white leading-tight">Resultado do Sorteio</h2>
          {auditData.organizerName && (
            <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
              Sorteador: <span className="ig-gradient-text font-black">{auditData.organizerName}</span>
            </p>
          )}
          <p className="text-xs text-white/40">Realizado em {formattedDate}</p>
        </div>

        {/* Winners Section */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-transparent to-ig-orange/15 shadow-xl animate-slide-in-up">
          <div className="absolute inset-0 ig-gradient opacity-5 pointer-events-none" />
          <div className="relative p-6 text-center space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-[10px] font-bold text-yellow-400 uppercase tracking-widest animate-pulse">
              🏆 {auditData.numberOfWinners > 1 ? 'Vencedores Oficiais' : 'Vencedor Oficial'}
            </span>

            <div className="space-y-4">
              {auditData.winners.map((winner, i) => (
                <div key={winner.id} className="space-y-1 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                  {auditData.numberOfWinners > 1 && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full">
                      {i + 1}º Lugar
                    </span>
                  )}
                  <p className="text-3xl font-black ig-gradient-text">@{winner.username}</p>
                  {winner.commentText && (
                    <p className="text-sm text-white/55 italic mt-1 leading-relaxed">
                      "{winner.commentText}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="ig-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Detalhes do Sorteio</h3>
          <div className="space-y-2.5">
            {[
              { label: 'Identificador único', value: auditData.id, mono: true },
              { label: 'Data e Hora oficial', value: formattedDate },
              { label: 'Total de Participantes', value: `${auditData.totalParticipants} usuários` },
              { label: 'Quantidade de Ganhadores', value: `${auditData.numberOfWinners} sorteado(s)` },
              { label: 'Algoritmo Utilizado', value: auditData.algorithm },
            ].map((item) => (
              <div key={item.label} className="flex justify-between gap-4 py-2 border-b border-white/5 last:border-0 items-start">
                <span className="text-xs text-white/40">{item.label}</span>
                <span className={cn(
                  'text-xs text-right break-all',
                  item.mono ? 'font-mono text-emerald-400' : 'text-white/80'
                )}>{item.value}</span>
              </div>
            ))}

            {auditData.instagramUrl && (
              <div className="flex justify-between gap-4 py-2 border-b border-white/5 last:border-0 items-center">
                <span className="text-xs text-white/40">Link do Post</span>
                <a
                  href={auditData.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ig-pink hover:text-white transition-colors flex items-center gap-1 font-semibold"
                >
                  Ver no Instagram
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Rules Card */}
        {auditData.raffleRules && (
          <div className="ig-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Regras Deste Sorteio</h3>
            <div className="text-xs text-white/60 bg-black/20 p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-white/5">
              {auditData.raffleRules}
            </div>
          </div>
        )}

        {/* Cryptographic Verification Card */}
        <div className="ig-card p-5 space-y-4 border-emerald-500/10 hover:border-emerald-500/30">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Auditoria de Legitimidade
            </span>
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            Este sorteio utilizou a tecnologia da WebCrypto API para gerar um resultado 100% aleatório e imutável. Você pode conferir os hashes e realizar a validação matemática instantânea.
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">SHA-256 da Seed (Público):</p>
              <div className="bg-black/40 rounded-lg px-3 py-2.5 font-mono text-[10px] text-emerald-400 break-all leading-relaxed border border-emerald-500/20">
                {auditData.seedHash}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Seed Hex (Revelado pós-sorteio):</p>
              <div className="bg-black/40 rounded-lg px-3 py-2.5 font-mono text-[10px] text-white/50 break-all leading-relaxed border border-white/10">
                {auditData.seedHex}
              </div>
            </div>
          </div>

          {/* Validation Box */}
          {verificationStatus === 'idle' && (
            <button
              onClick={handleVerify}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Validar Prova Matemática
            </button>
          )}

          {verificationStatus === 'verifying' && (
            <div className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-bold flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin" size={16} />
              Recalculando embaralhamento...
            </div>
          )}

          {verificationStatus === 'verified' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 animate-bounce-in shadow-inner">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check size={18} className="bg-emerald-500 text-black rounded-full p-0.5" />
                Sorteio Verificado com Sucesso!
              </div>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                A validação determinou que **SHA-256(seed_hex) confere perfeitamente** com o hash publicado. O algoritmo determinístico gerou exatamente o(s) mesmo(s) ganhador(es). Este resultado é matematicamente legítimo e auditável.
              </p>
            </div>
          )}

          {verificationStatus === 'failed' && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 space-y-2 animate-bounce-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle size={18} />
                Falha na Verificação
              </div>
              <p className="text-[11px] text-red-400/80 leading-relaxed">
                {verificationError}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => downloadCertificate(auditData)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-all"
          >
            <Download size={16} />
            Baixar Certificado (.json)
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl ig-btn-primary text-sm font-bold relative overflow-hidden"
          >
            <span>Criar Novo Sorteio</span>
            <div className="absolute inset-0 animate-shimmer" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center space-y-1 mt-auto">
        <p className="text-[11px] text-white/30 font-semibold">
          Sorteios 24h no Insta
        </p>
        <p className="text-[10px] text-white/20">
          Garantindo transparência absoluta e criptografia para sorteios em redes sociais.
        </p>
      </footer>
    </div>
  );
};

export default Resultado;
