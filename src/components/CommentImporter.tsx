import React, { useState, useRef } from 'react';
import { Upload, Link2, Users, AlertCircle, CheckCircle2, Trash2, X, Download, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Participant } from '@/lib/types';
import { isValidInstagramUrl, parseComments, detectPostType } from '@/lib/instagram';

interface CommentImporterProps {
  onParticipantsChange: (participants: Participant[], url: string) => void;
  onNext: () => void;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'api_not_configured';

interface FetchProgress {
  loaded: number;
  message: string;
}

function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const CommentImporter: React.FC<CommentImporterProps> = ({ onParticipantsChange, onNext }) => {
  const [instagramUrl, setInstagramUrl] = useState('');
  const [rawComments, setRawComments] = useState('');
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({ loaded: 0, message: '' });
  const [maxComments, setMaxComments] = useState(500);
  const [showManual, setShowManual] = useState(false);
  const [apiError, setApiError] = useState<{ message: string; hint?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleUrlChange = (value: string) => {
    setInstagramUrl(value);
    setFetchStatus('idle');
    setApiError(null);
    if (value.trim()) {
      setUrlValid(isValidInstagramUrl(value.trim()));
    } else {
      setUrlValid(null);
    }
  };

  const applyParticipants = (newParticipants: Participant[], url: string) => {
    setParticipants(newParticipants);
    onParticipantsChange(newParticipants, url);
  };

  // ---- Auto-fetch from API ----
  const handleAutoFetch = async () => {
    if (!instagramUrl.trim() || !urlValid) return;
    setFetchStatus('loading');
    setApiError(null);
    setFetchProgress({ loaded: 0, message: 'Conectando ao Instagram...' });

    abortRef.current = new AbortController();

    try {
      // Simular progresso enquanto aguarda
      const progressTimer = setInterval(() => {
        setFetchProgress((prev) => {
          if (prev.loaded < 80) {
            const increment = Math.random() * 15;
            const messages = [
              'Buscando comentários...',
              'Carregando participantes...',
              'Lendo as páginas do Instagram...',
              'Evitando bloqueios do Instagram...',
            ];
            return {
              loaded: Math.min(prev.loaded + increment, 80),
              message: messages[Math.floor((prev.loaded / 80) * messages.length)] || 'Buscando comentários...',
            };
          }
          return prev;
        });
      }, 800);

      let allFetchedComments: { username: string; text: string; id: string }[] = [];
      let currentCursor: string | null = null;
      let hasMore = true;
      let retries = 0;

      while (hasMore && allFetchedComments.length < maxComments) {
        let apiUrl = `/api/instagram/comments?url=${encodeURIComponent(instagramUrl.trim())}&max_comments=${maxComments}`;
        if (currentCursor) {
          apiUrl += `&cursor=${encodeURIComponent(currentCursor)}`;
        }

        const res = await fetch(apiUrl, { signal: abortRef.current.signal });
        
        if (res.status === 429) {
          // Rate limit atingido. Vamos esperar 5 segundos e tentar novamente.
          if (retries < 5) {
            retries++;
            setFetchProgress((prev) => ({
              ...prev,
              message: `Pausa de segurança (Instagram)... Retomando em instantes.`
            }));
            await new Promise((r) => setTimeout(r, 5000));
            continue; // Tenta fazer a requisição de novo com o mesmo cursor
          } else {
            // Se tentou muitas vezes e continuou bloqueado, para por aqui
            break;
          }
        }

        const data = await res.json();

        if (!res.ok) {
          if (allFetchedComments.length === 0) {
            clearInterval(progressTimer);
            setFetchStatus(res.status === 503 ? 'api_not_configured' : 'error');
            setApiError({
              message: data.error || 'Erro ao importar comentários',
              hint: data.hint,
            });
            return;
          } else {
            // Se já temos algo, ignora o erro (que não seja 429) e continua com os que pegamos
            break;
          }
        }

        retries = 0; // reseta os retries em caso de sucesso
        allFetchedComments = [...allFetchedComments, ...data.comments];
        currentCursor = data.nextCursor;
        hasMore = data.hasMore;

        if (allFetchedComments.length > maxComments) {
          allFetchedComments = allFetchedComments.slice(0, maxComments);
        }

        setFetchProgress((prev) => ({
          ...prev,
          message: `Carregados ${allFetchedComments.length} comentários...`
        }));

        if (!hasMore || allFetchedComments.length >= maxComments) break;
        
        // Aumentando o delay entre páginas para não levar rate limit tão rápido
        await new Promise((r) => setTimeout(r, 1500));
      }

      clearInterval(progressTimer);
      setFetchProgress({ loaded: 100, message: `${allFetchedComments.length} comentários carregados!` });

      // Converte os comentários para Participant[]
      const newParticipants: Participant[] = allFetchedComments.map(
        (c: { id: string; username: string; text: string }) => ({
          id: generateId(),
          username: c.username.toLowerCase(),
          commentText: c.text,
        })
      );

      setFetchStatus('success');
      applyParticipants(newParticipants, instagramUrl.trim());

      // Preenche o textarea para referência
      const rawText = allFetchedComments
        .map((c: { username: string; text: string }) => `@${c.username}: ${c.text}`)
        .join('\n');
      setRawComments(rawText);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setFetchStatus('error');
      setApiError({ message: 'Erro de conexão. Verifique sua internet.' });
    }
  };

  const handleCancelFetch = () => {
    abortRef.current?.abort();
    setFetchStatus('idle');
    setFetchProgress({ loaded: 0, message: '' });
  };

  // ---- Manual paste ----
  const handleCommentsChange = (value: string) => {
    setRawComments(value);
    setError('');
    setFetchStatus('idle');
    if (value.trim()) {
      const parsed = parseComments(value);
      applyParticipants(parsed, instagramUrl);
    } else {
      applyParticipants([], instagramUrl);
    }
  };

  // ---- File upload ----
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'csv'].includes(ext || '')) {
      setError('Apenas arquivos .txt ou .csv são suportados');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleCommentsChange(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const clearAll = () => {
    setRawComments('');
    applyParticipants([], '');
    setFetchStatus('idle');
    setApiError(null);
  };

  const postType = instagramUrl ? detectPostType(instagramUrl) : null;
  const postTypeLabel = { post: 'Publicação', reel: 'Reel', tv: 'IGTV', unknown: 'Publicação' }[postType || 'unknown'];
  const canProceed = participants.length >= 1;
  const isLoading = fetchStatus === 'loading';

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl ig-gradient mb-3 animate-float">
          <span className="text-3xl">📋</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Importar Comentários</h2>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Cole o link do post e importe os comentários automaticamente
        </p>
      </div>

      {/* Instagram URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Link2 size={14} />
          Link da publicação no Instagram
        </label>
        <div className="relative">
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 bg-white/5',
            urlValid === true && 'border-emerald-500/50 shadow-[0_0_12px_hsla(142,70%,50%,0.2)]',
            urlValid === false && 'border-red-500/50 shadow-[0_0_12px_hsla(0,80%,60%,0.15)]',
            urlValid === null && 'border-white/10 focus-within:border-ig-pink/50'
          )}>
            <span className="text-lg flex-shrink-0">
              {postType === 'reel' ? '🎬' : postType === 'tv' ? '📺' : '📸'}
            </span>
            <input
              id="instagram-url-input"
              type="url"
              placeholder="https://www.instagram.com/p/ABC123..."
              value={instagramUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-sm disabled:opacity-50"
            />
            {urlValid === true && !isLoading && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
            {urlValid === false && <AlertCircle size={18} className="text-red-400 flex-shrink-0" />}
            {isLoading && <Loader2 size={18} className="text-ig-pink flex-shrink-0 animate-spin" />}
          </div>
        </div>
        {urlValid === true && (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} /> {postTypeLabel} do Instagram detectada
          </p>
        )}
        {urlValid === false && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> URL inválida. Use o link completo do Instagram
          </p>
        )}
      </div>

      {/* Auto-import section */}
      <div className={cn(
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        fetchStatus === 'success' && 'border-emerald-500/30',
        fetchStatus === 'error' && 'border-red-500/30',
        fetchStatus === 'api_not_configured' && 'border-yellow-500/30',
        fetchStatus === 'loading' && 'border-ig-pink/40 shadow-[0_0_20px_hsla(330,100%,60%,0.15)]',
        fetchStatus === 'idle' && 'border-white/10',
      )}>
        {/* Header da seção */}
        <div className="px-4 py-3 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span className="text-sm font-semibold text-white">Importação Automática</span>
          </div>
          {fetchStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 size={13} />
              {participants.length} importados
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Max comments selector */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white/60">Máximo de comentários</p>
              <p className="text-[10px] text-white/30">Mais comentários = mais tempo</p>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 2000, 3000, 5000].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxComments(n)}
                  disabled={isLoading}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200',
                    maxComments === n
                      ? 'ig-gradient text-white shadow-md'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  )}
                >
                  {n >= 1000 ? `${n / 1000}k` : n}
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar (loading) */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60 animate-pulse">{fetchProgress.message}</span>
                <button
                  onClick={handleCancelFetch}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full ig-gradient rounded-full transition-all duration-500 animate-gradient-shift"
                  style={{ width: `${fetchProgress.loaded}%`, backgroundSize: '200% 200%' }}
                />
              </div>
            </div>
          )}

          {/* Success state */}
          {fetchStatus === 'success' && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-400">
                  {participants.length} comentários importados com sucesso!
                </p>
                <p className="text-xs text-white/40">Clique em "Revisar Participantes" para continuar</p>
              </div>
              <button
                onClick={() => { clearAll(); setInstagramUrl(instagramUrl); setUrlValid(true); }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                title="Reimportar"
              >
                <RefreshCw size={13} className="text-white/50" />
              </button>
            </div>
          )}

          {/* API not configured */}
          {fetchStatus === 'api_not_configured' && (
            <div className="space-y-3 px-3 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-400">API não configurada</p>
                  <p className="text-xs text-white/50 mt-1">
                    Configure a variável <code className="text-yellow-300 bg-black/30 px-1 rounded">RAPIDAPI_KEY</code> no Vercel para habilitar importação automática.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] text-white/40">
                <p className="font-semibold text-white/60">Como configurar:</p>
                <p>1. Acesse <span className="text-yellow-300">rapidapi.com</span> e busque por <span className="text-white/70">"instagram-scraper21"</span></p>
                <p>2. Inscreva-se (plano gratuito disponível)</p>
                <p>3. Copie sua API Key</p>
                <p>4. No Vercel: Settings → Environment Variables → <span className="text-yellow-300">RAPIDAPI_KEY</span></p>
              </div>
              <p className="text-[11px] text-white/40 border-t border-white/10 pt-2 mt-1">
                Enquanto isso, use a opção manual abaixo ↓
              </p>
            </div>
          )}

          {/* Generic error */}
          {fetchStatus === 'error' && apiError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">{apiError.message}</p>
                {apiError.hint && (
                  <p className="text-xs text-white/40 mt-1">{apiError.hint}</p>
                )}
              </div>
            </div>
          )}

          {/* Fetch button */}
          {fetchStatus !== 'success' && (
            <button
              id="auto-import-btn"
              onClick={handleAutoFetch}
              disabled={!urlValid || isLoading}
              className={cn(
                'w-full py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 relative overflow-hidden',
                urlValid && !isLoading
                  ? 'ig-btn-primary cursor-pointer'
                  : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Importando...</>
                ) : (
                  <><Download size={16} /> Importar Comentários Automaticamente</>
                )}
              </span>
              {urlValid && !isLoading && <div className="absolute inset-0 animate-shimmer" />}
            </button>
          )}
        </div>
      </div>

      {/* Manual import toggle */}
      <div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group"
        >
          <span className="text-sm font-medium text-white/50 group-hover:text-white/70 flex items-center gap-2">
            ✏️ Importar manualmente (colar/arquivo)
          </span>
          <ChevronDown
            size={16}
            className={cn(
              'text-white/30 transition-transform duration-200',
              showManual && 'rotate-180'
            )}
          />
        </button>

        {showManual && (
          <div className="mt-3 space-y-4 animate-slide-in-up">
            {/* Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/60 flex items-center gap-2">
                  <Users size={13} /> Cole os comentários aqui
                </label>
                {participants.length > 0 && fetchStatus !== 'success' && (
                  <span className="text-xs font-semibold ig-gradient-text">
                    {participants.length} detectado{participants.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="relative">
                <textarea
                  id="comments-textarea"
                  value={rawComments}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder={`Formatos aceitos:\n@usuario: texto do comentário\n@usuario texto\nusuario,comentário\nApenas @usuario (um por linha)`}
                  className="w-full h-40 px-4 py-3 rounded-xl border bg-white/5 text-white text-sm placeholder-white/20 outline-none resize-none transition-all duration-300 border-white/10 focus:border-ig-pink/50 focus:shadow-[0_0_12px_hsla(330,100%,60%,0.15)]"
                />
                {rawComments && (
                  <button
                    onClick={clearAll}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-all text-white/50 hover:text-red-400"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['@usuario: texto', '@usuario texto', 'usuario,texto', '@usuario'].map((fmt) => (
                  <span key={fmt} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/8 text-white/30 font-mono">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center gap-4 py-4 px-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 group',
                isDragging
                  ? 'border-ig-pink/70 bg-ig-pink/5 scale-[1.01]'
                  : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                isDragging ? 'ig-gradient' : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <Upload size={18} className={cn('text-white/40 group-hover:text-white/70', isDragging && 'text-white')} />
              </div>
              <div>
                <p className="text-sm font-medium text-white/50 group-hover:text-white/70 transition-colors">
                  {isDragging ? 'Solte o arquivo!' : 'Arraste .TXT ou .CSV'}
                </p>
                <p className="text-xs text-white/25">ou clique para selecionar</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {/* Preview */}
      {participants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/40">Prévia dos participantes:</p>
          <div className="grid gap-1.5 max-h-36 overflow-y-auto pr-1">
            {participants.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 animate-slide-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-7 h-7 rounded-full ig-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">@{p.username}</p>
                  {p.commentText && (
                    <p className="text-xs text-white/40 truncate">{p.commentText}</p>
                  )}
                </div>
              </div>
            ))}
            {participants.length > 5 && (
              <p className="text-xs text-center text-white/25 py-1">
                +{participants.length - 5} participante{participants.length - 5 !== 1 ? 's' : ''} não exibido{participants.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        id="next-to-review-btn"
        onClick={onNext}
        disabled={!canProceed}
        className={cn(
          'w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 ig-btn-primary relative overflow-hidden',
          canProceed ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <Users size={18} />
          Revisar {participants.length > 0 ? `${participants.length} Participantes` : 'Participantes'}
        </span>
        {canProceed && <div className="absolute inset-0 animate-shimmer" />}
      </button>
    </div>
  );
};

export default CommentImporter;
