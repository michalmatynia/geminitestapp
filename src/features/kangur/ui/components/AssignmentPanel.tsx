import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

type AssignmentTemplate = {
  id: string;
  title: string;
  description: string;
  target: string;
};

const ASSIGNMENT_TEMPLATES: AssignmentTemplate[] = [
  {
    id: 'daily-10',
    title: '10 pytań dziennie',
    description: 'Codzienny trening utrwalający podstawowe działania.',
    target: '10 pytań',
  },
  {
    id: 'kangur-drill',
    title: 'Kangur 3 pkt',
    description: 'Ćwiczenie pytań konkursowych za 3 punkty.',
    target: '1 zestaw',
  },
  {
    id: 'mixed-hard',
    title: 'Mieszane trudne',
    description: 'Trening mieszany na poziomie trudnym.',
    target: '15 pytań',
  },
];

export function AssignmentPanel(): React.JSX.Element {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const completionLabel = useMemo(() => {
    if (completedIds.length === ASSIGNMENT_TEMPLATES.length) {
      return 'Wszystkie zadania ukończone';
    }
    return `Ukończono ${completedIds.length}/${ASSIGNMENT_TEMPLATES.length}`;
  }, [completedIds.length]);

  const toggleAssignment = (id: string): void => {
    setCompletedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <section className='bg-white rounded-2xl shadow p-4 flex flex-col gap-3'>
      <header className='flex items-center justify-between'>
        <h3 className='text-sm font-bold text-gray-600 uppercase tracking-wide'>Zadania</h3>
        <span className='text-xs text-gray-400'>{completionLabel}</span>
      </header>
      <div className='flex flex-col gap-2'>
        {ASSIGNMENT_TEMPLATES.map((assignment) => {
          const completed = completedIds.includes(assignment.id);
          return (
            <button
              key={assignment.id}
              type='button'
              onClick={() => toggleAssignment(assignment.id)}
              className={`w-full text-left border rounded-xl px-3 py-2 transition ${
                completed
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <div className='flex items-start gap-2'>
                {completed ? (
                  <CheckCircle2 className='w-4 h-4 text-green-600 mt-0.5' />
                ) : (
                  <Circle className='w-4 h-4 text-gray-400 mt-0.5' />
                )}
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-gray-800'>{assignment.title}</p>
                  <p className='text-xs text-gray-500'>{assignment.description}</p>
                  <p className='text-xs text-indigo-500 mt-0.5'>Cel: {assignment.target}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default AssignmentPanel;
