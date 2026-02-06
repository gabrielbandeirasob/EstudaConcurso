
export interface Subject {
  id: string;
  name: string;
  plannedTime: string;
  icon: string;
  color: string;
  percentage: number;
}

export interface Session {
  id: string;
  subjectName: string;
  duration: string;
  status: 'Concluído' | 'Em andamento';
  icon: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  category: string;
  preview: string;
  image?: string;
  tags: string[];
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  SUBJECTS = 'subjects',
  TIMER = 'timer',
  NOTES = 'notes'
}
