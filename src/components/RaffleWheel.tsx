import React, { useState, useEffect, useRef } from 'react';
import { AuditData, Participant } from '@/lib/types';
import { drawWinners } from '@/lib/audit';
import { cn } from '@/lib/utils';
import { Shield, Zap, Lock } from 'lucide-react';

interface RaffleWheelProps {
  participants: Participant[];
  instagramUrl: string;
  numberOfWinners: number;
  organizerName?: string;
  logoUrl?: string;
  raffleRules?: string;
  onComplete: (auditData: AuditData) => void;
  onBack: () => void;
}

type RafflePhase = 'idle' | 'hashing' | 'spinning' | 'revealing' | 'done';

const RaffleWheel: React.FC<RaffleWheelProps> = ({
  participants,
  instagramUrl,
  numberOfWinners,
  organizerName,
  logoUrl,
  raffleRules,
  onComplete,
  onBack,
}) => {
  const [phase, setPhase] = useState<RafflePhase>('idle');
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const [seedHash, setSeedHash] = useState<string>('');
  const [winners, setWinners] = useState<Participant[]>([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const auditRef = useRef<AuditData | null>(null);

  const generatePreviewHash = () => {
    // Show a "computing" hash before real one
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  };

  const startRaffle = async () => {
    if (phase !== 'idle') return;
    setPhase('hashing');

    // Animate hash computation
    let hashAnimCount = 0;
    const hashAnim = setInterval(() => {
      setSeedHash(generatePreviewHash());
      hashAnimCount++;
      if (hashAnimCount > 12) clearInterval(hashAnim);
    }, 80);

    await new Promise((r) => setTimeout(r, 1200));
    clearInterval(hashAnim);

    // Run actual crypto draw
    const auditData = await drawWinners(
      participants,
      numberOfWinners,
      instagramUrl,
      organizerName,
      raffleRules,
      logoUrl
    );
    auditRef.current = auditData;
    setSeedHash(auditData.seedHash);

    await new Promise((r) => setTimeout(r, 600));
    setPhase('spinning');

    // Slot machine animation
    const allNames = participants.map((p) => p.username);
    let spinCount = 0;
    const totalSpins = 40;

    spinIntervalRef.current = setInterval(() => {
      const randomNames = Array.from({ length: 8 }, () =>
        allNames[Math.floor(Math.random() * allNames.length)]
      );
      setDisplayNames(randomNames);
      spinCount++;

      // Slow down near end
      if (spinCount > totalSpins * 0.7) {
        const delay = 60 + (spinCount - totalSpins * 0.7) * 15;
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = setInterval(() => {
          const randomNames2 = Array.from({ length: 8 }, () =>
            allNames[Math.floor(Math.random() * allNames.length)]
          );
          setDisplayNames(randomNames2);
          spinCount++;
          if (spinCount >= totalSpins) {
            clearInterval(spinIntervalRef.current);
            setPhase('revealing');
            setTimeout(() => {
              setWinners(auditData.winners);
              setPhase('done');
              setTimeout(() => onComplete(auditData), 1500);
            }, 800);
          }
        }, delay);
      }

      if (spinCount >= totalSpins * 0.7) {
        // handled above
      }
    }, 60);
  };

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  const phaseLabels: Record<RafflePhase, string> = {
    idle: 'Pronto para sortear',
    hashing: '🔐 Gerando seed criptográfica...',
    spinning: '🎰 Sorteando...',
    revealing: '✨ Revelando ganhador...',
    done: '🏆 Concluído!',
  };

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className={cn(
          'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 transition-all duration-500 overflow-hidden bg-white/5 border border-white/10',
          phase === 'done' ? 'scale-125 glow-orange' : '',
          phase === 'idle' ? 'animate-float' : 'animate-pulse-glow'
        )}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{phase === 'done' ? '🏆' : '🎰'}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">
          {phase === 'done' ? 'Sorteio Concluído!' : 'Realizar Sorteio'}
        </h2>
        {organizerName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Organizado por: <span className="ig-gradient-text font-black">{organizerName}</span>
          </p>
        )}
        <p className="text-white/40 text-xs">{phaseLabels[phase]}</p>
      </div>

      {/* Audit Info Panel */}
      <div className="ig-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={15} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Auditabilidade Criptográfica
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Lock size={14} />, label: 'WebCrypto API', sublabel: 'Seed aleatória' },
            { icon: <Shield size={14} />, label: 'SHA-256', sublabel: 'Hash verificável' },
            { icon: <Zap size={14} />, label: 'Fisher-Yates', sublabel: 'Algoritmo justo' },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 rounded-xl p-2.5 space-y-1">
              <div className="text-emerald-400 flex justify-center">{item.icon}</div>
              <p className="text-xs font-semibold text-white">{item.label}</p>
              <p className="text-[10px] text-white/40">{item.sublabel}</p>
            </div>
          ))}
        </div>

        {/* Hash display */}
        {seedHash && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">SHA-256 da Seed:</p>
            <div className="bg-black/30 rounded-lg px-3 py-2 font-mono text-[10px] text-emerald-400 break-all leading-relaxed border border-emerald-500/20">
              {seedHash}
            </div>
          </div>
        )}
      </div>

      {/* Slot Machine Display */}
      <div className={cn(
        'relative rounded-2xl overflow-hidden border transition-all duration-500',
        phase === 'spinning' && 'border-ig-pink/50 shadow-[0_0_30px_hsla(330,100%,60%,0.3)]',
        phase === 'done' && 'border-yellow-500/50 shadow-[0_0_30px_hsla(45,100%,55%,0.3)]',
        phase === 'idle' || phase === 'hashing' ? 'border-white/10' : ''
      )}>
        {/* Top bar */}
        <div className={cn(
          'h-1 w-full transition-all duration-300',
          phase === 'spinning' ? 'ig-gradient animate-gradient-shift' : 'bg-white/10'
        )} />

        <div className="bg-black/40 backdrop-blur-sm p-6">
          {phase === 'idle' && (
            <div className="text-center py-4 space-y-3">
              <div className="text-5xl animate-float">🎰</div>
              <p className="text-white/40 text-sm">
                {participants.length} participante{participants.length !== 1 ? 's' : ''} •{' '}
                {numberOfWinners} ganhador{numberOfWinners !== 1 ? 'es' : ''}
              </p>
            </div>
          )}

          {phase === 'hashing' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-ig-pink/50 border-t-ig-pink animate-spin mx-auto" />
              <p className="text-white/60 text-sm">Gerando entropia criptográfica...</p>
            </div>
          )}

          {(phase === 'spinning' || phase === 'revealing') && (
            <div className="relative h-40 overflow-hidden">
              {/* Fade masks */}
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

              {/* Center highlight */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-10 rounded-lg border border-ig-pink/40 bg-ig-pink/5 z-10 pointer-events-none" />

              {/* Scrolling names */}
              <div className={cn(
                'space-y-2 px-4 transition-all',
                phase === 'spinning' && 'animate-slot-spin'
              )}>
                {displayNames.map((name, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-10 flex items-center justify-center text-sm font-semibold rounded-lg transition-all',
                      i === 3 ? 'ig-gradient-text text-base font-black' : 'text-white/40'
                    )}
                  >
                    @{name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'done' && winners.length > 0 && (
            <div className="text-center space-y-4 py-2">
              <div className="space-y-3">
                {winners.map((winner, i) => (
                  <div
                    key={winner.id}
                    className="animate-winner-reveal"
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    {winners.length > 1 && (
                      <p className="text-xs text-white/40 mb-1">
                        {i + 1}º Ganhador{i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : ' 🥉'}
                      </p>
                    )}
                    <div className="ig-card p-4 border-yellow-500/30 bg-yellow-500/5">
                      <div className="w-14 h-14 rounded-full ig-gradient flex items-center justify-center text-2xl font-black text-white mx-auto mb-2 glow-pink">
                        {winner.username.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xl font-black ig-gradient-text">@{winner.username}</p>
                      {winner.commentText && (
                        <p className="text-xs text-white/40 mt-1 italic">"{winner.commentText}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules & Info */}
      <div className="space-y-4">
        {/* Participants info */}
        <div className="flex items-center justify-center gap-4 text-xs text-white/30">
          <span>👥 {participants.length} participantes</span>
          <span>•</span>
          <span>🏆 {numberOfWinners} ganhador{numberOfWinners !== 1 ? 'es' : ''}</span>
          <span>•</span>
          <span>🔐 100% auditável</span>
        </div>

        {raffleRules && (
          <div className="text-center max-w-sm mx-auto">
            <button
              onClick={() => setShowRules(!showRules)}
              className="text-[11px] font-semibold text-ig-pink hover:text-white underline underline-offset-2 transition-colors"
            >
              {showRules ? 'Ocultar Regras' : 'Ver Regras do Sorteio'}
            </button>
            {showRules && (
              <div className="mt-2 text-left bg-white/[0.03] border border-white/5 p-3 rounded-xl max-h-32 overflow-y-auto text-xs text-white/50 whitespace-pre-wrap leading-relaxed">
                {raffleRules}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {phase === 'idle' && (
          <button
            onClick={onBack}
            className="flex-1 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all duration-200"
          >
            ← Voltar
          </button>
        )}
        {phase === 'idle' && (
          <button
            id="draw-button"
            onClick={startRaffle}
            className="flex-[2] py-4 px-6 rounded-xl ig-btn-primary font-black text-base relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              🎰 Realizar Sorteio
            </span>
            <div className="absolute inset-0 animate-shimmer" />
          </button>
        )}
        {(phase === 'hashing' || phase === 'spinning' || phase === 'revealing') && (
          <div className="w-full py-4 px-6 rounded-xl bg-white/5 border border-white/10 text-center text-white/40 text-sm font-semibold">
            ⏳ Sorteando...
          </div>
        )}
      </div>
    </div>
  );
};

export default RaffleWheel;
