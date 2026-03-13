import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, PlusCircle, ListTodo, Settings, BrainCircuit, Info, Archive, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Task, UserProfile, Category } from './types';
import { calculateCLS, calculateCoordination } from './utils';
import { extractTasks } from './services/aiService';
import { MentalCapacityMeter } from './components/MentalCapacityMeter';
import { CaptureView } from './components/CaptureView';
import { TaskList } from './components/TaskList';
import { LoadHeatmap } from './components/LoadHeatmap';
import { CategoryManager } from './components/CategoryManager';
import { IntegrationsView } from './components/IntegrationsView';
import { HelpView } from './components/HelpView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { localDb } from './services/localDb';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'capture' | 'tasks' | 'settings' | 'help'>('home');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskView, setTaskView] = useState<'active' | 'archived' | 'trash'>('active');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    // Load dark mode preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  const fetchData = async () => {
    try {
      const fetchedTasks = localDb.getTasks();
      const fetchedCategories = localDb.getCategories();
      const fetchedProfile = localDb.getProfile();
      
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
      setProfile(fetchedProfile);

      // Check recurrence
      checkAndResetRecurringTasks(fetchedTasks);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndResetRecurringTasks = async (allTasks: Task[]) => {
    const now = new Date();
    const tasksToReset: { id: string, updates: Partial<Task> }[] = [];

    allTasks.forEach(task => {
      if (!task.completed || !task.recurrence_rule || task.deleted) return;

      const lastReset = task.last_reset_date ? new Date(task.last_reset_date) : new Date(task.created_at);
      let shouldReset = false;

      if (task.recurrence_rule === 'daily') {
        shouldReset = now.toDateString() !== lastReset.toDateString() && now > lastReset;
      } else if (task.recurrence_rule === 'weekly') {
        const diffDays = (now.getTime() - lastReset.getTime()) / (1000 * 3600 * 24);
        shouldReset = diffDays >= 7;
      } else if (task.recurrence_rule === 'monthly') {
        shouldReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
      }

      if (shouldReset) {
        tasksToReset.push({ 
          id: task.id, 
          updates: { completed: false, last_reset_date: now.toISOString() } 
        });
      }
    });

    if (tasksToReset.length > 0) {
      console.log(`Resetting ${tasksToReset.length} recurring tasks...`);
      tasksToReset.forEach(tr => localDb.updateTask(tr.id, tr.updates));
      
      setTasks(prev => prev.map(t => {
        const reset = tasksToReset.find(tr => tr.id === t.id);
        return reset ? { ...t, ...reset.updates } : t;
      }));
    }
  };

  const handleExtract = async (text: string, attachments?: string[]) => {
    try {
      if (!profile) return;
      const extractedTasks = await extractTasks(text, profile.ai_model, profile.openrouter_api_key);
      
      if (!extractedTasks || extractedTasks.length === 0) {
        alert("Could not extract tasks. Please make sure you have added your OpenRouter API key in Settings > Integrations.\n\nGet a free key at: openrouter.ai/keys");
        return;
      }
      
      for (const t of extractedTasks) {
        const coordination = calculateCoordination(t.participants);
        const cls = calculateCLS({ ...t, coordination_score: coordination });
        
        // Match extracted category name to existing category ID or use first available
        const matchedCat = categories.find(c => c.name.toLowerCase() === t.category.toLowerCase()) || categories[0];

        const newTask: Task = {
          id: uuidv4(),
          title: t.title,
          description: t.description || '',
          category_id: matchedCat.id,
          category_name: matchedCat.name,
          effort_score: t.effort_score,
          urgency_score: t.urgency_score,
          decision_score: t.decision_score,
          coordination_score: coordination,
          worry_score: t.worry_score,
          cognitive_load_score: cls,
          completed: false,
          archived: false,
          deleted: false,
          sort_order: 0,
          due_date: t.due_date || null,
          notes: '',
          raw_context: text,
          attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
          recurrence_rule: t.recurrence_rule || null,
          last_reset_date: null,
          created_at: new Date().toISOString()
        };

        localDb.addTask(newTask);
      }
      fetchData();
      setActiveTab('tasks');
    } catch (error) {
      console.error("Extraction failed", error);
    }
  };

  const handleAddCategory = async (cat: Category) => {
    const cats = localDb.getCategories();
    const newCats = [...cats, cat];
    localDb.setCategories(newCats);
    setCategories(newCats);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updates };
    localDb.setProfile(newProfile);
    setProfile(newProfile);
  };

  const handleDeleteCategory = async (id: string) => {
    const cats = localDb.getCategories().filter(c => c.id !== id);
    localDb.setCategories(cats);
    setCategories(cats);
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    const cats = localDb.getCategories().map(c => c.id === id ? { ...c, ...updates } : c);
    localDb.setCategories(cats);
    setCategories(cats);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    localDb.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleReorderTasks = (reorderedTasks: Task[]) => {
    const payload = reorderedTasks.map(t => ({ id: t.id, sort_order: t.sort_order }));
    localDb.reorderTasks(payload);
    
    setTasks(prev => {
      const unchanged = prev.filter(t => !reorderedTasks.find(rt => rt.id === t.id));
      const newTasks = [...unchanged, ...reorderedTasks].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return b.cognitive_load_score - a.cognitive_load_score;
      });
      return newTasks;
    });
  };

  const handleArchiveTask = async (id: string, archived: boolean) => {
    handleUpdateTask(id, { archived });
  };

  const handleRestoreTask = async (id: string) => {
    localDb.restoreTask(id);
    fetchData();
  };

  const handleDeleteTask = async (id: string, permanent = false) => {
    localDb.deleteTask(id, permanent);
    fetchData();
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleSelectTask = (id: string, selected: boolean) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBatchUpdate = (updates: Partial<Task>) => {
    const ids = Array.from(selectedTaskIds);
    localDb.bulkUpdateTasks(ids, updates);
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBatchDelete = (permanent: boolean) => {
    const ids = Array.from(selectedTaskIds);
    localDb.bulkDeleteTasks(ids, permanent);
    if (permanent) {
      setTasks(prev => prev.filter(t => !ids.includes(t.id)));
    } else {
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, deleted: true } : t));
    }
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
  };

  const activeTasks = tasks.filter(t => !t.completed && !t.archived && !t.deleted);
  const totalCLS = activeTasks.reduce((acc, t) => acc + t.cognitive_load_score, 0);
  const nextBestAction = activeTasks.sort((a, b) => b.cognitive_load_score - a.cognitive_load_score)[0];

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="w-12 h-12 text-indigo-600 animate-pulse" />
          <p className="text-sm font-mono text-gray-400 uppercase tracking-widest">Loading OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24 transition-colors duration-300">
        {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-tight">MentalLoadOS</h1>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Cognitive Bandwidth Management</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-xl transition-colors text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            title="Toggle Theme"
          >
            {isDarkMode ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <button 
            onClick={() => setActiveTab('help')}
            className={`p-2 rounded-xl transition-colors ${activeTab === 'help' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <Info className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-xl transition-colors ${activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <MentalCapacityMeter totalCLS={totalCLS} capacity={profile?.daily_capacity || 120} />
              
              <div className="bg-white p-6 rounded-2xl border border-black/5">
                <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4">Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Daily Capacity</p>
                    <p className="font-mono font-bold text-lg">{profile?.daily_capacity} CLS</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Current Load</p>
                    <p className="font-mono font-bold text-lg">{totalCLS.toFixed(1)} CLS</p>
                  </div>
                </div>
              </div>

              {nextBestAction && (
                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <p className="text-[10px] font-mono uppercase tracking-widest opacity-70 mb-2">Next Best Action</p>
                  <h3 className="text-lg font-medium mb-1">{nextBestAction.title}</h3>
                  <p className="text-sm opacity-80 line-clamp-2">{nextBestAction.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-mono uppercase">
                      Load: {nextBestAction.cognitive_load_score.toFixed(1)}
                    </span>
                    <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-mono uppercase">
                      {nextBestAction.category_name}
                    </span>
                  </div>
                </div>
              )}

              <LoadHeatmap tasks={tasks} categories={categories} />
            </motion.div>
          )}

          {activeTab === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <CaptureView onExtract={handleExtract} />
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-center mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-4 min-w-max">
                  <button 
                    onClick={() => setTaskView('active')}
                    className={`text-sm font-medium uppercase tracking-wider transition-colors whitespace-nowrap ${taskView === 'active' ? 'text-indigo-600' : 'text-gray-400'}`}
                  >
                    Active Load ({tasks.filter(t => !t.archived && !t.deleted).length})
                  </button>
                  <button 
                    onClick={() => setTaskView('archived')}
                    className={`text-sm font-medium uppercase tracking-wider transition-colors whitespace-nowrap ${taskView === 'archived' ? 'text-indigo-600' : 'text-gray-400'}`}
                  >
                    Archive ({tasks.filter(t => t.archived && !t.deleted).length})
                  </button>
                  <button 
                    onClick={() => setTaskView('trash')}
                    className={`text-sm font-medium uppercase tracking-wider transition-colors whitespace-nowrap ${taskView === 'trash' ? 'text-indigo-600' : 'text-gray-400'}`}
                  >
                    Trash ({tasks.filter(t => t.deleted).length})
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedTaskIds(new Set());
                  }}
                  className={`text-sm font-medium transition-colors ${isSelectionMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </button>
              </div>

              {taskView === 'active' && (
                <>
                  <TaskList 
                    view="active"
                    tasks={tasks.filter(t => !t.completed && !t.archived && !t.deleted).sort((a,b) => a.sort_order - b.sort_order)} 
                    onToggle={(id, comp) => handleUpdateTask(id, { completed: comp })} 
                    onUpdate={handleUpdateTask}
                    onReorder={handleReorderTasks}
                    onDelete={handleDeleteTask} 
                    onOpenDetail={openTaskDetail}
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedTaskIds}
                    onSelect={handleSelectTask}
                  />
                  
                  <div className="mt-8">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4 opacity-50">Completed</h3>
                    <TaskList 
                      view="active"
                      tasks={tasks.filter(t => t.completed && !t.archived && !t.deleted)} 
                      onToggle={(id, comp) => handleUpdateTask(id, { completed: comp })} 
                      onUpdate={handleUpdateTask}
                      onDelete={handleDeleteTask} 
                      onOpenDetail={openTaskDetail}
                      isSelectionMode={isSelectionMode}
                      selectedIds={selectedTaskIds}
                      onSelect={handleSelectTask}
                    />
                  </div>
                </>
              )}

              {taskView === 'archived' && (
                <TaskList 
                  view="archived"
                  tasks={tasks.filter(t => t.archived && !t.deleted)} 
                  onToggle={(id, comp) => handleUpdateTask(id, { completed: comp })} 
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask} 
                  onOpenDetail={openTaskDetail}
                  isSelectionMode={isSelectionMode}
                  selectedIds={selectedTaskIds}
                  onSelect={handleSelectTask}
                />
              )}

              {taskView === 'trash' && (
                <TaskList 
                  view="trash"
                  tasks={tasks.filter(t => t.deleted)} 
                  onToggle={() => {}} 
                  onUpdate={handleUpdateTask}
                  onDelete={(id) => handleDeleteTask(id, true)} 
                  onRestore={handleRestoreTask}
                  onOpenDetail={openTaskDetail}
                  isSelectionMode={isSelectionMode}
                  selectedIds={selectedTaskIds}
                  onSelect={handleSelectTask}
                />
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {isSelectionMode && selectedTaskIds.size > 0 && activeTab === 'tasks' && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-sm w-full mx-auto px-6 z-40"
              >
                <div className="bg-slate-900 border border-slate-700 text-white p-3 px-5 rounded-2xl shadow-2xl flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedTaskIds.size} selected</span>
                  <div className="flex items-center gap-1">
                    {taskView !== 'archived' && taskView !== 'trash' && (
                      <button 
                        onClick={() => handleBatchUpdate({ archived: true })} 
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                        title="Archive Selected"
                      >
                        <Archive className="w-5 h-5"/>
                      </button>
                    )}
                    {taskView === 'trash' ? (
                      <button 
                        onClick={() => handleBatchDelete(true)} 
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-red-500 hover:text-red-400"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-5 h-5"/>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBatchDelete(false)} 
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-red-500 hover:text-red-400"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-5 h-5"/>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <IntegrationsView 
                profile={profile} 
                onUpdateProfile={handleUpdateProfile} 
              />
              <CategoryManager 
                categories={categories} 
                onAdd={handleAddCategory} 
                onUpdate={handleUpdateCategory} 
                onDelete={handleDeleteCategory} 
              />
            </motion.div>
          )}

          {activeTab === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <HelpView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 max-w-2xl mx-auto bg-white/80 backdrop-blur-lg border border-black/5 rounded-2xl shadow-xl p-2 flex justify-around items-center z-50">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<LayoutDashboard />} label="Home" />
        <NavButton active={activeTab === 'capture'} onClick={() => setActiveTab('capture')} icon={<PlusCircle />} label="Capture" />
        <NavButton active={activeTab === 'tasks'} onClick={() => { setActiveTab('tasks'); setTaskView('active'); }} icon={<ListTodo />} label="Tasks" />
      </nav>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onArchive={handleArchiveTask}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactElement, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5' } as any)}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
