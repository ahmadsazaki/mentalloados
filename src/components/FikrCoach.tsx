import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2, Sparkles, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Task } from '../types';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface Props {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  apiKey: string | null;
}

export const FikrCoach: React.FC<Props> = ({ task, isOpen, onClose, onUpdateTask, apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hi! I'm your Fikr Coach. I see you're working on "${task.title}". It has a cognitive load score of ${task.cognitive_load_score.toFixed(1)}. How are you feeling about starting this task? Is there a specific part that feels overwhelming?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scroll = scrollRef.current;
      requestAnimationFrame(() => {
        scroll.scrollTop = scroll.scrollHeight;
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // We'll use a specialized endpoint for coaching or reuse the existing AI extraction logic
      // For now, let's assume we have a /api/ai/coach endpoint
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          history: messages,
          userInput: userMsg,
          apiKey: apiKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to get a response');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error: any) {
      console.error('Coaching failed', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I hit a snag: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-end p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-3xl shadow-2xl border border-black/5 dark:border-white/10 flex flex-col pointer-events-auto overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Fikr AI Coach</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest font-mono">Cognitive Support</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-950/50"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-black/5 dark:border-white/10 rounded-tl-none'
                    }`}>
                      <ReactMarkdown 
                        components={{
                          h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ children }) => <code className="bg-black/5 dark:bg-white/10 px-1 rounded font-mono text-[11px] font-medium">{children}</code>,
                          strong: ({ children }) => <strong className="font-bold text-indigo-600 dark:text-indigo-400">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-indigo-600 shadow-sm flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-black/5 dark:border-white/10">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-black/5 dark:border-white/10">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your thoughts..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-slate-200"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-center text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Powered by AI Coaching Engine
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
