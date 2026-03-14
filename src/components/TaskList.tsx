import React from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Trash2, Archive, Repeat, Wind, Leaf, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Props {
  tasks: Task[];
  onToggle: (id: string, completed: boolean) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onOpenDetail: (task: Task) => void;
  onReorder?: (reorderedTasks: Task[]) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string, selected: boolean) => void;
  isSelectionMode?: boolean;
  view?: 'active' | 'archived' | 'trash';
}

export const TaskList: React.FC<Props> = ({ tasks, onToggle, onUpdate, onDelete, onRestore, onOpenDetail, onReorder, selectedIds, onSelect, isSelectionMode, view = 'active' }) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

  const startEdit = (e: React.MouseEvent, task: Task) => {
    if (view === 'trash') return;
    e.stopPropagation();
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const handleSave = (task: Task) => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate?.(task.id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    
    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort_order locally for immediate UI feedback
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index
    }));

    onReorder(updatedItems);
  };

  const renderTask = (task: Task, index: number) => (
    // @ts-ignore: key is valid in React but absent in DraggableProps type definition
    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={view !== 'active'}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          whileHover={!snapshot.isDragging ? { scale: 1.01, transition: { duration: 0.2 } } : {}}
          whileTap={!snapshot.isDragging && view === 'active' ? { scale: 0.98 } : {}}
          className={`group flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border ${snapshot.isDragging ? 'border-indigo-500 shadow-xl z-50 ring-2 ring-indigo-500/20' : 'border-black/5 dark:border-white/10 hover:shadow-md'} cursor-pointer ${task.completed && !isSelectionMode ? 'opacity-50' : ''} ${selectedIds?.has(task.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
          onClick={(e) => {
            // Prevent click if we're clicking a button or checkbox inside
            if (isSelectionMode) {
              onSelect?.(task.id, !selectedIds?.has(task.id));
            } else {
              onOpenDetail(task);
            }
          }}
        >
          {!isSelectionMode && view !== 'trash' && (
            <div 
              {...provided.dragHandleProps}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-2 text-gray-400 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}
          {isSelectionMode ? (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={selectedIds?.has(task.id) || false}
                onChange={(e) => onSelect?.(task.id, e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-slate-800"
              />
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            disabled={view === 'trash'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id, !task.completed);
            }}
            className={`transition-colors ${view === 'trash' ? 'cursor-default opacity-30' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
          >
            {task.completed ? (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </motion.div>
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </motion.button>
          )}
          
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-0.5">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: task.category_color || '#ccc' }}
              />
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                {task.category_name} 
                {task.due_date && ` • Due ${new Date(task.due_date).toLocaleDateString()}`}
                {task.recurrence_rule && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <Repeat className="w-3 h-3 text-indigo-400" />
                    <span className="capitalize">{task.recurrence_rule}</span>
                  </>
                )}
              </span>
            </div>
            {editingId === task.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleSave(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(task);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className={`text-sm font-medium w-full bg-transparent border-b border-indigo-500 focus:outline-none focus:ring-0 p-0 text-slate-900 dark:text-slate-100 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4 
                onDoubleClick={(e) => startEdit(e, task)}
                className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}
                title="Double click to edit title"
              >
                {task.title}
              </h4>
            )}
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">Load</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{task.cognitive_load_score.toFixed(1)}</p>
            </div>
            
            {view === 'trash' ? (
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore?.(task.id);
                  }}
                  className="p-2 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                  Restore
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Permanent Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="opacity-50 hover:opacity-100 p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </Draggable>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={`task-list-${view}`} isDropDisabled={view !== 'active'}>
        {(provided) => (
          <div 
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3 min-h-[50px]"
            style={{ touchAction: 'pan-y' }}
          >
            <AnimatePresence mode="popLayout">
              {tasks.map((task, index) => renderTask(task, index))}
            </AnimatePresence>
            {provided.placeholder}
            
            {tasks.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center text-center py-16 px-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/5"
        >
          {view === 'active' && (
            <>
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <Wind className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Mind Clear</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                You've achieved Inbox Zero. Take a deep breath and enjoy the mental whitespace.
              </p>
            </>
          )}
          
          {view === 'archived' && (
            <>
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <Archive className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Archive Empty</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Tasks you want to keep for reference but not execute will appear here.
              </p>
            </>
          )}
          
          {view === 'trash' && (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mb-4">
                <Leaf className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Trash Empty</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Deleted tasks will be stored here until you permanently remove them.
              </p>
            </>
          )}
        </motion.div>
      )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
