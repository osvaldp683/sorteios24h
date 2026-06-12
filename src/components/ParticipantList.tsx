import React, { useState, useMemo } from 'react';
import { Search, Trash2, Users, Filter, ChevronUp, ChevronDown, UserX, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Participant } from '@/lib/types';
import { removeDuplicateParticipants, filterByKeyword } from '@/lib/instagram';

interface ParticipantListProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  removeDuplicates: boolean;
  onRemoveDuplicatesChange: (value: boolean) => void;
  numberOfWinners: number;
  onNumberOfWinnersChange: (value: number) => void;
  organizerName: string;
  onOrganizerNameChange: (value: string) => void;
  logoUrl: string;
  onLogoUrlChange: (value: string) => void;
  raffleRules: string;
  onRaffleRulesChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  onParticipantsChange,
  removeDuplicates,
  onRemoveDuplicatesChange,
  numberOfWinners,
  onNumberOfWinnersChange,
  organizerName,
  onOrganizerNameChange,
  logoUrl,
  onLogoUrlChange,
  raffleRules,
  onRaffleRulesChange,
  onNext,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showBranding, setShowBranding] = useState(false);

  const filteredParticipants = useMemo(() => {
    let list = participants.filter((p) => !removedIds.has(p.id));
    if (removeDuplicates) list = removeDuplicateParticipants(list);
    if (searchQuery) list = filterByKeyword(list, searchQuery);
    return list;
  }, [participants, removedIds, removeDuplicates, searchQuery]);

  const activeParticipants = useMemo(() => {
    let list = participants.filter((p) => !removedIds.has(p.id));
    if (removeDuplicates) list = removeDuplicateParticipants(list);
    return list;
  }, [participants, removedIds, removeDuplicates]);

  const handleRemove = (id: string) => {
    const newRemoved = new Set(removedIds);
    newRemoved.add(id);
    setRemovedIds(newRemoved);
  };

  const handleRestoreAll = () => {
    setRemovedIds(new Set());
  };

  const removedCount = removedIds.size;
  const duplicatesRemoved = removeDuplicates
    ? participants.filter((p) => !removedIds.has(p.id)).length - activeParticipants.length
    : 0;

  const maxWinners = Math.max(1, activeParticipants.length);
  const clampedWinners = Math.min(numberOfWinners, maxWinners);

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl ig-gradient mb-3 animate-float">
          <span className="text-3xl">👥</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Revisar Participantes</h2>
        <p className="text-white/50 text-sm">
          Configure os filtros e quantidade de ganhadores
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total importados', value: participants.length, icon: '📥', color: 'text-white' },
          { label: 'Válidos para sorteio', value: activeParticipants.length, icon: '✅', color: 'ig-gradient-text' },
          { label: 'Ganhadores', value: clampedWinners, icon: '🏆', color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="ig-card p-3 text-center space-y-1">
            <p className="text-xl">{stat.icon}</p>
            <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-white/40 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Remove duplicates */}
        <div
          onClick={() => onRemoveDuplicatesChange(!removeDuplicates)}
          className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300',
            removeDuplicates
              ? 'border-ig-pink/40 bg-ig-pink/5'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all',
              removeDuplicates ? 'ig-gradient' : 'bg-white/10'
            )}>
              <UserX size={16} className={removeDuplicates ? 'text-white' : 'text-white/50'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Remover comentários duplicados</p>
              <p className="text-xs text-white/40">
                {removeDuplicates
                  ? `${duplicatesRemoved + removedIds.size} removido${duplicatesRemoved + removedIds.size !== 1 ? 's' : ''} • Um comentário por usuário`
                  : 'Cada comentário conta como 1 chance'}
              </p>
            </div>
          </div>
          <div className={cn(
            'w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0',
            removeDuplicates ? 'ig-gradient' : 'bg-white/15'
          )}>
            <div className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
              removeDuplicates ? 'left-5' : 'left-0.5'
            )} />
          </div>
        </div>

        {/* Number of winners */}
        <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl ig-gradient flex items-center justify-center">
                <span className="text-base">🏆</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Número de ganhadores</p>
                <p className="text-xs text-white/40">Máximo: {maxWinners}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNumberOfWinnersChange(Math.max(1, clampedWinners - 1))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                disabled={clampedWinners <= 1}
              >
                <ChevronDown size={16} className="text-white/70" />
              </button>
              <span className="w-8 text-center font-black text-xl ig-gradient-text">
                {clampedWinners}
              </span>
              <button
                onClick={() => onNumberOfWinnersChange(Math.min(maxWinners, clampedWinners + 1))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                disabled={clampedWinners >= maxWinners}
              >
                <ChevronUp size={16} className="text-white/70" />
              </button>
            </div>
          </div>
        </div>

        {/* Branding & Rules settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setShowBranding(!showBranding)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl ig-gradient flex items-center justify-center">
                <span className="text-base">🎨</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Identidade e Regras (Opcional)</p>
                <p className="text-xs text-white/40">Defina logo, organizador e regras</p>
              </div>
            </div>
            {showBranding ? (
              <ChevronUp size={16} className="text-white/50" />
            ) : (
              <ChevronDown size={16} className="text-white/50" />
            )}
          </button>

          {showBranding && (
            <div className="p-4 border-t border-white/10 space-y-4 animate-slide-in-up">
              {/* Organizer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/60">
                  Nome do Sorteador (Empresa ou Pessoa)
                </label>
                <input
                  type="text"
                  placeholder="Ex: @minhaloja ou Meu Nome"
                  value={organizerName}
                  onChange={(e) => onOrganizerNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-ig-pink/40 transition-all font-medium"
                />
              </div>

              {/* Logo upload / URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/60">
                  Logotipo (Upload ou URL da Imagem)
                </label>
                <div className="flex gap-3 items-center">
                  {logoUrl ? (
                    <div className="relative group flex-shrink-0">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => onLogoUrlChange('')}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-lg text-white/30 flex-shrink-0">
                      🖼️
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="https://exemplo.com/imagem.png"
                      value={logoUrl.startsWith('data:') ? '' : logoUrl}
                      onChange={(e) => onLogoUrlChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/25 outline-none focus:border-ig-pink/40 transition-all"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-[10px] bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded text-white/80 transition-colors">
                        Escolher Arquivo...
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  onLogoUrlChange(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[9px] text-white/25">Max: 1MB (Base64)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raffle Rules */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/60">
                  Regras do Sorteio
                </label>
                <textarea
                  placeholder={`Ex:\n1. Seguir nosso perfil\n2. Curtir a foto oficial\n3. Marcar 2 amigos nos comentários`}
                  value={raffleRules}
                  onChange={(e) => onRaffleRulesChange(e.target.value)}
                  className="w-full h-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/25 outline-none resize-none focus:border-ig-pink/40 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          id="participant-search"
          type="text"
          placeholder="Buscar participante..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-ig-pink/40 transition-all"
        />
      </div>

      {/* Participant list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-white/40">
            {searchQuery ? `${filteredParticipants.length} resultado${filteredParticipants.length !== 1 ? 's' : ''}` : `Mostrando ${Math.min(filteredParticipants.length, 50)} de ${filteredParticipants.length}`}
          </p>
          {removedCount > 0 && (
            <button
              onClick={handleRestoreAll}
              className="text-xs text-ig-pink hover:text-white transition-colors underline underline-offset-2"
            >
              Restaurar {removedCount} removido{removedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filteredParticipants.slice(0, 50).map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-white/15 hover:bg-white/[0.06] transition-all duration-200"
            >
              {/* Position badge */}
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40 flex-shrink-0">
                {i + 1}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full ig-gradient flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {p.username.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">@{p.username}</p>
                {p.commentText && (
                  <p className="text-xs text-white/35 truncate">{p.commentText}</p>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(p.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 flex items-center justify-center transition-all duration-200 flex-shrink-0"
                title="Remover participante"
              >
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          ))}

          {filteredParticipants.length === 0 && (
            <div className="text-center py-8 text-white/30">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum participante encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold transition-all duration-200"
        >
          ← Voltar
        </button>
        <button
          id="start-raffle-btn"
          onClick={onNext}
          disabled={activeParticipants.length < 1}
          className="flex-[2] py-3 px-6 rounded-xl ig-btn-primary font-bold text-sm relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            🎰 Iniciar Sorteio
            <ArrowRight size={16} />
          </span>
          <div className="absolute inset-0 animate-shimmer" />
        </button>
      </div>
    </div>
  );
};

export default ParticipantList;
