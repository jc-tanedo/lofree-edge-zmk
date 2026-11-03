// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useEffect, useRef } from "react";
export default function ConfirmDialog({ open, onClose, children, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open && !ref.current.open) {
      ref.current.returnValue = "cancel";
      ref.current.showModal();
    }
    if (!open && ref.current.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      onClose={() => onClose(ref.current.returnValue)}
    >
      {children}
    </dialog>
  );
}
