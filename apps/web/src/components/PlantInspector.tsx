import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlantRecord } from "./PlantRecord";
import { QueryMessage } from "./QueryMessage";
import { plantQuery } from "../lib/api";
export function PlantInspector({
  id,
  onClose,
  onSelect,
}: {
  id: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useRef<HTMLHeadingElement>(null),
    plant = useQuery(plantQuery(id));
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  useEffect(() => {
    title.current?.focus();
  }, [id]);
  return (
    <dialog
      ref={dialog}
      className="plant-inspector"
      aria-labelledby="inspector-title"
      onKeyDown={(e) => {
        if (e.key !== "Tab" || !dialog.current) return;
        const focusable = Array.from(
          dialog.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === title.current)
        ) {
          e.preventDefault();
          last?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="inspector-inner">
        <div className="inspector-header">
          <div>
            <p className="eyebrow">Specimen inspector</p>
            <h2 id="inspector-title" ref={title} tabIndex={-1}>
              {plant.data?.name ?? "Loading plant…"}
            </h2>
          </div>
          <button
            className="secondary close-inspector"
            aria-label="Close inspector"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {plant.isPending ? (
          <QueryMessage loading />
        ) : plant.error ? (
          <QueryMessage
            error={plant.error}
            retry={() => void plant.refetch()}
          />
        ) : (
          <PlantRecord plant={plant.data} onParent={onSelect} />
        )}
      </div>
    </dialog>
  );
}
