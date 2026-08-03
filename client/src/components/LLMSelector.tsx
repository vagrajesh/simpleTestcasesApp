import { useState, useEffect } from 'react';
import type { LLMProvider, LLMConfig } from '@shared/types';

const STORAGE_KEY = 'tcg_llm_config';

const GROQ_MODELS: string[] = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];
const OPENAI_MODELS: string[] = ['gpt-5.4-mini'];
const LOCAL_MODELS: string[]  = ['llama3.1:8b', 'llama3:8b', 'mistral:7b', 'codellama:7b', 'phi3:mini'];
const LOCAL_MODEL_DEFAULT = ''; // empty string = let the server decide

interface StoredConfig {
  provider?: LLMProvider;
  selectedModel?: string;
  customModel?: string;
  useCustomModel?: boolean;
  endpoint?: string;
  apiKey?: string;
  appendPath?: boolean;
  mergePromptsToUser?: boolean;
}

function loadFromStorage(): StoredConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredConfig) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data: StoredConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

interface Props {
  onChange: (config: LLMConfig) => void;
}

/**
 * LLM provider/model/endpoint selector.
 * Persists selection to localStorage under `tcg_llm_config`.
 * Calls `onChange(config)` whenever the effective config changes.
 */
export default function LLMSelector({ onChange }: Props) {
  const [provider, setProvider]                   = useState<LLMProvider>('groq');
  const [selectedModel, setSelectedModel]         = useState<string>('llama-3.3-70b-versatile');
  const [customModel, setCustomModel]             = useState<string>('');
  const [useCustomModel, setUseCustomModel]       = useState<boolean>(false);
  const [endpoint, setEndpoint]                   = useState<string>('http://localhost:11434');
  const [apiKey, setApiKey]                       = useState<string>('');
  const [appendPath, setAppendPath]               = useState<boolean>(true);
  const [mergePromptsToUser, setMergePromptsToUser] = useState<boolean>(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (!saved) return;
    if (saved.provider) setProvider(saved.provider);
    if (saved.selectedModel) setSelectedModel(saved.selectedModel);
    if (saved.customModel) setCustomModel(saved.customModel);
    if (typeof saved.useCustomModel === 'boolean') setUseCustomModel(saved.useCustomModel);
    if (saved.endpoint) setEndpoint(saved.endpoint);
    if (saved.apiKey) setApiKey(saved.apiKey);
    if (typeof saved.appendPath === 'boolean') setAppendPath(saved.appendPath);
    if (typeof saved.mergePromptsToUser === 'boolean') setMergePromptsToUser(saved.mergePromptsToUser);
  }, []);

  // Notify parent + persist on every change
  useEffect(() => {
    const effectiveModel = useCustomModel ? customModel.trim() : selectedModel;
    const config: LLMConfig = {
      provider,
      ...(effectiveModel ? { model: effectiveModel } : {}),
      ...(provider === 'local' && { endpoint, appendPath, mergePromptsToUser }),
      ...(provider === 'local' && apiKey && { apiKey }),
    };
    saveToStorage({ provider, selectedModel, customModel, useCustomModel, endpoint, apiKey, appendPath, mergePromptsToUser });
    onChange(config);
  }, [provider, selectedModel, customModel, useCustomModel, endpoint, apiKey, appendPath, mergePromptsToUser]);

  const switchProvider = (p: LLMProvider): void => {
    setProvider(p);
    setUseCustomModel(false);
    if (p === 'groq') setSelectedModel(GROQ_MODELS[0]);
    else if (p === 'openai') setSelectedModel(OPENAI_MODELS[0]);
    else setSelectedModel(LOCAL_MODEL_DEFAULT);
  };

  const modelList = provider === 'groq' ? GROQ_MODELS : provider === 'openai' ? OPENAI_MODELS : LOCAL_MODELS;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">LLM Configuration</h2>

      {/* Provider toggle */}
      <div className="flex rounded-lg bg-gray-800 p-1 gap-1">
        {([
          { id: 'groq'  as LLMProvider, label: 'Groq' },
          { id: 'openai' as LLMProvider, label: 'OpenAI' },
          { id: 'local' as LLMProvider, label: 'Local LLM' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchProvider(id)}
            className={`flex-1 py-1.5 px-3 text-sm rounded-md font-medium transition-colors cursor-pointer ${
              provider === id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Model */}
      <div className="space-y-1">
        <label className="block text-xs text-gray-400">Model</label>
        {useCustomModel ? (
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder={provider === 'groq' ? 'e.g. llama-3.3-70b-versatile' : 'e.g. llama3.1:8b'}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {provider === 'local' && (
              <option value="">Default (server-configured)</option>
            )}
            {modelList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setUseCustomModel((v) => !v)}
          className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
        >
          {useCustomModel ? '← Use preset list' : 'Enter custom model name'}
        </button>
      </div>

      {/* Local LLM extras */}
      {provider === 'local' && (
        <>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={appendPath}
                onChange={(e) => setAppendPath(e.target.checked)}
                className="accent-indigo-500"
              />
              <span className="text-xs text-gray-400">
                Append <code className="text-gray-300">/v1/chat/completions</code> to endpoint
              </span>
            </label>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mergePromptsToUser}
                onChange={(e) => setMergePromptsToUser(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-xs text-gray-400">
                Merge instructions into user message
                <span className="ml-1 text-gray-600">(for models that ignore system role)</span>
              </span>
            </label>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Endpoint URL</label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500">
              Ollama: <code className="text-gray-400">http://localhost:11434</code> · LM Studio: <code className="text-gray-400">http://localhost:1234</code>
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-gray-400">
              API Key <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave blank if not required"
              autoComplete="off"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </>
      )}

      <p className="text-xs text-gray-600">
        Config saved in your browser. Keys are sent only to your own backend.
      </p>
    </div>
  );
}
