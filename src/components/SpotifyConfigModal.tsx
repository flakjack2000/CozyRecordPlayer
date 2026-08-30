import React, { useState, useEffect } from 'react';
import { SpotifyUserProfile } from '../types';
import { SpotifyAuthService } from '../services/spotifyAuth';
import { 
  Check, 
  Copy, 
  ExternalLink, 
  KeyRound, 
  LogOut, 
  Sparkles, 
  HelpCircle, 
  Disc3,
  AlertCircle
} from 'lucide-react';

interface SpotifyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SpotifyUserProfile | null;
  onConnectSuccess: () => void;
  onDisconnect: () => void;
}

export const SpotifyConfigModal: React.FC<SpotifyConfigModalProps> = ({
  isOpen,
  onClose,
  user,
  onConnectSuccess,
  onDisconnect,
}) => {
  const [clientId, setClientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedShared, setCopiedShared] = useState(false);

  const devCallbackUrl = `${window.location.origin}/auth/callback`;
  const sharedCallbackUrl = 'https://ais-pre-e3cgc75qa3wwt73bnsi3zj-590911044345.europe-west2.run.app/auth/callback';

  useEffect(() => {
    SpotifyAuthService.getClientId().then((id) => {
      if (id) setClientId(id);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'dev' | 'shared') => {
    navigator.clipboard.writeText(text);
    if (type === 'dev') {
      setCopiedDev(true);
      setTimeout(() => setCopiedDev(false), 2000);
    } else {
      setCopiedShared(true);
      setTimeout(() => setCopiedShared(false), 2000);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      setErrorMsg('Please enter your Spotify Client ID.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await SpotifyAuthService.loginWithSpotify(clientId.trim());
      if (result.success) {
        onConnectSuccess();
        onClose();
      } else {
        setErrorMsg(result.error || 'Authentication failed. Please check your Redirect URIs.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Disc3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100 font-display">
              Spotify Integration &amp; Vinyl Settings
            </h2>
            <p className="text-xs text-stone-400 font-mono-code">
              OAuth 2.0 PKCE • Web Playback SDK &amp; Web API
            </p>
          </div>
        </div>

        {/* Connected Profile State */}
        {user ? (
          <div className="bg-stone-950/80 rounded-2xl p-5 border border-emerald-500/30 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover border border-emerald-400/50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-900/60 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/40">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-100">{user.displayName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {user.product}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-mono-code mt-0.5">{user.email || 'Connected Account'}</p>
                </div>
              </div>

              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700 hover:border-red-500/40 text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* Connect Form */
          <form onSubmit={handleConnect} className="space-y-4 mb-6">
            
            <div>
              <label className="block text-xs font-mono-code text-stone-300 mb-1.5 flex items-center justify-between">
                <span>SPOTIFY CLIENT ID</span>
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                >
                  <span>Spotify Developer Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  id="spotify-client-id-input"
                  type="text"
                  placeholder="e.g. 7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 text-xs font-mono-code focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="spotify-auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Disc3 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Spotify...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Connect With Spotify</span>
                </>
              )}
            </button>

          </form>
        )}

        {/* Step by Step Setup Instructions & Exact Callback URLs */}
        <div className="border-t border-stone-800 pt-5 space-y-4 text-xs">
          
          <div className="flex items-center gap-2 text-stone-300 font-bold uppercase font-mono-code text-[11px]">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How to configure your free Spotify App:</span>
          </div>

          <ol className="space-y-2.5 text-stone-400 text-xs leading-relaxed list-decimal list-inside">
            <li>
              Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">developer.spotify.com/dashboard</a> and log in.
            </li>
            <li>Click <strong>Create app</strong> (App name: e.g. <em>Vinyl Shelf Player</em>).</li>
            <li>
              In <strong>Redirect URIs</strong>, add these exact URLs:
              
              {/* Development URL Box */}
              <div className="mt-2 p-2.5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="block text-[10px] text-stone-500 font-mono-code uppercase">Development Callback:</span>
                  <code className="text-[11px] text-emerald-400 font-mono-code truncate block">{devCallbackUrl}</code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(devCallbackUrl, 'dev')}
                  className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-white text-[11px] flex items-center gap-1 shrink-0"
                >
                  {copiedDev ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDev ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Shared URL Box */}
              <div className="mt-2 p-2.5 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="block text-[10px] text-stone-500 font-mono-code uppercase">Shared / Production Callback:</span>
                  <code className="text-[11px] text-emerald-400 font-mono-code truncate block">{sharedCallbackUrl}</code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(sharedCallbackUrl, 'shared')}
                  className="px-2 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 hover:text-white text-[11px] flex items-center gap-1 shrink-0"
                >
                  {copiedShared ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedShared ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

            </li>
            <li>Under <strong>Which APIs are you using?</strong> select <strong>Web API</strong> and <strong>Web Playback SDK</strong>.</li>
            <li>Save, copy your <strong>Client ID</strong>, paste it above, and click <strong>Connect</strong>!</li>
          </ol>

        </div>

      </div>
    </div>
  );
};
