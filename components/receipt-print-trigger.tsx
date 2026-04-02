"use client";

import { useEffect } from "react";

export function ReceiptPrintTrigger() {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
