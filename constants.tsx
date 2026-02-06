
import { Subject, Session, Note } from './types';

export const MOCK_SUBJECTS: Subject[] = [
  { id: '1', name: 'Direito', plannedTime: '1h 30m', icon: 'gavel', color: '#008080', percentage: 45 },
  { id: '2', name: 'Matemática', plannedTime: '2h 00m', icon: 'calculate', color: '#006666', percentage: 30 },
  { id: '3', name: 'História', plannedTime: '45m', icon: 'history_edu', color: '#4db2b2', percentage: 25 },
  { id: '4', name: 'Biologia', plannedTime: '1h 15m', icon: 'biotech', color: '#13c8ec', percentage: 0 },
];

export const MOCK_SESSIONS: Session[] = [
  { id: '1', subjectName: 'Direito Constitucional', duration: '1h 45m', status: 'Concluído', icon: 'gavel', color: 'bg-teal-50 text-teal-600' },
  { id: '2', subjectName: 'Cálculo II', duration: '2h 10m', status: 'Concluído', icon: 'functions', color: 'bg-orange-50 text-orange-500' },
];

export const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'Álgebra Linear',
    category: 'Matemática',
    preview: 'Foco em espaços vetoriais, transformações e autovalores...',
    image: 'https://picsum.photos/seed/math1/400/200',
    tags: ['#VETORES', '#PROVA']
  },
  {
    id: '2',
    title: 'Cálculo III',
    category: 'Matemática',
    preview: 'Notas sobre integração multivariável para a próxima prova...',
    image: 'https://picsum.photos/seed/math2/400/200',
    tags: ['#CÁLCULO']
  },
  {
    id: '3',
    title: 'Biologia Celular',
    category: 'Biologia',
    preview: 'Diagramas detalhados de mitocôndrias e ribossomos...',
    image: 'https://picsum.photos/seed/bio1/400/200',
    tags: ['#CÉLULAS', '#BIO']
  },
  {
    id: '4',
    title: 'Lab de Genética',
    category: 'Biologia',
    preview: 'Observações do experimento com Drosophila...',
    tags: ['#LAB']
  },
];
