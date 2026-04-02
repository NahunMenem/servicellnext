"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function PanelNotice() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const noticeType = searchParams.get("notice_type") ?? "success";
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [notice, noticeType]);

  if (!notice || hidden) {
    return null;
  }

  return (
    <div className={`notice ${noticeType === "success" ? "success" : ""} panel-notice`} role="status">
      <span>{notice}</span>
      <button aria-label="Cerrar aviso" className="panel-notice-close" onClick={() => setHidden(true)} type="button">
        x
      </button>
    </div>
  );
}

