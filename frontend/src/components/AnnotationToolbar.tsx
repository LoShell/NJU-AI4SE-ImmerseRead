import { useEffect, useState } from "react";
import type { AnnotationDraft } from "../annotations/annotationRanges";

export interface AnnotationToolbarProps {
  draft: AnnotationDraft;
  onAskCompanion: (draft: AnnotationDraft) => void;
  onSave: (draft: AnnotationDraft) => void;
}

export function AnnotationToolbar({ draft, onAskCompanion, onSave }: AnnotationToolbarProps) {
  const [note, setNote] = useState(draft.note);

  useEffect(() => {
    setNote(draft.note);
  }, [draft]);

  const nextDraft = { ...draft, note: note.trim() };

  return (
    <section className="annotation-toolbar" aria-label="批注工具栏">
      <p className="eyebrow">当前选中</p>
      <blockquote>{draft.selectedText}</blockquote>
      <label>
        <span>批注内容</span>
        <textarea aria-label="批注内容" onChange={(event) => setNote(event.target.value)} value={note} />
      </label>
      <div className="annotation-actions">
        <button onClick={() => onSave(nextDraft)} type="button">
          保存批注
        </button>
        <button onClick={() => onAskCompanion(nextDraft)} type="button">
          问书搭子
        </button>
      </div>
    </section>
  );
}
