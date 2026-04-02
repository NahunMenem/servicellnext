"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  triggerClassName?: string;
  triggerContent?: React.ReactNode;
  children: React.ReactNode;
};

export function Modal({
  title,
  description,
  triggerLabel,
  triggerClassName,
  triggerContent,
  children
}: ModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button className={triggerClassName ?? "button"} type="button" onClick={() => setOpen(true)}>
        {triggerContent ?? triggerLabel}
      </button>

      {mounted && open
        ? createPortal(
            <div className="modal-backdrop" onClick={() => setOpen(false)}>
              <div
                aria-labelledby={titleId}
                aria-modal="true"
                className="modal-panel card"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <h2 id={titleId}>{title}</h2>
                    {description ? <p className="muted">{description}</p> : null}
                  </div>
                  <button className="button secondary" type="button" onClick={() => setOpen(false)}>
                    Cerrar
                  </button>
                </div>
                {children}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
