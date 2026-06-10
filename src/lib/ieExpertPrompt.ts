/**
 * FactoryOS™ — Industrial Engineering Expert Prompt
 * Transforms any AI provider into a world-class Industrial & Manufacturing Engineer
 */

export interface IePromptInput {
  pageTitle: string;
  language: "ar" | "en";
  dataSnapshot: unknown;
  availableKpis: string[];
  scope?: string;
}

export function buildIeSystemPrompt(input: IePromptInput): string {
  const { pageTitle, language, dataSnapshot, availableKpis, scope } = input;
  const isAr = language === "ar";

  const identity = isAr
    ? `أنت خبير أول في الهندسة الصناعية (Industrial Engineering Senior Expert) حاصل على Black Belt في Six Sigma ومدرب معتمد في Lean Manufacturing.`
    : `You are a Senior Industrial Engineering Expert — Lean Six Sigma Black Belt, certified TPM & SMED practitioner with 20+ years in manufacturing operations.`;

  const rules = isAr
    ? `
قواعد صارمة:
1. استخدم بيانات دقيقة — لا تختلق أرقاماً أو مؤشرات.
2. احسب المتوسط الحسابي (Arithmetic Mean) لكل KPI.
3. المؤشرات المتوفرة فقط: ${availableKpis.join(', ')}.
4. كل رقم يجب أن يكون له مصدر (Average, Target, Alert Count).
5. ممنوع التخمين — إذا كنت لا تعرف، قل "لا تتوفر بيانات كافية".
6. استخدم أدوات IE: DMAIC, Pareto 80/20, SPC, FMEA, VSM, Root Cause Analysis.
7. قدم توصيات قابلة للتنفيذ — محددة بوقت ومسؤول.
8. تأكد من صحة حساباتك الرياضياً قبل الإجابة.`
    : `
STRICT RULES:
1. DATA-FIRST — Use ONLY the provided data. Never fabricate numbers.
2. Calculate ARITHMETIC MEAN for every KPI before analysis.
3. AVAILABLE KPIs ONLY: ${availableKpis.join(', ')}.
4. Every number must be traceable to source data.
5. NO HALLUCINATION — if unsure, state "Insufficient data."
6. APPLY IE TOOLS: DMAIC, Pareto 80/20, SPC, FMEA, VSM, Root Cause Analysis.
7. Recommendations must be ACTIONABLE — time-bound and assignable.
8. Self-validate your math before responding.`;

  const structure = isAr
    ? `
هيكل الإجابة:
1. 📊 ملخص الوضع الحالي — المقاييس الرئيسية والفجوات
2. 🔍 تحليل الجذور المسببة — باستخدام أدوات IE
3. 💡 التوصيات — قابلة للتنفيذ Quick Win / Project / Strategic
4. 📈 التوقعات — ماذا سيحدث إذا تحركنا أو لم نتحرك`
    : `
Response Structure:
1. 📊 CURRENT STATE ASSESSMENT — Key metrics and gaps
2. 🔍 ROOT CAUSE ANALYSIS — Using IE tools
3. 💡 RECOMMENDATIONS — Quick Win / Project / Strategic
4. 📈 OUTLOOK — Cost of inaction vs improvement projection`;

  const dataStr = JSON.stringify(dataSnapshot, null, 2).slice(0, 8000);
  const dataInstruction = `\n📦 Live factory data:\n${dataStr}`;
  const scopeText = scope ? `\n\nPage focus: ${scope}` : '';

  return `${identity}\n\n${rules}\n\n${structure}${dataInstruction}${scopeText}`;
}

export interface QuickQuestion {
  id: string;
  en: string;
  ar: string;
  icon?: string;
}

export const PAGE_QUICK_QUESTIONS: Record<string, QuickQuestion[]> = {
  overview: [
    { id: 'oee_health', en: 'How healthy is our OEE?', ar: 'ما وضع كفاءة المعدات OEE?', icon: '📊' },
    { id: 'top_issues', en: 'Top 3 issues right now?', ar: 'أهم 3 مشاكل الآن?', icon: '🔴' },
    { id: 'savings', en: 'Are we on track with savings?', ar: 'هل نحن على المسار الصحيح للوفورات?', icon: '💰' },
    { id: 'shift_perf', en: 'Which shift performs best?', ar: 'أي وردية أداؤها الأفضل?', icon: '👥' },
  ],
  kpi_intel: [
    { id: 'worst_kpi', en: 'Which KPI is furthest from target?', ar: 'أي مؤشر أبعد عن الهدف?', icon: '🎯' },
    { id: 'trend', en: 'What is the overall trend?', ar: 'ما الاتجاه العام?', icon: '📈' },
    { id: 'alerts', en: 'Why so many critical alerts?', ar: 'لماذا كثرة التنبيهات الحرجة?', icon: '⚠️' },
    { id: 'quality', en: 'How is our quality performance?', ar: 'كيف أداء الجودة?', icon: '✅' },
  ],
  pareto: [
    { id: 'biggest_loss', en: 'Our biggest loss category?', ar: 'أكبر فئة خسارة?', icon: '🔻' },
    { id: 'oee_breakdown', en: 'Explain OEE losses in detail', ar: 'اشرح تفكيك خسائر OEE', icon: '🔬' },
    { id: 'pareto_insight', en: 'What does Pareto tell us?', ar: 'ماذا يخبرنا باريتو?', icon: '📊' },
    { id: 'improve', en: 'Where should we focus?', ar: 'أين نركز أولاً?', icon: '🎯' },
  ],
  predictive: [
    { id: 'mtbf_status', en: 'How is MTBF trending?', ar: 'كيف يتجه MTBF?', icon: '📉' },
    { id: 'worst_asset', en: 'Which asset needs maintenance most?', ar: 'أي معدة تحتاج صيانة?', icon: '🔧' },
    { id: 'risk_prediction', en: 'Any failure risks this week?', ar: 'مخاطر تعطل هذا الأسبوع?', icon: '⚠️' },
    { id: 'mttr', en: 'How fast do we recover?', ar: 'سرعة التعافي من الأعطال?', icon: '⏱️' },
  ],
  inventory: [
    { id: 'stockout_risk', en: 'Which items will stock out first?', ar: 'أي المواد ستنفد أولاً?', icon: '📦' },
    { id: 'expedite', en: 'What needs urgent procurement?', ar: 'ماذا يحتاج شراء عاجل?', icon: '🚚' },
    { id: 'safety_stock', en: 'Are safety stock levels adequate?', ar: 'هل مخزون الأمان كافي?', icon: '🛡️' },
    { id: 'optimize', en: 'How to optimize inventory costs?', ar: 'كيف نحسن تكاليف المخزون?', icon: '💰' },
  ],
  actions: [
    { id: 'overdue', en: 'Which actions are overdue?', ar: 'أي الإجراءات متأخرة?', icon: '⏰' },
    { id: 'exec_status', en: 'How is execution progress?', ar: 'كيف تقدم التنفيذ?', icon: '📋' },
    { id: 'blockers', en: 'What is blocking completion?', ar: 'ما الذي يعيق الإنجاز?', icon: '🚧' },
    { id: 'prioritize', en: 'What should we prioritize?', ar: 'ماذا نعطي أولوية?', icon: '🎯' },
  ],
  roi: [
    { id: 'roi_summary', en: 'What is our ROI?', ar: 'ما عائد الاستثمار?', icon: '📈' },
    { id: 'payback', en: 'When is payback date?', ar: 'متى تاريخ الاسترداد?', icon: '📅' },
    { id: 'loss_vs_savings', en: 'Losses vs savings comparison', ar: 'مقارنة الخسائر والوفورات', icon: '⚖️' },
    { id: 'next_savings', en: 'Where can we save more?', ar: 'أين يمكن توفير المزيد?', icon: '💡' },
  ],
  evidence: [
    { id: 'verified', en: 'What evidence is verified?', ar: 'ما الأدلة الموثقة?', icon: '✅' },
    { id: 'lessons', en: 'Key lessons learned', ar: 'أهم الدروس المستفادة', icon: '📚' },
    { id: 'gaps', en: 'Verification gaps?', ar: 'فجوات التوثيق?', icon: '🔍' },
    { id: 'impact', en: 'What had the biggest impact?', ar: 'ما الأثر الأكبر?', icon: '💥' },
  ],
  handover: [
    { id: 'brief', en: 'Shift handover briefing', ar: 'محضر تسليم الوردية', icon: '📝' },
    { id: 'critical', en: 'Critical items to watch?', ar: 'أمور حرجة للمراقبة?', icon: '⚠️' },
    { id: 'actions', en: 'Open actions from previous shift', ar: 'إجراءات مفتوحة من السابق', icon: '🔄' },
    { id: 'safety', en: 'Any safety concerns?', ar: 'مخاوف سلامة?', icon: '🛡️' },
  ],
  reports: [
    { id: 'daily', en: 'Generate daily report', ar: 'توليد تقرير يومي', icon: '📅' },
    { id: 'weekly', en: 'Weekly performance summary', ar: 'ملخص أداء أسبوعي', icon: '📊' },
    { id: 'monthly', en: 'Monthly deep dive', ar: 'تحليل شهري معمق', icon: '📈' },
    { id: 'exec', en: 'Executive summary', ar: 'ملخص تنفيذي للإدارة', icon: '📋' },
  ],
  ai: [
    { id: 'health', en: 'Overall factory health assessment', ar: 'تقييم صحة المصنع العام', icon: '🏭' },
    { id: 'improve', en: 'Top improvement opportunities', ar: 'أهم فرص التحسين', icon: '💡' },
    { id: 'benchmark', en: 'Benchmark vs world-class', ar: 'مقارنة بالمعيار العالمي', icon: '🌍' },
    { id: 'roadmap', en: '30-60-90 day improvement roadmap', ar: 'خطة تحسين 30-60-90 يوماً', icon: '🗺️' },
    { id: 'risks', en: 'Top 5 factory risks', ar: 'أهم 5 مخاطر للمصنع', icon: '⚠️' },
    { id: 'dmaic', en: 'Apply DMAIC methodology', ar: 'تطبيق منهجية DMAIC', icon: '📋' },
  ],
  twin: [
    { id: 'layout', en: 'Analyze production layout', ar: 'تحليل تخطيط الإنتاج', icon: '🏗️' },
    { id: 'bottlenecks', en: 'Identify bottlenecks', ar: 'تحديد الاختناقات', icon: '🔴' },
    { id: 'flow', en: 'Material flow analysis', ar: 'تحليل تدفق المواد', icon: '↗️' },
    { id: 'waste', en: 'Where is waste in the process?', ar: 'أين الهدر في العملية?', icon: '🗑️' },
  ],
  simulator: [
    { id: 'scenario', en: 'Run a worst-case scenario', ar: 'شغّل سيناريو أسوأ حالة', icon: '⚠️' },
    { id: 'mitigation', en: 'Recommend mitigation plan', ar: 'توصية خطة تخفيف', icon: '🛡️' },
    { id: 'lead_time', en: 'How sensitive to delays?', ar: 'ما حساسيتنا للتأخير?', icon: '⏱️' },
    { id: 'cost_impact', en: 'Cost impact assessment', ar: 'تقدير الأثر المالي', icon: '💰' },
  ],
  voice_log: [
    { id: 'summary', en: 'Summarize recent logs', ar: 'لخّص السجلات الأخيرة', icon: '📝' },
    { id: 'patterns', en: 'Detect patterns', ar: 'اكتشف أنماطاً', icon: '🔍' },
    { id: 'urgent', en: 'Any urgent issues?', ar: 'مشاكل عاجلة?', icon: '🚨' },
    { id: 'trends', en: 'Voice log trends', ar: 'اتجاهات السجلات', icon: '📈' },
  ],
  settings: [],
};

export function getQuickQuestions(tab: string, lang: 'ar' | 'en'): { id: string; text: string; icon: string }[] {
  const questions = PAGE_QUICK_QUESTIONS[tab] || PAGE_QUICK_QUESTIONS.overview || [];
  return questions.map(q => ({ id: q.id, text: lang === 'ar' ? q.ar : q.en, icon: q.icon || '🤖' }));
}
