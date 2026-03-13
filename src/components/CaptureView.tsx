import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, Loader2, Mic, MicOff, Paperclip, X, FileIcon } from 'lucide-react';

interface Props {
  onExtract: (text: string, attachments?: string[]) => Promise<void>;
}

export const CaptureView: React.FC<Props> = ({ onExtract }) => {
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setText(prev => prev + finalTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCapture = async () => {
    if (!text.trim()) return;
    setIsExtracting(true);
    try {
      let attachmentPaths: string[] = [];
      
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        attachmentPaths = data.paths;
      }

      await onExtract(text, attachmentPaths);
      setText('');
      setFiles([]);
    } catch (error) {
      console.error("Capture failed", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border-2 transition-[border-color,background-color,transform] duration-200 ${
        isDragging ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.01]' : 'border-black/5 dark:border-white/10'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Brain Dump</h3>
        </div>
        {files.length > 0 && (
          <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
            {files.length} attachment{files.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? Don't worry about formatting..."
          className="w-full h-32 p-4 bg-gray-50 dark:bg-slate-950 rounded-xl border-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
        
        <button
          onClick={handleCapture}
          disabled={isExtracting || !text.trim()}
          className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExtracting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={toggleListening}
          className={`absolute bottom-3 right-14 p-2 rounded-lg transition-colors ${
            isListening ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10 text-[11px] group">
              <FileIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span className="max-w-[100px] truncate dark:text-gray-300">{file.name}</span>
              <button 
                onClick={() => removeFile(i)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-3 flex justify-between items-center">
        <p className="text-[10px] text-gray-400 italic">
          AI will automatically extract tasks, dates, and load estimates.
        </p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
          <label className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded">
            <Paperclip className="w-3 h-3" />
            <span>ADD OR DRAG FILES</span>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files) {
                  setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
