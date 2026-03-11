"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { InputPanel, InputPanelFiles } from './components/InputPanel';
import { ExecutionPanel } from './components/ExecutionPanel';
import { HistoryTable } from './components/HistoryTable';
import { toast, Toaster } from 'sonner';

// Mock outcome type for demonstration
interface AnalysisResult {
  signal: 'BUY' | 'SELL' | 'WAIT' | 'NEUTRAL';
  sl: number;
  tp: number;
  reasoning: string;
  confidence: number;
  asset: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');

  // State for file upload / processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<InputPanelFiles>({
    htf: null,
    mid: null,
    ltf: null
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>(undefined);
  const [status, setStatus] = useState<'awaiting' | 'analyzing' | 'completed'>('awaiting');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Load state from local storage on mount
  React.useEffect(() => {
    const savedResult = localStorage.getItem('hive_analysis_result');
    const savedTab = localStorage.getItem('hive_active_tab');
    const savedFiles = localStorage.getItem('hive_input_files');

    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setAnalysisResult(parsed);
        setStatus('completed');
        setHasAnalyzed(true);
      } catch (e) {
        console.error("Failed to recover analysis state", e);
      }
    }

    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        const base64ToFile = (base64: string, filename: string): File => {
          const arr = base64.split(',');
          const mime = arr[0].match(/:(.*?);/)![1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], filename, { type: mime });
        };

        setFiles({
          htf: parsed.htf ? base64ToFile(parsed.htf.data, parsed.htf.name) : null,
          mid: parsed.mid ? base64ToFile(parsed.mid.data, parsed.mid.name) : null,
          ltf: parsed.ltf ? base64ToFile(parsed.ltf.data, parsed.ltf.name) : null,
        });
      } catch (e) {
        console.error("Failed to recover input files", e);
      }
    }

    if (savedTab === 'analysis' || savedTab === 'history') {
      setActiveTab(savedTab);
    }
  }, []);

  // Persist analysis result
  React.useEffect(() => {
    if (analysisResult) {
      localStorage.setItem('hive_analysis_result', JSON.stringify(analysisResult));
    }
  }, [analysisResult]);

  // Persist active tab
  React.useEffect(() => {
    localStorage.setItem('hive_active_tab', activeTab);
  }, [activeTab]);

  // Persist input files
  React.useEffect(() => {
    const saveFiles = async () => {
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      try {
        const filesData: any = {};
        if (files.htf) {
          filesData.htf = { name: files.htf.name, data: await fileToBase64(files.htf) };
        }
        if (files.mid) {
          filesData.mid = { name: files.mid.name, data: await fileToBase64(files.mid) };
        }
        if (files.ltf) {
          filesData.ltf = { name: files.ltf.name, data: await fileToBase64(files.ltf) };
        }

        if (Object.keys(filesData).length > 0) {
          localStorage.setItem('hive_input_files', JSON.stringify(filesData));
        }
      } catch (e) {
        console.warn('Storage quota exceeded, images not saved', e);
      }
    };

    const timeoutId = setTimeout(() => {
      saveFiles();
    }, 500); // Debounce to avoid freezing UI on rapid changes

    return () => clearTimeout(timeoutId);
  }, [files]);

  const handleAnalysis = async (files: { htf: File, mid: File, ltf: File }) => {
    setIsProcessing(true);
    setStatus('analyzing');
    setAnalysisResult(undefined);

    // Use our internal API proxy to avoid CORS issues
    const proxyUrl = '/api/analyze';

    try {
      toast.info('Sending Multi-Timeframe Data to AI Engine...');
      const formData = new FormData();

      // Append files with specific keys matching n8n logic
      formData.append('image_htf', files.htf);  // 4H Chart
      formData.append('image_mid', files.mid); // 1H Chart
      formData.append('image_ltf', files.ltf); // 15M Chart

      // Send to Next.js API Proxy
      const response = await axios.post(proxyUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        // Handle n8n response via proxy
        const data = Array.isArray(response.data) ? response.data[0] : response.data;

        // Check for error from proxy
        if (data.error) {
          throw new Error(data.error);
        }

        setAnalysisResult({
          signal: data.signal_type || data.signal || 'NEUTRAL',
          sl: data.stop_loss || 0,
          tp: data.take_profit || 0,
          reasoning: data.reasoning || "No reasoning provided.",
          confidence: data.confidence || 0,
          asset: data.asset_name || "Unknown Asset"
        });

        setStatus('completed');
        setHasAnalyzed(true);
        toast.success('SMC Analysis Complete');
      } else {
        throw new Error("No data returned from analysis");
      }

    } catch (error: any) {
      console.error("Analysis Failed:", error);
      setStatus('awaiting');

      const errorData = error.response?.data;
      const errorMessage = errorData?.error || error.message || 'Unknown error occurred';
      const errorDetails = errorData?.details ? `Details: ${errorData.details}` : '';

      toast.error('Analysis Failed', {
        description: errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage
      });

      if (errorMessage.includes('N8N Webhook URL is not configured')) {
        // Optional: Trigger simulation fallback if desired, or just warn user
        toast.warning("Check your .env.local configuration.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex flex-col h-screen font-sans selection:bg-amber-100 selection:text-amber-900 transition-colors duration-300" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Toaster for notifications */}
      <Toaster position="top-right" richColors />

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto lg:overflow-hidden">

        {activeTab === 'analysis' ? (
          <div className="flex flex-col lg:flex-row gap-6 lg:h-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Left Panel: Input Source */}
            <div className="w-full lg:w-[400px] flex-shrink-0 lg:h-full h-[550px] lg:h-auto">
              {/* @ts-ignore - Temporary until InputPanel types are reloaded */}
              <InputPanel
                files={files}
                onFilesChange={(newFiles) => {
                  setFiles(newFiles);
                  setHasAnalyzed(false);
                }}
                onClearAll={() => {
                  setAnalysisResult(undefined);
                  setStatus('awaiting');
                  localStorage.removeItem('hive_analysis_result');
                  setHasAnalyzed(false);
                }}
                onAnalyze={handleAnalysis}
                isLoading={isProcessing}
                hasAnalyzed={hasAnalyzed}
              />
            </div>

            {/* Right Panel: AI Execution Engine */}
            <div className="flex-1 h-[600px] lg:h-full">
              <ExecutionPanel status={status} result={analysisResult} />
            </div>
          </div>
        ) : (
          <div className="lg:h-full min-h-[600px] max-w-[1200px] mx-auto w-full animate-in fade-in duration-500">
            <HistoryTable
              onView={(trade) => {
                setAnalysisResult({
                  signal: trade.signal,
                  sl: trade.sl,
                  tp: trade.tp,
                  reasoning: trade.reasoning,
                  confidence: trade.confidence,
                  asset: trade.asset
                });
                setActiveTab('analysis');
                toast.success('Loaded analysis from history');
              }}
              onDelete={async (id) => {
                // Optimistic update handled in component, or refresh here if needed
              }}
            />
          </div>
        )}

      </div>

      {/* Decorative Blur Elements */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0" style={{ backgroundColor: 'var(--blur-1)' }}></div>
      <div className="fixed -top-32 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0" style={{ backgroundColor: 'var(--blur-2)' }}></div>

    </main>
  );
}
