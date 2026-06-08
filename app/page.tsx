"use client";

import React, { useState, useCallback } from 'react';
import { useToast } from './components/Toast';
import { type Trade } from './components/HistoryTable';
import axios from 'axios';
import { Header } from './components/Header';
import { InputPanel, InputPanelFiles } from './components/InputPanel';
import { ExecutionPanel } from './components/ExecutionPanel';
import { HistoryTable } from './components/HistoryTable';
import { PlansPage } from './components/PlansPage';

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
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'plans'>('analysis');
  const [mobilePanelView, setMobilePanelView] = useState<'upload' | 'result'>('upload');
  const executionPanelRef = React.useRef<HTMLDivElement>(null);

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
    const savedFiles  = localStorage.getItem('hive_input_files');

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

    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        const base64ToFile = (base64: string, filename: string): File => {
          const arr  = base64.split(',');
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new File([u8arr], filename, { type: mime });
        };
        setFiles({
          htf: parsed.htf ? base64ToFile(parsed.htf.data, parsed.htf.name) : null,
          mid: parsed.mid ? base64ToFile(parsed.mid.data, parsed.mid.name) : null,
          ltf: parsed.ltf ? base64ToFile(parsed.ltf.data, parsed.ltf.name) : null,
        });
      } catch (e) {
        console.error('Failed to recover input files', e);
        toast.warning('Could not restore previously uploaded chart images.', 'Files Not Restored');
      }
    }

    if (savedTab === 'analysis' || savedTab === 'history') {
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

  // ── Persist input files (debounced) ─────────────────────────────────────
  React.useEffect(() => {
    const saveFiles = async () => {
      const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });

      try {
        const filesData: Record<string, { name: string; data: string }> = {};
        if (files.htf) filesData.htf = { name: files.htf.name, data: await fileToBase64(files.htf) };
        if (files.mid) filesData.mid = { name: files.mid.name, data: await fileToBase64(files.mid) };
        if (files.ltf) filesData.ltf = { name: files.ltf.name, data: await fileToBase64(files.ltf) };
        if (Object.keys(filesData).length > 0) {
          localStorage.setItem('hive_input_files', JSON.stringify(filesData));
        } else {
          localStorage.removeItem('hive_input_files');
        }
      } catch (e) {
        console.warn('Storage quota exceeded, images not saved', e);
        toast.warning('Storage quota exceeded. Chart images could not be saved.', 'Storage Full');
      }
    };

    const id = setTimeout(saveFiles, 500);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

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
  const handleAnalysis = async (uploadedFiles: { htf: File | null; mid: File | null; ltf: File | null }) => {
    setIsProcessing(true);
    setStatus('analyzing');
    setAnalysisResult(undefined);

    try {
      const formData = new FormData();
      if (uploadedFiles.htf) formData.append('image_htf', uploadedFiles.htf);
      if (uploadedFiles.mid) formData.append('image_mid', uploadedFiles.mid);
      if (uploadedFiles.ltf) formData.append('image_ltf', uploadedFiles.ltf);

      const response = await axios.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2-min hard timeout — prevents infinite hang when n8n is down
      });

      if (response.data) {
        const data = Array.isArray(response.data) ? response.data[0] : response.data;

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

      const errorData    = error.response?.data;
      const errorMessage: string =
        errorData?.error   ||
        errorData?.message ||
        error.message      ||
        'Unknown error occurred';

      // Check if it's a token limit error
      if (error.response?.status === 429 && errorData?.tokenInfo) {
        setTokenInfo(errorData.tokenInfo);
        toast.error(
          `Daily limit reached (${errorData.tokenInfo.used}/${errorData.tokenInfo.limit}). Please try again tomorrow.`,
          'Limit Reached'
        );
        return;
      }

      if (errorMessage.includes('N8N Webhook URL is not configured') || errorMessage.includes('Check .env.local')) {
        toast.error('The N8N Webhook URL is not configured. Please check your .env.local file.', 'Configuration Error', Infinity);
      } else if (
        errorMessage.includes('Network Error') ||
        errorMessage.includes('ECONNREFUSED') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_NETWORK'
      ) {
        toast.error('Cannot reach the analysis server. Make sure n8n is running and accessible.', 'Connection Error');
      } else if (
        error.code === 'ECONNABORTED' ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.includes('408')
      ) {
        toast.error('The request timed out after 2 minutes. n8n may be overloaded or unreachable.', 'Request Timed Out');
      } else if (errorMessage.includes('Respond Immediately') || errorMessage.includes('Workflow was started')) {
        toast.error('N8N is set to "Respond Immediately". Change the webhook to "Using Respond to Webhook Node".', 'N8N Config Error', Infinity);
      } else if (errorMessage.includes('No data returned') || errorMessage.includes('Empty response')) {
        toast.error('The server returned an empty response. Please try again.', 'Empty Response');
      } else if (error.response?.status === 401) {
        toast.error('You must be logged in to run an analysis.', 'Unauthorized');
      } else if (error.response?.status >= 500) {
        toast.error(`Server error (${error.response.status}). Check your n8n workflow and API logs.`, 'Server Error');
      } else {
        toast.error(errorMessage, 'Analysis Failed');
      }
    } finally {
      setIsProcessing(false);
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
