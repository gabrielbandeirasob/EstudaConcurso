export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  is_completed?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  planned_time: string;
  icon: string;
  color: string;
  percentage: number;
  topics?: Topic[];
}

export interface Session {
  id: string;
  subjectName: string;
  topic_name?: string;
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
  subject_id?: string;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  SUBJECTS = 'subjects',
  TIMER = 'timer',
  NOTES = 'notes'
}
