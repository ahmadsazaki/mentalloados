import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, AlignLeft, Paperclip, Archive, Trash2, CheckCircle2, Circle, Quote, Repeat, Sparkles } from 'lucide-react';
import { Task } from '../types';
import { FikrCoach } from './FikrCoach';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string, archived: boolean) => Promise<void>;
  apiKey: string | null;
}

export const TaskDetailModal: React.FC<Props> = ({ task, onClose, onUpdate, onDelete, onArchive, apiKey }) => {
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isPushingToCalendar, setIsPushingToCalendar] = useState(false);

  React.useEffect(() => {
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => setIsGoogleConnected(data.connected));
  }, []);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [recurrenceRule, setRecurrenceRule] = useState(task.recurrence_rule || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(task.id, { 
      title, 
      description: description || null, 
      notes, 
      due_date: dueDate || null,
      recurrence_rule: recurrenceRule || null
    });
    setIsSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    const formData = new FormData();
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      const currentAttachments = task.attachments ? JSON.parse(task.attachments) : [];
      const newAttachments = [...currentAttachments, ...data.paths];
      
      await onUpdate(task.id, { attachments: JSON.stringify(newAttachments) });
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePushToCalendar = async () => {
    setIsPushingToCalendar(true);
    try {
      const start = task.due_date ? new Date(task.due_date) : new Date();
      // Set to 9am if no time component (date only)
      if (start.getHours() === 0 && start.getMinutes() === 0) {
        start.setHours(9, 0, 0, 0);
      }
      
      const durationMins = (task.effort_score || 5) * 6; // Scale 1-10 to 6-60 mins
      const end = new Date(start.getTime() + durationMins * 60000);

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: task.title,
          description: task.description || '',
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString()
        })
      });

      if (res.ok) {
        alert('Event added to Google Calendar!');
      } else {
        const err = await res.json();
        alert(`Failed to add: ${err.details || err.error}`);
      }
    } catch (error) {
      console.error('Calendar push failed', error);
      alert('Failed to connect to calendar service.');
    } finally {
      setIsPushingToCalendar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: task.category_color || '#ccc' }}
            />
            <span className="text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {task.category_name}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div>
            <div className="flex items-start gap-4 mb-4">
              <button 
                onClick={() => onUpdate(task.id, { completed: !task.completed })}
                className="mt-1 text-gray-300 hover:text-indigo-500 transition-colors shrink-0"
              >
                {task.completed ? <CheckCircle2 className="w-7 h-7 text-green-500" /> : <Circle className="w-7 h-7" />}
              </button>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className={`text-2xl font-bold leading-tight w-full bg-transparent border-none focus:ring-0 p-0 ${task.completed ? 'line-through text-gray-400 dark:text-gray-600' : 'text-slate-900 dark:text-slate-100'} placeholder:text-gray-300 dark:placeholder:text-gray-600`}
                placeholder="Task Title"
              />
            </div>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              className="text-gray-500 dark:text-gray-400 ml-11 w-[calc(100%-2.75rem)] bg-transparent border-none focus:ring-0 p-0 resize-none placeholder:text-gray-300 dark:placeholder:text-gray-600 min-h-[40px]"
              placeholder="Add a description (optional)..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
              <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1">Cognitive Load</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{task.cognitive_load_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-black/5 dark:border-white/10">
              <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Created</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {new Date(task.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider">Due Date</label>
              </div>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleSave}
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
              />
              {isGoogleConnected && task.due_date && (
                <button 
                  onClick={handlePushToCalendar}
                  disabled={isPushingToCalendar}
                  className="mt-2 w-full p-2 flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-500/10"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {isPushingToCalendar ? 'Scheduling...' : 'Add to Google Calendar'}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Repeat className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider">Recurrence</label>
              </div>
              <select 
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                onBlur={handleSave}
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/20 dark:text-slate-200"
              >
                <option value="">No Repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <AlignLeft className="w-4 h-4" />
                <label className="text-xs font-bold uppercase tracking-wider">Notes</label>
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSave}
                placeholder="Add more details, links, or context..."
                className="w-full min-h-[150px] p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none dark:text-slate-200 dark:placeholder:text-gray-600"
              />
            </div>

            {task.raw_context && (
              <div className="space-y-2 bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-500/10">
                <div className="flex items-center gap-2 text-indigo-400 dark:text-indigo-500">
                  <Quote className="w-4 h-4" />
                  <label className="text-[10px] font-mono uppercase tracking-widest">Source Context</label>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 italic whitespace-pre-wrap">
                  "{task.raw_context}"
                </p>
              </div>
            )}

              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  <label className="text-xs font-bold uppercase tracking-wider">Attachments</label>
                </div>
                <label className="cursor-pointer">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1 rounded-lg transition-colors">
                    {isUploading ? 'Uploading...' : 'Add File'}
                  </span>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              {task.attachments ? (
                <div className="space-y-2">
                  {JSON.parse(task.attachments).map((path: string, i: number) => (
                    <a 
                      key={i} 
                      href={path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-xs text-indigo-600 dark:text-indigo-400 font-medium"
                    >
                      <Paperclip className="w-3 h-3" />
                      View Attachment {i + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">No attachments for this task.</p>
                </div>
              )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setIsCoachOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              Ask Coach
            </button>
            <div className="w-px h-8 bg-black/5 dark:bg-white/10 mx-1 hidden sm:block" />
            <button 
              onClick={() => onArchive(task.id, !task.archived)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-xl border border-black/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <Archive className="w-4 h-4" />
              {task.archived ? 'Restore' : 'Archive'}
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="px-3 py-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium shadow-lg shadow-indigo-100"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </motion.div>

      <FikrCoach 
        task={task} 
        isOpen={isCoachOpen} 
        onClose={() => setIsCoachOpen(false)} 
        onUpdateTask={onUpdate}
        apiKey={apiKey}
      />
    </div>
  );
};
