import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Calendar, Mail, ArrowRight, Check, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  onComplete: (scopes: string[]) => void;
}

export const OnboardingView: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleComplete = async () => {
    setError(null);
    try {
      const scopeQuery = selectedScopes.length > 0 ? `?scopes=${selectedScopes.join(',')}` : '';
      const res = await fetch(`/api/auth/google/url${scopeQuery}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to get authentication URL");
      }

      window.open(data.url, 'google_oauth', 'width=600,height=700');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const steps = [
    {
      title: "Welcome to MentalLoadOS",
      description: "The first operating system designed for your cognitive bandwidth. Let's get you set up.",
      icon: <BrainCircuit className="w-12 h-12 text-indigo-600" />
    },
    {
      title: "Connect Your World",
      description: "MentalLoadOS works best when it can see your commitments. Choose what you've like to sync.",
      icon: <Sparkles className="w-12 h-12 text-indigo-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-black/5 overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 p-4 bg-indigo-50 rounded-2xl">
                {steps[step - 1].icon}
              </div>
              
              <h2 className="text-2xl font-bold mb-3">{steps[step - 1].title}</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {steps[step - 1].description}
              </p>

              {step === 2 && (
                <div className="w-full space-y-3 mb-8">
                  <button
                    onClick={() => toggleScope('https://www.googleapis.com/auth/calendar.readonly')}
                    className={`w-full p-4 rounded-2xl border-2 transition-colors flex items-center justify-between ${
                      selectedScopes.includes('https://www.googleapis.com/auth/calendar.readonly')
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Google Calendar</p>
                        <p className="text-[10px] text-gray-400">Sync meetings & events</p>
                      </div>
                    </div>
                    {selectedScopes.includes('https://www.googleapis.com/auth/calendar.readonly') && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleScope('https://www.googleapis.com/auth/gmail.readonly')}
                    className={`w-full p-4 rounded-2xl border-2 transition-colors flex items-center justify-between ${
                      selectedScopes.includes('https://www.googleapis.com/auth/gmail.readonly')
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Mail className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Gmail Inbox</p>
                        <p className="text-[10px] text-gray-400">Identify pending decisions</p>
                      </div>
                    </div>
                    {selectedScopes.includes('https://www.googleapis.com/auth/gmail.readonly') && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="w-full p-4 mb-6 bg-red-50 border border-red-100 rounded-2xl text-left">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-wider">Configuration Error</p>
                  </div>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    {error}
                  </p>
                  <p className="mt-2 text-[10px] text-red-600 font-medium">
                    Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the AI Studio Settings menu.
                  </p>
                </div>
              )}

              <div className="w-full flex flex-col gap-4">
                {step === 1 ? (
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                  >
                    Sign in with Google
                    <ShieldCheck className="w-5 h-5" />
                  </button>
                )}
                
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                  Step {step} of 2
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="bg-gray-50 p-4 border-t border-black/5 text-center">
          <p className="text-[10px] text-gray-400">
            By continuing, you agree to our privacy policy regarding cognitive data.
          </p>
        </div>
      </div>
    </div>
  );
};
