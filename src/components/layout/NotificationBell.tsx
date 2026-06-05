"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { buildNotifications, type NotifSeverity } from "@/lib/notifications";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

const sevColor: Record<NotifSeverity, string> = {
  critical: "var(--critical)",
  warning: "var(--warning)",
  info: "var(--accent)",
};

function SevIcon({ s, size = 16 }: { s: NotifSeverity; size?: number }) {
  if (s === "critical") return <AlertCircle size={size} style={{ color: sevColor.critical }} />;
  if (s === "warning") return <AlertTriangle size={size} style={{ color: sevColor.warning }} />;
  return <Info size={size} style={{ color: sevColor.info }} />;
}

export default function NotificationBell() {
  const { language, setActiveTab } = useStore();
  const { data, filters } = useFactoryData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => buildNotifications(data, filters, language),
    [data, filters, language]
  );
  const count = notifications.length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isRtl = language === "ar";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={language === "ar" ? "الإشعارات" : "Notifications"}
        className="relative flex items-center justify-center w-9 h-9 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--accent)] transition-all"
      >
        <Bell size={16} className={count > 0 ? "text-[var(--accent)]" : "opacity-70"} />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white"
            style={{ backgroundColor: "var(--critical)" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute mt-2 w-80 max-w-[90vw] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-[70] overflow-hidden"
          style={{ [isRtl ? "left" : "right"]: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-sm font-black flex items-center gap-2">
              <Bell size={15} className="text-[var(--accent)]" />
              {language === "ar" ? "الإشعارات الحرجة" : "Critical Notifications"}
            </span>
            <span className="text-xs font-bold opacity-60">{count}</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <div className="py-10 text-center opacity-50 text-sm flex flex-col items-center gap-2">
                <CheckCircle2 size={28} className="text-[var(--success)]" />
                {language === "ar" ? "لا توجد مهام حرجة حالياً" : "No critical items right now"}
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setActiveTab(n.tab);
                    setOpen(false);
                  }}
                  className="w-full text-start flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-none hover:bg-[var(--bg)] transition-colors"
                  style={{
                    borderInlineStartWidth: 3,
                    borderInlineStartStyle: "solid",
                    borderInlineStartColor: sevColor[n.severity],
                  }}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    <SevIcon s={n.severity} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{n.title}</span>
                    <span className="block text-xs opacity-75 leading-relaxed">{n.detail}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
