import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Mail, CheckCircle2, AlertCircle, ExternalLink, LogOut, BrainCircuit, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export const IntegrationsView: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(profile?.openrouter_api_key || '');

  useEffect(() => {
    setApiKey(profile?.openrouter_api_key || '');
  }, [profile?.openrouter_api_key]);

  useEffect(() => {
    checkStatus();
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      setIsConnected(data.connected);
    } catch (error) {
      console.error("Error checking auth status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const scopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/gmail.readonly'
      ];
      const res = await fetch(`/api/auth/google/url?scopes=${scopes.join(',')}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to get authentication URL");
      }

      window.open(data.url, 'google_oauth', 'width=600,height=700');
    } catch (error: any) {
      console.error("Error getting auth URL", error);
      setError(error.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google?")) return;
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' });
      setIsConnected(false);
    } catch (error) {
      console.error("Error disconnecting", error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Checking connections...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">Google Integration</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Connect your Google account to sync Calendar and Gmail.</p>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full text-xs font-medium">
              <AlertCircle className="w-3 h-3" />
              Disconnected
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Configuration Error</p>
            </div>
            <p className="text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
              {error}
            </p>
            <p className="mt-2 text-[10px] text-red-600 dark:text-red-400 font-medium">
              Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the AI Studio Settings menu.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Google Calendar</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Sync your meetings and events to automatically calculate coordination load.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-red-500" />
              <span className="font-medium">Gmail</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Analyze your inbox to identify pending decisions and high-worry threads.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/10 flex gap-3">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Google
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Connect Google Account
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <BrainCircuit className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-medium">AI Provider Settings</h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10">
            <div>
              <p className="text-sm font-medium">Provider</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose your cognitive extraction engine</p>
            </div>
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-black/5 dark:border-white/10">
              <button
                onClick={() => onUpdateProfile({ ai_provider: 'openrouter' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  profile?.ai_provider === 'openrouter' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                OpenRouter
              </button>
              <button
                onClick={() => onUpdateProfile({ ai_provider: 'gemini' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  profile?.ai_provider === 'gemini' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Gemini (Studio)
              </button>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">OpenRouter API Key</label>
              {profile?.openrouter_api_key ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Custom Key Active</span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Using Free Models</span>
              )}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => {
                const trimmed = apiKey.trim();
                onUpdateProfile({ openrouter_api_key: trimmed || null });
              }}
              placeholder="sk-or-v1-..."
              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-black/5 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Required for high-performance models (Claude, GPT-4, etc). Leave empty to use OpenRouter's free tier.
            </p>
          </div>

          {profile?.ai_provider === 'openrouter' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extraction Model</label>
              <div className="relative">
                <select
                  value={profile.ai_model}
                  onChange={(e) => onUpdateProfile({ ai_model: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-sm appearance-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <optgroup label="General / Auto">
                    <option value="google/gemini-2.0-flash-lite:free">Gemini 2.0 Flash Lite (Free)</option>
                    <option value="openrouter/auto">OpenRouter Auto (Best Available)</option>
                  </optgroup>
                  <optgroup label="High Performance (Requires API Key)" disabled={!profile?.openrouter_api_key}>
                    <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                    <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {profile?.ai_provider === 'gemini' && (
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gemini API Key</label>
                {profile?.gemini_api_key ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Key Active</span>
                ) : (
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Key Required</span>
                )}
              </div>
              <input
                type="password"
                value={profile?.gemini_api_key || ''}
                onChange={(e) => onUpdateProfile({ gemini_api_key: e.target.value })}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  onUpdateProfile({ gemini_api_key: trimmed || null });
                }}
                placeholder="AIza..."
                className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-black/5 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" className="text-indigo-500 underline font-medium">Google AI Studio</a>. Uses the Gemini 2.0 Flash Lite model (free).
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2 uppercase tracking-wider">Setup Instructions</h4>
        <ol className="text-xs text-indigo-800 dark:text-indigo-300 space-y-2 list-decimal list-inside">
          <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" className="underline font-bold">Google Cloud Console</a>.</li>
          <li>Create a new project and enable <b>Google Calendar API</b> and <b>Gmail API</b>.</li>
          <li>Configure the OAuth consent screen (Internal or External).</li>
          <li>Create <b>OAuth 2.0 Client IDs</b> (Web application).</li>
          <li>Add the following <b>Authorized redirect URIs</b>:
            <code className="block mt-1 p-2 bg-white dark:bg-slate-900 rounded border border-indigo-200 dark:border-indigo-500/30 font-mono break-all">
              {window.location.origin}/auth/google/callback
            </code>
          </li>
          <li>Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your environment settings.</li>
        </ol>
      </div>
    </div>
  );
};
