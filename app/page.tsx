"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useToast } from './components/Toast';
import { type Trade } from './components/HistoryTable';
import { Header } from './components/Header';
import { InputPanel, InputPanelFiles } from './components/InputPanel';
import { ExecutionPanel } from './components/ExecutionPanel';
import { HistoryTable } from './components/HistoryTable';
import { PlansPage } from './components/PlansPage';
import { LiveMarket } from './components/LiveMarket';

interface AnalysisResult {
  signal: 'BUY' | 'SELL' | 'WAIT' | 'NEUTRAL';
  sl: number;
  tp: number;
  reasoning: string;
  confidence: number;
  asset: string;
  chartHtfUrl?: string | null;
  chartMidUrl?: string | null;
  chartLtfUrl?: string | null;

  // New fields from n8n workflow response
  setup_type?: string;
  setup_model?: string;
  entry_price?: number;
  tp1?: number;
  tp2?: number;
  tp3_runner?: number;
  tp1_action?: string;
  tp2_action?: string;
  tp3_action?: string;
  rr_ratio?: string;
  rr_to_tp2?: string;
  rr_to_tp3?: string;
  volatility_level?: string;
  news_sentiment?: string;
  news_summary?: string;
  active_session?: string;
  active_killzone?: string;
  pht_time?: string;
  wait_reason?: string;
  failed_timeframe?: string;
  failed_candle?: string;
  failed_step?: string;
  next_step?: string;
  recheck_after?: string;
  overall_chart_summary?: string;
  y_axis_mismatch?: boolean;
  price_source?: string;
  price_source_reason?: string;
  confidence_breakdown?: string;
  math_check?: string;

  ict_pre_analysis?: {
    midnight_open_price?: number;
    daily_bias?: string;
    price_position?: string;
    asian_range_high?: number;
    asian_range_low?: number;
    pdh?: number;
    pdl?: number;
    judas_swing_detected?: boolean;
    judas_swing_direction?: string;
    judas_swing_sweep_price?: number;
    ote_zone_low?: number;
    ote_zone_high?: number;
    po3_phase?: string;
    smt_divergence_detected?: boolean;
    smt_divergence_type?: string;
    analysis?: string;
  };

  gate1_4h?: {
    trend?: string;
    bos_confirmed?: boolean;
    bos_direction?: string;
    nearest_ob_price?: number;
    fvg_range?: string;
    gate_passed?: boolean;
    gate_fail_reason?: string;
    analysis?: string;
  };

  gate2_1h?: {
    aligns_with_4h?: boolean;
    choch_observed?: boolean;
    choch_direction?: string;
    premium_or_discount?: string;
    gate_passed?: boolean;
    gate_fail_reason?: string;
    analysis?: string;
  };

  gate3_15m?: {
    liquidity_sweep_occurred?: boolean;
    sweep_direction?: string;
    sweep_price?: number;
    mss_confirmed?: boolean;
    mss_direction?: string;
    price_in_ote_zone?: boolean;
    entry_ob_price?: number;
    gate_passed?: boolean;
    gate_fail_reason?: string;
    analysis?: string;
  };
}

interface TokenInfo {
  plan: string;
  planName: string;
  limit: number;
  used: number;
  remaining: number;
  canAnalyze: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export default function Home() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'plans' | 'market'>('analysis');
  const [mobilePanelView, setMobilePanelView] = useState<'upload' | 'result'>('upload');
  const executionPanelRef = React.useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<InputPanelFiles>({ htf: null, mid: null, ltf: null });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>(undefined);
  const [status, setStatus] = useState<'awaiting' | 'analyzing' | 'completed'>('awaiting');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // ── Token state ─────────────────────────────────────────────────────────
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const fetchTokenInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        setTokenInfo(data);
      }
    } catch (err) {
      console.warn('Failed to fetch token info:', err);
    }
  }, []);

  // Fetch token info on mount and when tab changes
  React.useEffect(() => {
    fetchTokenInfo();
  }, [fetchTokenInfo]);

  // ── Restore from localStorage on mount ──────────────────────────────────
  React.useEffect(() => {
    const savedResult = localStorage.getItem('hive_analysis_result');
    const savedTab    = localStorage.getItem('hive_active_tab');

    // Clean up legacy keys that cause QuotaExceeded errors
    localStorage.removeItem('hive_input_files');

    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setAnalysisResult(parsed);
        setStatus('completed');
        setHasAnalyzed(true);
        setMobilePanelView('result');
      } catch (e) {
        console.error('Failed to recover analysis state', e);
        toast.warning('Could not restore your last analysis session.', 'Session Restore Failed');
      }
    }

    if (savedTab === 'analysis' || savedTab === 'history' || savedTab === 'market') {
      setActiveTab(savedTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist analysis result ──────────────────────────────────────────────
  React.useEffect(() => {
    if (analysisResult) {
      localStorage.setItem('hive_analysis_result', JSON.stringify(analysisResult));
    }
  }, [analysisResult]);

  // ── Persist active tab ───────────────────────────────────────────────────
  React.useEffect(() => {
    // Don't persist 'plans' tab — always return to analysis on refresh
    if (activeTab !== 'plans') {
      localStorage.setItem('hive_active_tab', activeTab);
    }
  }, [activeTab]);




  // ── Auto-scroll to result panel on mobile ───────────────────────────────
  React.useEffect(() => {
    if (status !== 'awaiting' && window.innerWidth < 1024) {
      setTimeout(() => executionPanelRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [status]);

  // ── Handle checkout success query param ─────────────────────────────────
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      const plan = params.get('plan') || 'starter';
      
      const syncLocalSubscription = async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log('[Dev Sync] Triggering local webhook subscription sync...');
            const res = await fetch('/api/stripe/webhook', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'paymongo-signature': 'bypass-dev'
              },
              body: JSON.stringify({
                data: {
                  attributes: {
                    type: 'checkout_session.payment.paid',
                    data: {
                      id: `cs_local_${Date.now()}`,
                      attributes: {
                        metadata: {
                          supabase_user_id: user.id,
                          plan: plan
                        }
                      }
                    }
                  }
                }
              })
            });
            
            if (res.ok) {
              console.log('[Dev Sync] Webhook sync successful!');
              fetchTokenInfo();
            } else {
              console.error('[Dev Sync] Webhook sync failed status:', res.status);
            }
          }
        } catch (err) {
          console.error('Failed to sync local subscription:', err);
        }
      };

      toast.success(`Successfully subscribed to the ${plan} plan!`, 'Subscription Active');
      
      // Auto-sync database state for local development
      syncLocalSubscription();

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'canceled') {
      toast.warning('Checkout was canceled.', 'Checkout Canceled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Main analysis handler ────────────────────────────────────────────────
  // ── Robust fetch with retry (replaces axios to fix mobile stale-connection bugs) ──
  const fetchWithRetry = useCallback(async (
    url: string,
    options: RequestInit,
    maxRetries = 3
  ): Promise<Response> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Fresh AbortController per attempt so a timed-out attempt doesn't
        // poison the next one (root cause of the "need to reload" bug)
        const controller = new AbortController();
        abortRef.current = controller;

        // 65s client timeout — slightly above Vercel's 60s so we receive
        // the server's own 504 instead of a raw network error
        const timeoutId = setTimeout(() => controller.abort(), 65_000);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        // Don't retry 4xx — those are user/config errors, not transient
        if (res.status >= 400 && res.status < 500) return res;

        // Retry 502/503/504 (n8n down, gateway error, Vercel timeout)
        if (res.status >= 500 && attempt < maxRetries) {
          lastError = new Error(`Server responded ${res.status}`);
          const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
          toast.warning(
            `Server error (${res.status}). Retrying in ${backoff / 1000}s… (attempt ${attempt}/${maxRetries})`,
            'Retrying'
          );
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        return res;
      } catch (err: any) {
        lastError = err;

        // AbortError = timeout; TypeError = network failure (mobile sleep/switch)
        const isRetryable = err.name === 'AbortError' ||
                            err.name === 'TypeError' ||
                            err.message?.includes('fetch') ||
                            err.message?.includes('network');

        if (isRetryable && attempt < maxRetries) {
          const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
          toast.warning(
            `Connection lost. Retrying in ${backoff / 1000}s… (attempt ${attempt}/${maxRetries})`,
            'Retrying'
          );
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('All retry attempts exhausted');
  }, [toast]);

  const handleAnalysis = async (uploadedFiles: { htf: File | string | null; mid: File | string | null; ltf: File | string | null }) => {
    setIsProcessing(true);
    setStatus('analyzing');
    setAnalysisResult(undefined);

    try {
      const formData = new FormData();
      if (uploadedFiles.htf) formData.append('image_htf', uploadedFiles.htf);
      if (uploadedFiles.mid) formData.append('image_mid', uploadedFiles.mid);
      if (uploadedFiles.ltf) formData.append('image_ltf', uploadedFiles.ltf);

      const response = await fetchWithRetry('/api/analyze', {
        method: 'POST',
        body: formData,
        // NOTE: Do NOT set Content-Type — browser auto-sets multipart boundary
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Build a structured error so the catch block can handle it
        const err: any = new Error(responseData?.error || `Server error ${response.status}`);
        err.status = response.status;
        err.data = responseData;
        throw err;
      }

      if (responseData) {
        const data = Array.isArray(responseData) ? responseData[0] : responseData;

        if (data.error) throw new Error(data.error);

        setAnalysisResult({
          signal:      data.signal_type  || data.signal    || 'WAIT',
          sl:          data.stop_loss    || data.sl         || 0,
          tp:          data.take_profit  || data.tp         || 0,
          reasoning:   data.reasoning    || 'No reasoning provided.',
          confidence:  data.confidence   || 0,
          asset:       data.asset_name   || data.asset      || 'Unknown Asset',
          chartHtfUrl: data.chart_htf_url ?? null,
          chartMidUrl: data.chart_mid_url ?? null,
          chartLtfUrl: data.chart_ltf_url ?? null,

          // Map new analytical output fields
          setup_type:            data.setup_type || data.setup_model || 'No ICT Setup',
          setup_model:           data.setup_model || data.setup_type || 'No ICT Setup',
          entry_price:           data.entry_price || 0,
          tp1:                   data.tp1 || 0,
          tp2:                   data.tp2 || 0,
          tp3_runner:            data.tp3_runner || 0,
          tp1_action:            data.tp1_action || '',
          tp2_action:            data.tp2_action || '',
          tp3_action:            data.tp3_action || '',
          rr_ratio:              data.rr_ratio || '0',
          rr_to_tp2:             data.rr_to_tp2 || '0',
          rr_to_tp3:             data.rr_to_tp3 || '0',
          volatility_level:      data.volatility_level || 'NORMAL',
          news_sentiment:        data.news_sentiment || 'NEUTRAL',
          news_summary:          data.news_summary || '',
          active_session:        data.active_session || '',
          active_killzone:       data.active_killzone || 'NONE',
          pht_time:              data.pht_time || '',
          wait_reason:           data.wait_reason || 'none',
          failed_timeframe:      data.failed_timeframe || 'none',
          failed_candle:         data.failed_candle || 'none',
          failed_step:           data.failed_step || 'none',
          next_step:             data.next_step || 'none',
          recheck_after:         data.recheck_after || '',
          overall_chart_summary: data.overall_chart_summary || '',
          y_axis_mismatch:       data.y_axis_mismatch || false,
          price_source:          data.price_source || 'UNKNOWN',
          price_source_reason:   data.price_source_reason || '',
          confidence_breakdown:  data.confidence_breakdown || '',
          math_check:            data.math_check || '',
          ict_pre_analysis:      data.ict_pre_analysis || {},
          gate1_4h:              data.gate1_4h || {},
          gate2_1h:              data.gate2_1h || {},
          gate3_15m:             data.gate3_15m || {},
        });

        setStatus('completed');
        setHasAnalyzed(true);
        setMobilePanelView('result');
        toast.success(
          `${data.signal_type || data.signal || 'WAIT'} signal generated for ${data.asset_name || data.asset || 'your asset'}.`,
          'Analysis Complete'
        );

        // Refresh token info after successful analysis
        fetchTokenInfo();
      } else {
        throw new Error('No data returned from analysis');
      }

    } catch (error: any) {
      console.error('Analysis Failed:', error);
      setStatus('awaiting');

      const errorData = error.data;
      const errorMessage: string =
        errorData?.error   ||
        errorData?.message ||
        error.message      ||
        'Unknown error occurred';

      const httpStatus = error.status || 0;

      // Check if it's a token limit error
      if (httpStatus === 429 && errorData?.tokenInfo) {
        setTokenInfo(errorData.tokenInfo);
        toast.error(
          `Daily limit reached (${errorData.tokenInfo.used}/${errorData.tokenInfo.limit}). Please try again tomorrow.`,
          'Limit Reached'
        );
        return;
      }

      if (errorMessage.includes('N8N Webhook URL is not configured') || errorMessage.includes('Check .env.local')) {
        toast.error('The N8N Webhook URL is not configured. Please check your .env.local file.', 'Configuration Error', Infinity);
      } else if (error.name === 'AbortError') {
        toast.error('The request timed out. The analysis server may be overloaded. Please try again.', 'Request Timed Out');
      } else if (
        error.name === 'TypeError' ||
        errorMessage.includes('Network Error') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('fetch')
      ) {
        toast.error('Cannot reach the analysis server after multiple attempts. Check your connection and try again.', 'Connection Error');
      } else if (errorMessage.includes('Respond Immediately') || errorMessage.includes('Workflow was started')) {
        toast.error('N8N is set to "Respond Immediately". Change the webhook to "Using Respond to Webhook Node".', 'N8N Config Error', Infinity);
      } else if (errorMessage.includes('No data returned') || errorMessage.includes('Empty response')) {
        toast.error('The server returned an empty response. Please try again.', 'Empty Response');
      } else if (httpStatus === 401) {
        toast.error('You must be logged in to run an analysis.', 'Unauthorized');
      } else if (httpStatus >= 500) {
        toast.error(`Server error (${httpStatus}). Check your n8n workflow and API logs.`, 'Server Error');
      } else {
        toast.error(errorMessage, 'Analysis Failed');
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  // ── Handle snapshot taken from live market ──────────────────────────────────
  const handleSnapshotTaken = (fileOrUrl: File | string) => {
    let targetSlot: 'htf' | 'mid' | 'ltf' | null = null;
    if (!files.htf) targetSlot = 'htf';
    else if (!files.mid) targetSlot = 'mid';
    else if (!files.ltf) targetSlot = 'ltf';

    if (targetSlot) {
      setFiles(prev => ({
        ...prev,
        [targetSlot!]: fileOrUrl
      }));
      setActiveTab('analysis');
      setMobilePanelView('upload');
      
      const slotName = targetSlot === 'htf' ? 'Higher Timeframe' : targetSlot === 'mid' ? 'Intermediate Timeframe' : 'Lower Timeframe';
      toast.success(`Loaded chart screenshot into ${slotName}!`, 'Snapshot Loaded');
    } else {
      toast.error('All timeframe slots are currently full. Please clear a slot first.', 'Slots Full');
    }
  };

  // ── View a trade from history ────────────────────────────────────────────
  const handleViewTrade = (trade: Trade) => {
    setAnalysisResult({
      signal:      trade.signal,
      sl:          trade.sl,
      tp:          trade.tp,
      reasoning:   trade.reasoning,
      confidence:  trade.confidence,
      asset:       trade.asset,
      chartHtfUrl: trade.chart_htf_url ?? null,
      chartMidUrl: trade.chart_mid_url ?? null,
      chartLtfUrl: trade.chart_ltf_url ?? null,
    });
    setStatus('completed');
    setActiveTab('analysis');
    setMobilePanelView('result');
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <main
      className="flex flex-col h-[100dvh] w-full overflow-hidden font-sans selection:bg-amber-100 selection:text-amber-900 transition-colors duration-300 relative"
      style={{ backgroundColor: 'var(--bg)' }}
    >

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobilePanelView={mobilePanelView}
        onMobilePanelChange={setMobilePanelView}
        tokenInfo={tokenInfo}
        onTokenRefresh={fetchTokenInfo}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden">

        {activeTab === 'plans' ? (
          <div className="h-full max-w-[1200px] mx-auto w-full animate-in fade-in duration-500">
            <PlansPage
              tokenInfo={tokenInfo}
              onBack={() => setActiveTab('analysis')}
              onTokenRefresh={fetchTokenInfo}
            />
          </div>
        ) : activeTab === 'analysis' ? (
          <div className="flex flex-col lg:flex-row gap-6 h-full max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Left Panel: Chart Input */}
            <div className={`w-full lg:w-[400px] flex-shrink-0 h-full ${mobilePanelView === 'upload' ? 'block' : 'hidden lg:block'}`}>
              <InputPanel
                files={files}
                chartUrls={{
                  htf: analysisResult?.chartHtfUrl,
                  mid: analysisResult?.chartMidUrl,
                  ltf: analysisResult?.chartLtfUrl,
                }}
                onFilesChange={(newFiles: InputPanelFiles) => {
                  setFiles(newFiles);
                  setHasAnalyzed(false);
                }}
                onClearAll={() => {
                  setAnalysisResult(undefined);
                  setStatus('awaiting');
                  localStorage.removeItem('hive_analysis_result');
                  setHasAnalyzed(false);
                  setMobilePanelView('upload');
                }}
                onAnalyze={handleAnalysis}
                isLoading={isProcessing}
                hasAnalyzed={hasAnalyzed}
              />
            </div>

            {/* Right Panel: AI Output */}
            <div
              ref={executionPanelRef}
              className={`flex-1 w-full h-[500px] sm:h-[600px] lg:h-full ${mobilePanelView === 'result' ? 'block' : 'hidden lg:block'}`}
            >
              <ExecutionPanel status={status} result={analysisResult} />
            </div>

          </div>
        ) : activeTab === 'market' ? (
          <div className="h-full max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
            <LiveMarket onSnapshotTaken={handleSnapshotTaken} />
          </div>
        ) : (
          <div className="h-full max-w-[1200px] mx-auto w-full animate-in fade-in duration-500">
            <HistoryTable
              onView={handleViewTrade}
              onDelete={(_id: string) => {
                // Optimistic delete handled inside HistoryTable
              }}
            />
          </div>
        )}

      </div>

      {/* Decorative blur background elements */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0 transform-gpu" style={{ backgroundColor: 'var(--blur-1)' }} />
      <div className="fixed -top-32 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0 transform-gpu"  style={{ backgroundColor: 'var(--blur-2)' }} />

    </main>
  );
}
