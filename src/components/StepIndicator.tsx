import React from 'react';
import { AppStep } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Step {
  id: AppStep;
  label: string;
  icon: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'import', label: 'Importar', icon: '📋', description: 'Adicionar comentários' },
  { id: 'review', label: 'Revisar', icon: '👥', description: 'Confirmar participantes' },
  { id: 'raffle', label: 'Sortear', icon: '🎰', description: 'Realizar o sorteio' },
  { id: 'result', label: 'Resultado', icon: '🏆', description: 'Ganhador e certificado' },
];

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
  completedSteps?: AppStep[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  completedSteps = [],
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-center gap-0 max-w-2xl mx-auto">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id) || index < currentIndex;
          const isClickable = onStepClick && (isCompleted || index <= currentIndex);

          return (
            <React.Fragment key={step.id}>
              {/* Step Node */}
              <div
                className={cn(
                  'flex flex-col items-center gap-1.5 relative',
                  isClickable && 'cursor-pointer group'
                )}
                onClick={() => isClickable && onStepClick?.(step.id)}
              >
                {/* Circle */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold transition-all duration-500 relative z-10',
                    isActive && 'ig-gradient scale-110 shadow-lg animate-pulse-glow',
                    isCompleted && !isActive && 'bg-emerald-500/20 border-2 border-emerald-500',
                    !isActive && !isCompleted && 'bg-white/5 border-2 border-white/10'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <span className="text-emerald-400 text-lg">✓</span>
                  ) : (
                    <span
                      className={cn(
                        'transition-all duration-300',
                        isActive && 'animate-float'
                      )}
                    >
                      {step.icon}
                    </span>
                  )}

                  {/* Active ring */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full ig-gradient opacity-30 blur-sm scale-125 animate-pulse" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-semibold transition-colors duration-300',
                      isActive && 'ig-gradient-text',
                      isCompleted && !isActive && 'text-emerald-400',
                      !isActive && !isCompleted && 'text-white/30'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-[10px] hidden sm:block transition-colors duration-300',
                      isActive && 'text-white/60',
                      !isActive && 'text-white/20'
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px] h-[2px] relative">
                  <div className="absolute inset-0 bg-white/10 rounded-full" />
                  <div
                    className={cn(
                      'absolute inset-0 rounded-full transition-all duration-700',
                      index < currentIndex
                        ? 'ig-gradient opacity-100'
                        : 'opacity-0'
                    )}
                    style={{ width: index < currentIndex ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
