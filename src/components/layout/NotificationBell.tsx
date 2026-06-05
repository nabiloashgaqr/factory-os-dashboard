"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryData } from "@/components/shared/DataProvider";
import { buildNotifications, type NotifSeverity } from "@/lib/notifications";
import { useCreateAction } from "@/lib/useCreateAction";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Plus, Loader2, Check } from "lucide-react";

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
  const { createAction, canCreate } = useCreateAction();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => buildNotifications(data, filters, language),
    [data, filters, language]
  );

  const handleCreate = async (n: { id: string; title: string; detail: string; severity: string }) => {
    setBusyId(n.id);
    const res = await createAction({
      title: `${n.title} — ${language === "ar" ? "إجراء فوري" : "Immediate action"}`,
      priority: n.severity === "critical" ? "Critical" : "High",
      notes: `${language === "ar" ? "مصدر: إشعار حرج" : "Source: Critical notification"}.\n${n.detail}`,
    });
    if (res.success) setCreatedIds((m) => ({ ...m, [n.id]: true }));
    setBusyId(null);
  };
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
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-[var(--border)] last:border-none hover:bg-[var(--bg)] transition-colors"
                  style={{
                    borderInlineStartWidth: 3,
                    borderInlineStartStyle: "solid",
                    borderInlineStartColor: sevColor[n.severity],
                  }}
                >
                  <button
                    onClick={() => {
                      setActiveTab(n.tab);
                      setOpen(false);
                    }}
                    className="w-full text-start flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      <SevIcon s={n.severity} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{n.title}</span>
                      <span className="block text-xs opacity-75 leading-relaxed">{n.detail}</span>
                    </span>
                  </button>

                  {canCreate && (
                    <div className="mt-2 ps-7">
                      {createdIds[n.id] ? (
                        <span
                          className="text-[10px] font-bold flex items-center gap-1"
                          style={{ color: "var(--success)" }}
                        >
                          <Check size={11} />
                          {language === "ar" ? "تم الإنشاء في Notion" : "Created in Notion"}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreate(n)}
                          disabled={busyId === n.id}
                          className="flex items-center gap-1.5 text-[10px] font-bold rounded-md px-2 py-1 transition-all disabled:opacity-60"
                          style={{ color: "var(--bg)", backgroundColor: "var(--success)" }}
                        >
                          {busyId === n.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Plus size={11} />
                          )}
                          {language === "ar" ? "إنشاء خطة عمل" : "Create action plan"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
