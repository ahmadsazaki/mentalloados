import { Task } from './types';

export const calculateCLS = (task: Partial<Task>): number => {
  const e = task.effort_score || 0;
  const u = task.urgency_score || 0;
  const d = task.decision_score || 0;
  const c = task.coordination_score || 0;
  const w = task.worry_score || 0;
  return e + u + d + c + w;
};

export const calculateCoordination = (participants: number): number => {
  return Math.log2(participants + 1) * 2;
};

export const getRiskLevel = (mentalRam: number) => {
  if (mentalRam <= 40) return { label: 'Clear', color: '#6BCB77' };
  if (mentalRam <= 70) return { label: 'Manageable', color: '#4F6BED' };
  if (mentalRam <= 90) return { label: 'Strain', color: '#F4A261' };
  if (mentalRam <= 110) return { label: 'Overload', color: '#E63946' };
  return { label: 'Burnout Risk', color: '#7D0000' };
};
