import React, { useState, useMemo } from 'react';
import { AppStep, AppState, AuditData, Participant } from '@/lib/types';
import { removeDuplicateParticipants } from '@/lib/instagram';
import StepIndicator from '@/components/StepIndicator';
import CommentImporter from '@/components/CommentImporter';
import ParticipantList from '@/components/ParticipantList';
import RaffleWheel from '@/components/RaffleWheel';
import AuditCertificate from '@/components/AuditCertificate';
import ConfettiEffect from '@/components/ConfettiEffect';
import { Shield, Clock } from 'lucide-react';
import { saveSorteio } from '@/lib/api';

const INITIAL_STATE: AppState = {
  currentStep: 'import',
  instagramUrl: '',
  participants: [],
  filteredParticipants: [],
  removeDuplicates: true,
  numberOfWinners: 1,
  auditData: null,
  isRaffling: false,
  organizerName: '',
  raffleRules: '',
  logoUrl: '',
};

const Index: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [confettiActive, setConfettiActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<AppStep[]>([]);

  const activeParticipants = useMemo(() => {
    let list = state.participants;
    if (state.removeDuplicates) list = removeDuplicateParticipants(list);
    return list;
  }, [state.participants, state.removeDuplicates]);

  const setStep = (step: AppStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const markCompleted = (step: AppStep) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  // Handlers
  const handleParticipantsChange = (participants: Participant[], url: string) => {
    setState((prev) => ({ ...prev, participants, instagramUrl: url }));
  };

  const handleImportNext = () => {
    markCompleted('import');
    setStep('review');
  };

  const handleReviewNext = () => {
    markCompleted('review');
    setStep('raffle');
  };

  const handleRaffleComplete = (auditData: AuditData) => {
    setState((prev) => ({ ...prev, auditData }));
    markCompleted('raffle');
    setConfettiActive(true);
    // Salva no banco de dados Neon (silenciosamente)
    saveSorteio(auditData).catch(() => {});
    setTimeout(() => {
      setStep('result');
      setTimeout(() => setConfettiActive(false), 4000);
    }, 800);
  };

  const handleNewRaffle = () => {
    setState(INITIAL_STATE);
    setCompletedSteps([]);
    setConfettiActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Confetti overlay */}
      <ConfettiEffect active={confettiActive} duration={5000} />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl ig-gradient flex items-center justify-center text-base">
              🎰
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none">Sorteios 24h</h1>
              <p className="text-[10px] text-white/40 leading-none">no Insta</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Shield size={10} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Auditável</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Clock size={10} className="text-white/50" />
              <span className="text-[10px] text-white/50 font-semibold">24h</span>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="max-w-lg mx-auto w-full px-4">
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-8">
        <div className="ig-card p-5 sm:p-6">
          {state.currentStep === 'import' && (
            <CommentImporter
              onParticipantsChange={handleParticipantsChange}
              onNext={handleImportNext}
            />
          )}

          {state.currentStep === 'review' && (
            <ParticipantList
              participants={state.participants}
              onParticipantsChange={(p) => setState((prev) => ({ ...prev, participants: p }))}
              removeDuplicates={state.removeDuplicates}
              onRemoveDuplicatesChange={(v) => setState((prev) => ({ ...prev, removeDuplicates: v }))}
              numberOfWinners={state.numberOfWinners}
              onNumberOfWinnersChange={(v) => setState((prev) => ({ ...prev, numberOfWinners: v }))}
              organizerName={state.organizerName || ''}
              onOrganizerNameChange={(v) => setState((prev) => ({ ...prev, organizerName: v }))}
              logoUrl={state.logoUrl || ''}
              onLogoUrlChange={(v) => setState((prev) => ({ ...prev, logoUrl: v }))}
              raffleRules={state.raffleRules || ''}
              onRaffleRulesChange={(v) => setState((prev) => ({ ...prev, raffleRules: v }))}
              onNext={handleReviewNext}
              onBack={() => setStep('import')}
            />
          )}

          {state.currentStep === 'raffle' && (
            <RaffleWheel
              participants={activeParticipants}
              instagramUrl={state.instagramUrl}
              numberOfWinners={state.numberOfWinners}
              organizerName={state.organizerName}
              logoUrl={state.logoUrl}
              raffleRules={state.raffleRules}
              onComplete={handleRaffleComplete}
              onBack={() => setStep('review')}
            />
          )}

          {state.currentStep === 'result' && state.auditData && (
            <AuditCertificate
              auditData={state.auditData}
              onNewRaffle={handleNewRaffle}
            />
          )}
        </div>

        {/* Footer info */}
        {state.currentStep === 'import' && (
          <div className="mt-4 space-y-3">
            {/* Features */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '🔐', title: 'Criptografia Real', desc: 'WebCrypto API' },
                { icon: '📜', title: 'Certificado', desc: 'Exportável em JSON' },
                { icon: '🔍', title: '100% Auditável', desc: 'SHA-256 verificável' },
              ].map((feat) => (
                <div key={feat.title} className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xl mb-1">{feat.icon}</p>
                  <p className="text-xs font-semibold text-white/70">{feat.title}</p>
                  <p className="text-[10px] text-white/30">{feat.desc}</p>
                </div>
              ))}
            </div>

            {/* How to use */}
            <div className="ig-card p-4 space-y-3">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Como usar</p>
              <div className="space-y-2">
                {[
                  { step: '1', text: 'Abra o post no Instagram e copie os comentários' },
                  { step: '2', text: 'Cole os comentários no campo acima (um por linha)' },
                  { step: '3', text: 'Revise os participantes e configure o sorteio' },
                  { step: '4', text: 'Clique em "Realizar Sorteio" e baixe o certificado' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full ig-gradient flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center">
        <p className="text-[11px] text-white/20">
          Sorteios 24h no Insta — Sorteios auditáveis com criptografia
        </p>
      </footer>
    </div>
  );
};

export default Index;
