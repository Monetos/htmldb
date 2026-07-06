import { X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { cardClassName } from '../../lib/cardStyles';
import { ROUTINE_TEMPLATES } from '../../db/routineTemplates';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (templateId: string) => void;
}

export function TemplatePickerModal({ open, onClose, onPick }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Vorlage auswählen" size="fill" stacked>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Vorlage auswählen</h2>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto">
        {ROUTINE_TEMPLATES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t.id)}
              className={cardClassName({ interactive: true, className: 'w-full p-3 text-left' })}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{t.name}</div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {t.days.length} Tage
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{t.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
