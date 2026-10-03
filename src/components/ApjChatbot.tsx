import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Minimize2, 
  Maximize2, 
  Orbit, 
  ChevronRight, 
  Lightbulb, 
  Check, 
  HelpCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { LunarDatasetPair, PipelineMetrics, PipelineStage } from '../types/lunar';

interface Message {
  id: string;
  sender: 'user' | 'apj';
  content: string;
  timestamp: string;
  actions?: { label: string; action: string }[];
}

interface ApjChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: LunarDatasetPair;
  metrics: PipelineMetrics;
  currentStage: PipelineStage;
  filterMode: string;
  onTriggerAction: (action: string) => void;
}

const QUICK_PROMPTS = [
  'Why do grazing Sun angles cause crater mismatch?',
  'How does Phase Congruency strip shadow bias?',
  'Explain the proof of sub-pixel accuracy < 0.20 px.',
  'How does Quad-Tree guarantee uniform point distribution?',
  'Evaluate current dataset alignment telemetry.',
];

export const ApjChatbot: React.FC<ApjChatbotProps> = ({
  isOpen,
  onClose,
  dataset,
  metrics,
  currentStage,
  filterMode,
  onTriggerAction,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'apj',
      content: `Greetings! I am APJ, your ISRO Lunar Mission and Image Correspondence Scientific Assistant. 

I am here to guide you through solving the Chandrayaan-2 multi-modal, sun-angle, and scale-invariant correspondence challenge. Currently inspecting **${dataset.title}** with a sub-pixel RMSE of **${metrics.subPixelRMSE.toFixed(3)} px** and **${metrics.inlierRatioPercent}% inlier ratio**.

How may I assist your scientific inquiry or pipeline execution?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Activate Phase Congruency', action: 'enable_pc' },
        { label: 'Switch to Wipe Curtain View', action: 'view_curtain' },
        { label: 'Run Full Pipeline', action: 'run_pipeline' }
      ]
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.content,
          })),
          context: {
            currentDataset: dataset.title,
            sourceSensor: dataset.sourceMeta.sensor,
            refSensor: dataset.refMeta.sensor,
            sunElevationDelta: Math.abs(dataset.sourceMeta.sunElevationDeg - dataset.refMeta.sunElevationDeg),
            sunAzimuthDelta: Math.abs(dataset.sourceMeta.sunAzimuthDeg - dataset.refMeta.sunAzimuthDeg),
            subPixelRMSE: metrics.subPixelRMSE,
            inlierRatio: metrics.inlierRatioPercent,
            spatialUniformity: metrics.spatialUniformityScore,
            filterMode,
            currentStage,
          },
        }),
      });

      const data = await response.json();

      let actions: { label: string; action: string }[] | undefined = undefined;
      if (query.toLowerCase().includes('sun') || query.toLowerCase().includes('shadow')) {
        actions = [
          { label: 'Open Sun-Angle Sandbox', action: 'open_sandbox' },
          { label: 'Enable Phase Congruency', action: 'enable_pc' }
        ];
      } else if (query.toLowerCase().includes('sub-pixel') || query.toLowerCase().includes('accuracy')) {
        actions = [
          { label: 'View Residual Heatmap', action: 'view_heatmap' },
          { label: 'Inspect Inlier Metrics', action: 'open_metrics' }
        ];
      }

      const botMsg: Message = {
        id: `apj-${Date.now()}`,
        sender: 'apj',
        content: data.reply || 'Analysis completed according to ISRO planetary standards.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const fallbackMsg: Message = {
        id: `apj-${Date.now()}`,
        sender: 'apj',
        content: `My apologies, scientific telemetry was momentarily interrupted. 

Regarding your question: When dealing with Chandrayaan-2 OHRC (0.25m) and TMC-2 (5.0m), the key is that surface reflectance gradients lie, but Phase Congruency captures spatial frequency phase alignment. This ensures sub-pixel tie-points lock onto true crater rim morphology rather than deceptive shadow shifts.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col ${
        isExpanded
          ? 'inset-4 md:inset-10 bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl'
          : 'bottom-4 right-4 w-[95vw] sm:w-[440px] h-[580px] bg-slate-950/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl'
      }`}
    >
      {/* Assistant Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-3.5 border-b border-amber-500/30 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 via-orange-600/30 to-cyan-500/20 border border-amber-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Orbit className="w-5 h-5 text-amber-300 animate-spin-slow" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Dr. APJ
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                ISRO Lunar AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Scientific & Algorithmic Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="bg-slate-900/60 px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
        <span className="text-amber-400 shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          Ask:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 border border-slate-700 transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 shadow-md whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>

            {/* Interactive Action Chips inside APJ responses */}
            {m.actions && m.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                {m.actions.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => onTriggerAction(act.action)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-medium transition flex items-center gap-1 shadow-sm"
                  >
                    <ChevronRight className="w-2.5 h-2.5 text-amber-400" />
                    {act.label}
                  </button>
                ))}
              </div>
            )}

            <span className="text-[9px] text-slate-500 mt-1 font-mono px-1">
              {m.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-amber-300 font-mono w-fit animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>APJ is analyzing lunar correspondence telemetry...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask APJ about sun angle invariance, sub-pixel math, or OHRC..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
