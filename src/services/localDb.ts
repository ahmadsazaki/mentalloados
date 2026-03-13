import { Task, Category, UserProfile } from '../types';

const STORAGE_KEYS = {
  TASKS: 'mentalload_tasks',
  CATEGORIES: 'mentalload_categories',
  PROFILE: 'mentalload_profile'
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Work', color: '#4F6BED', max_capacity: 50 },
  { id: 'family', name: 'Family', color: '#6BCB77', max_capacity: 30 },
  { id: 'finance', name: 'Finance', color: '#F4A261', max_capacity: 20 },
  { id: 'health', name: 'Health', color: '#E63946', max_capacity: 30 },
  { id: 'admin', name: 'Admin', color: '#8E9299', max_capacity: 20 },
  { id: 'social', name: 'Social', color: '#A061F4', max_capacity: 20 }
];

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_1',
  name: 'Guest User',
  daily_capacity: 120,
  ai_provider: 'gemini',
  ai_model: 'gemini-2.0-flash-lite',
  openrouter_api_key: '',
  gemini_api_key: ''
};

export const localDb = {
  getTasks: (): Task[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  },

  setTasks: (tasks: Task[]) => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  getCategories: (): Category[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  },

  setCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getProfile: (): UserProfile => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
      return DEFAULT_PROFILE;
    }
    const profile = JSON.parse(data);
    
    // Migration: ensure gemini_api_key field exists
    if (profile.gemini_api_key === undefined) {
      profile.gemini_api_key = '';
    }
    // Migration: switch from dead openrouter/auto to gemini
    if (profile.ai_model === 'openrouter/auto' || profile.ai_model === 'google/gemini-2.0-flash-lite:free') {
      profile.ai_provider = 'gemini';
      profile.ai_model = 'gemini-2.0-flash-lite';
      localDb.setProfile(profile);
    }
    
    return profile;
  },

  setProfile: (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  // Helper methods to match current API patterns
  updateTask: (id: string, updates: Partial<Task>) => {
    const tasks = localDb.getTasks();
    const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    localDb.setTasks(newTasks);
    return newTasks;
  },

  addTask: (task: Task) => {
    const tasks = localDb.getTasks();
    const newTasks = [...tasks, task];
    localDb.setTasks(newTasks);
    return newTasks;
  },

  deleteTask: (id: string, permanent: boolean = false) => {
    const tasks = localDb.getTasks();
    let newTasks;
    if (permanent) {
      newTasks = tasks.filter(t => t.id !== id);
    } else {
      newTasks = tasks.map(t => t.id === id ? { ...t, deleted: true } : t);
    }
    localDb.setTasks(newTasks);
    return newTasks;
  },

  restoreTask: (id: string) => {
    const tasks = localDb.getTasks();
    const newTasks = tasks.map(t => t.id === id ? { ...t, deleted: false } : t);
    localDb.setTasks(newTasks);
    return newTasks;
  },

  bulkUpdateTasks: (ids: string[], updates: Partial<Task>) => {
    const tasks = localDb.getTasks();
    const newTasks = tasks.map(t => ids.includes(t.id) ? { ...t, ...updates } : t);
    localDb.setTasks(newTasks);
    return newTasks;
  },

  bulkDeleteTasks: (ids: string[], permanent: boolean) => {
    const tasks = localDb.getTasks();
    let newTasks;
    if (permanent) {
      newTasks = tasks.filter(t => !ids.includes(t.id));
    } else {
      newTasks = tasks.map(t => ids.includes(t.id) ? { ...t, deleted: true } : t);
    }
    localDb.setTasks(newTasks);
    return newTasks;
  },

  reorderTasks: (items: { id: string, sort_order: number }[]) => {
    const tasks = localDb.getTasks();
    const newTasks = tasks.map(t => {
      const update = items.find(item => item.id === t.id);
      return update ? { ...t, sort_order: update.sort_order } : t;
    });
    localDb.setTasks(newTasks);
    return newTasks;
  }
};
