import React, { useState } from 'react';
import { AuditData } from '@/lib/types';
import { downloadCertificate, exportCertificate } from '@/lib/audit';
import { formatInstagramUrl } from '@/lib/instagram';
import { cn } from '@/lib/utils';
import { Download, Copy, CheckCircle2, Shield, RefreshCw, ExternalLink } from 'lucide-react';

interface AuditCertificateProps {
  auditData: AuditData;
  onNewRaffle: () => void;
}

const AuditCertificate: React.FC<AuditCertificateProps> = ({ auditData, onNewRaffle }) => {
  const [copied, setCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'result' | 'audit' | 'participants'>('result');

  const shareUrl = `${window.location.origin}/resultado/${auditData.id}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyAll = async () => {
    const cert = exportCertificate(auditData);
    await navigator.clipboard.writeText(cert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(auditData.seedHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const formattedDate = new Date(auditData.timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden bg-emerald-500/20 border border-emerald-500/30 mb-3 animate-bounce-in">
          {auditData.logoUrl ? (
            <img src={auditData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🏆</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">Certificado de Sorteio</h2>
        {auditData.organizerName && (
          <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Realizado por: <span className="ig-gradient-text font-black">{auditData.organizerName}</span>
          </p>
        )}
        <p className="text-white/40 text-xs">
          Sorteio concluído com auditabilidade total
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">Verificado Criptograficamente</span>
        </div>
      </div>

      {/* Winner highlight */}
      <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-transparent to-ig-orange/10">
        <div className="absolute inset-0 ig-gradient opacity-5" />
        <div className="relative p-5 text-center space-y-3">
          <p className="text-xs font-semibold text-yellow-400/80 uppercase tracking-widest">
            {auditData.numberOfWinners > 1 ? `${auditData.numberOfWinners} Ganhadores` : 'Ganhador'}
          </p>
          <div className="space-y-3">
            {auditData.winners.map((winner, i) => (
              <div key={winner.id} className="space-y-1">
                {auditData.numberOfWinners > 1 && (
                  <span className="text-xs text-white/40">
                    {['🥇', '🥈', '🥉'][i] || `${i + 1}º`}
                  </span>
                )}
                <p className="text-2xl font-black ig-gradient-text">@{winner.username}</p>
                {winner.commentText && (
                  <p className="text-sm text-white/40 italic">"{winner.commentText}"</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-white/30 pt-1">
            <span>📅 {formattedDate}</span>
            <span>•</span>
            <span>👥 {auditData.totalParticipants} participantes</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 p-1 gap-1">
        {[
          { id: 'result' as const, label: 'Resultado', icon: '🏆' },
          { id: 'audit' as const, label: 'Auditoria', icon: '🔐' },
          { id: 'participants' as const, label: 'Participantes', icon: '👥' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200',
              activeTab === tab.id
                ? 'ig-gradient text-white shadow-lg'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ig-card p-4 space-y-3 min-h-[200px]">
        {activeTab === 'result' && (
          <div className="space-y-3 animate-slide-in-up">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Detalhes do Sorteio</h3>
            {[
              { label: 'ID do Sorteio', value: auditData.id, mono: true },
              { label: 'Data e Hora', value: formattedDate },
              { label: 'Publicação Instagram', value: auditData.instagramUrl ? formatInstagramUrl(auditData.instagramUrl) : 'Não informado' },
              { label: 'Total de Participantes', value: String(auditData.totalParticipants) },
              { label: 'Quantidade de Ganhadores', value: String(auditData.numberOfWinners) },
              { label: 'Algoritmo', value: 'Fisher-Yates + xorshift PRNG' },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-white/40 flex-shrink-0">{item.label}</span>
                <span className={cn(
                  'text-xs text-right break-all',
                  item.mono ? 'font-mono text-emerald-400' : 'text-white/80'
                )}>{item.value}</span>
              </div>
            ))}
            {auditData.raffleRules && (
              <div className="pt-2 space-y-1.5 border-t border-white/5">
                <p className="text-xs text-white/40">Regras Aplicadas:</p>
                <p className="text-xs text-white/60 bg-black/20 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                  {auditData.raffleRules}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4 animate-slide-in-up">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Dados de Auditoria</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">SHA-256 da Seed:</p>
                <button
                  onClick={handleCopyHash}
                  className="flex items-center gap-1 text-xs text-ig-pink hover:text-white transition-colors"
                >
                  {hashCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  {hashCopied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="bg-black/40 rounded-lg px-3 py-2.5 font-mono text-[10px] text-emerald-400 break-all leading-relaxed border border-emerald-500/20">
                {auditData.seedHash}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-white/40">Seed Hex (para verificação):</p>
              <div className="bg-black/40 rounded-lg px-3 py-2.5 font-mono text-[10px] text-white/50 break-all leading-relaxed border border-white/10">
                {auditData.seedHex}
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-400">Como verificar este sorteio:</p>
              <ol className="space-y-1.5">
                {[
                  'Copie a lista de participantes da aba "Participantes"',
                  'Use a Seed Hex acima com o algoritmo Fisher-Yates + xorshift',
                  'Os N primeiros da lista embaralhada são os ganhadores',
                  'Confirme que SHA-256(seed_hex) = hash exibido acima',
                ].map((step, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-white/50">
                    <span className="text-emerald-400 font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                Lista de Participantes ({auditData.totalParticipants})
              </h3>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {auditData.participants.map((p, i) => {
                const isWinner = auditData.winners.some((w) => w.id === p.id);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all',
                      isWinner
                        ? 'bg-yellow-500/15 border border-yellow-500/30'
                        : 'bg-white/[0.03] border border-white/5'
                    )}
                  >
                    <span className="text-white/25 w-6 text-right flex-shrink-0">{i + 1}</span>
                    {isWinner && <span>🏆</span>}
                    <span className={cn('font-semibold', isWinner ? 'text-yellow-400' : 'text-white/60')}>
                      @{p.username}
                    </span>
                    {p.commentText && (
                      <span className="text-white/30 truncate flex-1">{p.commentText}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Shareable public link */}
      <div className="ig-card p-4 space-y-2.5 border-ig-pink/20 bg-ig-pink/5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/70">🔗 Link Público do Resultado</p>
          <button
            onClick={handleCopyLink}
            className="text-xs text-ig-pink hover:text-white transition-colors font-semibold flex items-center gap-1"
          >
            {linkCopied ? 'Link Copiado!' : 'Copiar Link'}
          </button>
        </div>
        <div className="bg-black/30 px-3 py-2 rounded-lg text-xs font-mono text-white/60 truncate border border-white/5 flex items-center justify-between gap-2">
          <span className="truncate">{shareUrl}</span>
          <a
            href={`/resultado/${auditData.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ig-pink hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
        <p className="text-[10px] text-white/35">Compartilhe esse link com os participantes para provar a identidade e legitimidade do sorteio.</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="download-certificate-btn"
          onClick={() => downloadCertificate(auditData)}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-all duration-200"
        >
          <Download size={16} />
          Baixar Certificado
        </button>
        <button
          id="copy-certificate-btn"
          onClick={handleCopyAll}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-all duration-200"
        >
          {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Copiado!' : 'Copiar JSON'}
        </button>
      </div>

      <button
        id="new-raffle-btn"
        onClick={onNewRaffle}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl ig-btn-primary font-bold text-base relative overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          <RefreshCw size={18} />
          Novo Sorteio
        </span>
        <div className="absolute inset-0 animate-shimmer" />
      </button>
    </div>
  );
};

export default AuditCertificate;
