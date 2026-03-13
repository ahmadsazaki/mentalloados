import React, { useState } from 'react';
import { Category } from '../types';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  categories: Category[];
  onAdd: (cat: Category) => void;
  onUpdate: (id: string, cat: Partial<Category>) => void;
  onDelete: (id: string) => void;
}

export const CategoryManager: React.FC<Props> = ({ categories, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4F6BED');
  const [newMaxCapacity, setNewMaxCapacity] = useState(50);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({ id: uuidv4(), name: newName, color: newColor, max_capacity: newMaxCapacity });
    setNewName('');
    setNewMaxCapacity(50);
    setIsAdding(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-black/5 dark:border-white/10 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Manage Categories</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg group">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
            {editingId === cat.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full text-sm p-1 rounded border dark:bg-slate-900 border-gray-200 dark:border-white/10" 
                />
                <input 
                  type="number" 
                  value={newMaxCapacity} 
                  onChange={e => setNewMaxCapacity(Number(e.target.value))} 
                  className="w-16 text-sm p-1 rounded border dark:bg-slate-900 border-gray-200 dark:border-white/10" 
                />
                <button onClick={() => {
                  onUpdate(cat.id, { name: newName, max_capacity: newMaxCapacity });
                  setEditingId(null);
                }}>
                  <Check className="w-4 h-4 text-green-500" />
                </button>
                <button onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{cat.name}</span>
                <span className="text-xs text-gray-400 font-mono">Max: {cat.max_capacity || 50}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingId(cat.id);
                      setNewName(cat.name);
                      setNewMaxCapacity(cat.max_capacity || 50);
                    }}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(cat.id)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl space-y-3">
          <input 
            type="text" 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category Name"
            className="w-full p-2 text-sm bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Max Capacity Load</label>
            <input 
              type="number"
              value={newMaxCapacity}
              onChange={(e) => setNewMaxCapacity(Number(e.target.value))}
              className="w-20 p-2 text-sm bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-none"
            />
            <div className="flex-1" />
            <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleAdd} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
