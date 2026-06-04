"use client";

import { useState } from "react";
import { useStore, type ThemeName, type AiProvider } from "@/store/useStore";
import { getTranslations, type Language } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader } from "@/components/shared/ui";
import {
  Monitor,
  Key,
  Database,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

type TestState = "idle" | "loading" | "ok" | "fail";

const THEMES: { value: ThemeName; label: string }[] = [
  { value: "executive-dark", label: "🕶️ Executive Dark" },
  { value: "industrial-light", label: "🏭 Industrial Light" },
  { value: "command-center", label: "⚡ Command Center" },
  { value: "steel-gold", label: "🏅 Steel & Gold" },
  { value: "minimal-white", label: "☀️ Minimal White" },
];

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
];

export default function SettingsPanel() {
  const s = useStore();
  const t = getTranslations(s.language);
  const { refresh } = useFactoryData();

  const [notionTest, setNotionTest] = useState<TestState>("idle");
  const [aiTest, setAiTest] = useState<TestState>("idle");

  const testNotion = async () => {
    setNotionTest("loading");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: s.notionToken,
          kpiDbId: s.kpiDbId,
          actionDbId: s.actionDbId,
          progressDbId: s.progressDbId,
          inventoryDbId: s.inventoryDbId,
        }),
      });
      const json = await res.json();
      setNotionTest(json.success ? "ok" : "fail");
    } catch {
      setNotionTest("fail");
    }
  };

  const testAI = async () => {
    setAiTest("loading");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: s.geminiKey,
          model: s.aiModel,
          prompt: "Reply with the single word: OK",
          contextData: {},
        }),
      });
      const json = await res.json();
      setAiTest(json.success ? "ok" : "fail");
    } catch {
      setAiTest("fail");
    }
  };

  const inputCls =
    "w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-[var(--accent)] font-mono";
  const labelCls = "block text-xs opacity-70 mb-1.5";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <SectionHeader
        title={t.settings}
        subtitle={s.language === "ar" ? "إدارة الاتصال والمظهر والأمان" : "Manage connections, appearance & security"}
        icon={<ShieldAlert className="text-[var(--accent)]" />}
      />

      {/* Security note */}
      <div className="bg-warning-soft border border-[var(--warning)] text-xs p-3 rounded-lg flex items-start gap-2">
        <ShieldAlert size={16} className="text-[var(--warning)] flex-shrink-0 mt-0.5" />
        <span className="opacity-90">{t.securityNote}</span>
      </div>

      {/* UI & Experience */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--accent)] uppercase tracking-wider">
          <Monitor size={16} /> {t.uiExperience}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>{t.activeTheme}</label>
            <select
              value={s.theme}
              onChange={(e) => s.setTheme(e.target.value as ThemeName)}
              className={inputCls.replace("font-mono", "")}
            >
              {THEMES.map((th) => (
                <option key={th.value} value={th.value}>
                  {th.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.systemLanguage}</label>
            <select
              value={s.language}
              onChange={(e) => s.setLanguage(e.target.value as Language)}
              className={inputCls.replace("font-mono", "")}
            >
              <option value="ar">العربية (RTL)</option>
              <option value="en">English (LTR)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notion Connection */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--accent)] uppercase tracking-wider">
            <Database size={16} /> Notion
          </h3>
          <TestButton state={notionTest} onClick={testNotion} label={t.testConnection} />
        </div>
        <div>
          <label className={labelCls}>{t.notionToken}</label>
          <input
            type="password"
            value={s.notionToken}
            onChange={(e) => s.setNotionToken(e.target.value)}
            placeholder="secret_... / ntn_..."
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t.kpiDbId} value={s.kpiDbId} onChange={s.setKpiDbId} cls={inputCls} />
          <Field label={t.actionDbId} value={s.actionDbId} onChange={s.setActionDbId} cls={inputCls} />
          <Field label={t.progressDbId} value={s.progressDbId} onChange={s.setProgressDbId} cls={inputCls} />
          <Field label={t.inventoryDbId} value={s.inventoryDbId} onChange={s.setInventoryDbId} cls={inputCls} />
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 text-xs bg-[var(--accent)] text-[var(--bg)] px-4 py-2 rounded-lg font-bold hover:opacity-90"
        >
          <RefreshCw size={14} /> {t.syncNow}
        </button>
      </Card>

      {/* AI Settings */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--accent)] uppercase tracking-wider">
            <Sparkles size={16} /> {t.apiGateways}
          </h3>
          <TestButton state={aiTest} onClick={testAI} label={t.testAI} />
        </div>
        <div>
          <label className={labelCls}>{t.geminiKey}</label>
          <input
            type="password"
            value={s.geminiKey}
            onChange={(e) => s.setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t.aiProvider}</label>
            <select
              value={s.aiProvider}
              onChange={(e) => s.setAiProvider(e.target.value as AiProvider)}
              className={inputCls.replace("font-mono", "")}
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI (soon)</option>
              <option value="claude">Claude (soon)</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{t.aiModel}</label>
            <select
              value={s.aiModel}
              onChange={(e) => s.setAiModel(e.target.value)}
              className={inputCls.replace("font-mono", "")}
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              {t.temperature}: {s.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={s.temperature}
              onChange={(e) => s.setTemperature(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
          <div>
            <label className={labelCls}>{t.maxTokens}</label>
            <input
              type="number"
              value={s.maxTokens}
              onChange={(e) => s.setMaxTokens(Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
      </Card>

      {/* Data Sync */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--accent)] uppercase tracking-wider">
          <RefreshCw size={16} /> {s.language === "ar" ? "مزامنة البيانات" : "Data Sync"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={s.autoSync}
              onChange={(e) => s.setAutoSync(e.target.checked)}
              className="accent-[var(--accent)] w-4 h-4"
            />
            {s.language === "ar" ? "تفعيل التحديث التلقائي" : "Enable auto-sync"}
          </label>
          <div>
            <label className={labelCls}>{t.autoSyncInterval}</label>
            <select
              value={s.autoSyncInterval}
              onChange={(e) => s.setAutoSyncInterval(Number(e.target.value))}
              className={inputCls.replace("font-mono", "")}
            >
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>
        {s.errorLog.length > 0 && (
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 max-h-32 overflow-y-auto text-[10px] font-mono opacity-70 space-y-1">
            {s.errorLog.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        )}
      </Card>

      {/* Reset */}
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-50">{t.saved}</span>
        <button
          onClick={() => {
            if (confirm(s.language === "ar" ? "إعادة ضبط كل الإعدادات؟" : "Reset all settings?")) {
              s.resetSettings();
            }
          }}
          className="flex items-center gap-2 text-xs bg-critical-soft text-[var(--critical)] border border-[var(--critical)] px-4 py-2 rounded-lg font-medium hover:opacity-80"
        >
          <RotateCcw size={14} /> {t.resetSettings}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  cls,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cls: string;
}) {
  return (
    <div>
      <label className="block text-xs opacity-70 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
    </div>
  );
}

function TestButton({
  state,
  onClick,
  label,
}: {
  state: TestState;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-1.5 rounded-lg font-medium transition-colors"
    >
      {state === "loading" && <Loader2 size={13} className="animate-spin" />}
      {state === "ok" && <CheckCircle2 size={13} className="text-[var(--success)]" />}
      {state === "fail" && <XCircle size={13} className="text-[var(--critical)]" />}
      {label}
    </button>
  );
}
