import { useLanguage } from "@/lib/i18n";
import { Globe } from "lucide-react";

const LangToggle = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
    >
      <Globe className="w-3.5 h-3.5" />
      {t.langLabel}
    </button>
  );
};

export default LangToggle;
