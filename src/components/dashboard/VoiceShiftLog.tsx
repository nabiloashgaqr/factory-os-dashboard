"use client";

import { useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { useAI } from "@/lib/useAI";
import { getTranslations } from "@/lib/i18n";
import { Card, SectionHeader } from "@/components/shared/ui";
import { Mic, Square, Sparkles, Send, AlertCircle, Loader2, Check } from "lucide-react";
import { useCreateAction } from "@/lib/useCreateAction";

interface StructuredLog {
  line: string;
  category: string;
  timestamp?: string;
  summary: string;
}

export default function VoiceShiftLog() {
  const { language } = useStore();
  const { generate, ready } = useAI();
  const { createAction, canCreate } = useCreateAction();
  const t = getTranslations(language);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [structured, setStructured] = useState<StructuredLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const recognitionRef = useRef<any>(null);

  const enabled = ready;

  // Commit the structured voice log to Notion as an Action Plan entry.
  const commitToNotion = async () => {
    if (!structured) return;
    setCommitting(true);
    setError(null);
    const res = await createAction({
      title:
        (language === "ar" ? "بلاغ ميداني: " : "Field log: ") +
        `${structured.line} — ${structured.category}`.slice(0, 160),
      priority: "High",
      notes:
        `${language === "ar" ? "مصدر: السجل الصوتي الذكي" : "Source: Voice Shift Log"}\n` +
        `Line: ${structured.line}\nCategory: ${structured.category}\n` +
        (structured.timestamp ? `Time: ${structured.timestamp}\n` : "") +
        `\n${structured.summary}`,
    });
    if (res.success) {
      setCommitted(true);
    } else {
      setError(res.error || (language === "ar" ? "تعذّر الترحيل" : "Commit failed"));
    }
    setCommitting(false);
  };

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(
        language === "ar"
          ? "متصفحك لا يدعم التعرّف على الصوت. يمكنك الكتابة يدوياً."
          : "Speech recognition not supported in this browser. Type manually."
      );
      return;
    }
    setError(null);
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = language === "ar" ? "ar-SA" : "en-US";
    rec.onresult = (event: any) => {
      const i = event.resultIndex;
      const text = event.results[i][0].transcript;
      setTranscript((prev) => (prev ? prev + " " : "") + text);
    };
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const structuralize = async () => {
    if (!enabled) {
      setError(t.missingGemini);
      return;
    }
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const json = await generate({
          json: true,
          prompt: `Analyze this industrial voice log and return ONLY a JSON object with keys "line", "category", "timestamp", "summary". Text: "${transcript}". Respond in ${language === "ar" ? "Arabic" : "English"}.`,
          contextData: {},
        });
      if (json.success) {
        const clean = json.text.replace(/```json|```/g, "").trim();
        setStructured(JSON.parse(clean));
        setCommitted(false);
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      setError(e.message || "AI processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.voiceLog}
        subtitle={
          language === "ar"
            ? "سجّل ملاحظات الميدان صوتياً ودع الذكاء الاصطناعي يهيكلها لإدخال نوشن"
            : "Capture field notes by voice; AI structures them into a Notion-ready entry"
        }
        icon={<Mic className="text-[var(--accent)]" />}
      />

      {error && (
        <div className="p-3 bg-critical-soft text-[var(--critical)] text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col justify-between min-h-[260px]">
          <div className="w-full min-h-[120px] bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4 text-xs font-mono whitespace-pre-wrap">
            {transcript ||
              (language === "ar"
                ? "اضغط زر الميكروفون وابدأ في وصف العطل أو حالة الوردية..."
                : "Click record and describe the field anomaly or shift update...")}
          </div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 bg-[var(--critical)] text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90"
              >
                <Mic size={14} /> {language === "ar" ? "بدء التسجيل" : "Start Recording"}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] px-4 py-2 rounded-lg text-xs font-bold animate-pulse"
              >
                <Square size={14} /> {language === "ar" ? "إيقاف" : "Stop"}
              </button>
            )}
            <button
              onClick={structuralize}
              disabled={!transcript || loading}
              className="flex items-center gap-2 bg-[var(--accent)] text-[var(--bg)] px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
            >
              <Sparkles size={14} />
              {loading
                ? language === "ar"
                  ? "جاري التحليل..."
                  : "Processing..."
                : language === "ar"
                ? "هيكلة بالذكاء الاصطناعي"
                : "AI Structuring"}
            </button>
            {transcript && (
              <button
                onClick={() => {
                  setTranscript("");
                  setStructured(null);
                  setCommitted(false);
                }}
                className="text-xs opacity-60 hover:opacity-100 underline"
              >
                {language === "ar" ? "مسح" : "Clear"}
              </button>
            )}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-xs font-semibold block opacity-60">
              {language === "ar" ? "البلاغ المُرتب للإرسال" : "Structured Database Payload"}
            </span>
            {structured ? (
              <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl space-y-3 text-xs font-mono">
                <div>
                  <span className="opacity-50">Line: </span>
                  <b className="text-[var(--text)]">{structured.line}</b>
                </div>
                <div>
                  <span className="opacity-50">Category: </span>
                  <b className="text-[var(--warning)]">{structured.category}</b>
                </div>
                {structured.timestamp && (
                  <div>
                    <span className="opacity-50">Timestamp: </span>
                    {structured.timestamp}
                  </div>
                )}
                <div className="border-t border-[var(--border)] pt-2 mt-2">
                  <span className="opacity-50 block mb-1">Summary:</span>
                  <p className="leading-relaxed">{structured.summary}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs opacity-40 text-center py-12">
                {language === "ar"
                  ? "بانتظار معالجة التسجيل الصوتي لتوليد الحقول."
                  : "Awaiting audio parsing to generate payload fields."}
              </p>
            )}
          </div>
          {structured && (
            committed ? (
              <div className="w-full flex items-center justify-center gap-2 bg-success-soft text-[var(--success)] font-bold py-2.5 rounded-lg text-sm mt-4 border border-[var(--success)]">
                <Check size={15} />
                {language === "ar" ? "تم الترحيل إلى Notion ✓" : "Committed to Notion ✓"}
              </div>
            ) : canCreate ? (
              <button
                onClick={commitToNotion}
                disabled={committing}
                className="w-full flex items-center justify-center gap-2 bg-[var(--success)] text-white font-bold py-2.5 rounded-lg text-sm mt-4 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {committing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {committing
                  ? language === "ar" ? "جارٍ الترحيل..." : "Committing..."
                  : language === "ar" ? "ترحيل لقاعدة بيانات نوشن" : "Commit Entry to Notion"}
              </button>
            ) : (
              <p className="text-[11px] opacity-60 text-center mt-4">
                {language === "ar"
                  ? "هيّئ مفاتيح Notion في الإعدادات لتفعيل الترحيل."
                  : "Configure Notion in Settings to enable committing."}
              </p>
            )
          )}
        </Card>
      </div>
    </div>
  );
}
