import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Sparkles, Zap, ShieldCheck, Info, Lightbulb } from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex p-3 bg-indigo-100 rounded-2xl mb-4">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome to MentalLoadOS</h2>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          The cognitive operating system designed to externalize your mental load and optimize your bandwidth.
        </p>
      </div>

      {/* Core Concept */}
      <section className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-medium uppercase tracking-wider text-sm text-gray-500">The Concept</h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Mental load isn't just about "doing" things—it's about the invisible energy required to remember, plan, and worry about them. 
          MentalLoadOS uses <strong>Cognitive Load Scoring (CLS)</strong> to quantify this weight, helping you see exactly how much "RAM" your brain is using at any moment.
        </p>
      </section>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-black/5">
          <Sparkles className="w-5 h-5 text-indigo-500 mb-3" />
          <h4 className="font-medium mb-1">AI Brain Dump</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Speak or type your thoughts freely. Our AI extracts tasks, estimates effort, and categorizes them automatically.
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-black/5">
          <ShieldCheck className="w-5 h-5 text-green-500 mb-3" />
          <h4 className="font-medium mb-1">RAM Monitoring</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Track your total load against your daily capacity. Know when you're in the "Burnout Risk" zone before it happens.
          </p>
        </div>
      </div>

      {/* Scoring Formula */}
      <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-indigo-400" />
          <h3 className="font-medium uppercase tracking-wider text-sm text-indigo-300">The CLS Formula</h3>
        </div>
        <div className="font-mono text-lg mb-4 text-center py-4 bg-white/5 rounded-xl">
          CLS = E + U + D + C + W
        </div>
        <div className="grid grid-cols-2 gap-y-3 text-[10px] uppercase tracking-widest opacity-80">
          <div><span className="text-indigo-400 font-bold">E</span>ffort</div>
          <div><span className="text-indigo-400 font-bold">U</span>rgency</div>
          <div><span className="text-indigo-400 font-bold">D</span>ecision</div>
          <div><span className="text-indigo-400 font-bold">C</span>oordination</div>
          <div className="col-span-2"><span className="text-indigo-400 font-bold">W</span>orry (Emotional Weight)</div>
        </div>
      </section>

      {/* Tips */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-orange-400" />
          <h3 className="font-medium uppercase tracking-wider text-sm text-gray-500">Pro Tips</h3>
        </div>
        <ul className="space-y-3">
          {[
            "Use the 'Capture' tab for a 30-second brain dump every morning.",
            "Customize your categories in the 'Map' tab to match your life domains.",
            "Trust the 'Next Best Action' when you're feeling overwhelmed.",
            "Complete tasks to free up 'Mental RAM' instantly."
          ].map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-600">
              <span className="text-indigo-500 font-bold">0{i+1}</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </motion.div>
  );
};
