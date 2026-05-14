"use client";

import { useState, useEffect } from 'react';

interface AgentPrompt {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface AgentPromptModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onSave: (agentId: string, prompt: AgentPrompt) => void;
}

const defaultPrompts: Record<string, AgentPrompt> = {
  product: {
    systemPrompt: "You are the Product Agent. Your role is to build features, write product specifications, and assist developers with technical requirements. Focus on user value, clear documentation, and actionable deliverables.",
    temperature: 0.7,
    maxTokens: 2000,
  },
  dev: {
    systemPrompt: "You are the Dev Agent. Your role is to generate code, write tests, and fix bugs. Use OpenCode for implementation tasks. Follow best practices, write clean code, and include error handling.",
    temperature: 0.5,
    maxTokens: 4000,
  },
  growth: {
    systemPrompt: "You are the Growth Agent. Your role is to draft marketing campaigns for plumbers, electricians, and caterers. Focus on compelling copy, clear CTAs, and audience targeting.",
    temperature: 0.8,
    maxTokens: 1500,
  },
  sales: {
    systemPrompt: "You are the Sales Agent. Your role is to qualify leads and draft proposals. Use BANT framework (Budget, Authority, Need, Timeline) for qualification. Create persuasive, professional proposals.",
    temperature: 0.6,
    maxTokens: 2000,
  },
  ops: {
    systemPrompt: "You are the Ops Agent. Your role is to track revenue, monitor usage, and identify churn signals. Generate reports, analyze metrics, and provide actionable insights.",
    temperature: 0.4,
    maxTokens: 1500,
  },
  founder: {
    systemPrompt: "You are the Founder Agent. Your role is to convert Notion notes into Linear projects and tasks. Extract actionable items, organize by priority, and create structured project plans.",
    temperature: 0.5,
    maxTokens: 2000,
  },
};

export function AgentPromptModal({ agentId, agentName, onClose, onSave }: AgentPromptModalProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`agent-prompt-${agentId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSystemPrompt(parsed.systemPrompt || defaultPrompts[agentId]?.systemPrompt || '');
        setTemperature(parsed.temperature ?? defaultPrompts[agentId]?.temperature ?? 0.7);
        setMaxTokens(parsed.maxTokens ?? defaultPrompts[agentId]?.maxTokens ?? 2000);
        return;
      } catch (e) {
        console.error('Failed to parse saved prompt:', e);
      }
    }
    const defaultPrompt = defaultPrompts[agentId];
    if (defaultPrompt) {
      setSystemPrompt(defaultPrompt.systemPrompt);
      setTemperature(defaultPrompt.temperature);
      setMaxTokens(defaultPrompt.maxTokens);
    }
  }, [agentId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(agentId, { systemPrompt, temperature, maxTokens });
      onClose();
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">
            <i className="material-symbols-rounded me-2">edit_note</i>
            Edit {agentName} Prompt
          </h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                rows={8}
                placeholder="Enter the system prompt..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {systemPrompt.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise (0)</span>
                <span>Creative (1)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="500"
                max="8000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>500</span>
                <span>8000</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h6 className="text-sm font-semibold text-blue-800 mb-2">
                <i className="material-symbols-rounded me-1">info</i>
                Tips
              </h6>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Be specific about the agent's role and responsibilities</li>
                <li>• Include examples of expected output format</li>
                <li>• Lower temperature for more consistent responses</li>
                <li>• Higher temperature for more creative outputs</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !systemPrompt.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="material-symbols-rounded me-2 animate-spin">refresh</i>
                Saving...
              </>
            ) : (
              <>
                <i className="material-symbols-rounded me-2">check</i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
