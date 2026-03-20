import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EXCHANGES } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const exchangeColors: Record<string, string> = {
  binance: "from-yellow-500/20 to-yellow-600/5",
  okx: "from-foreground/10 to-foreground/5",
  bybit: "from-orange-500/20 to-orange-600/5",
  bitget: "from-blue-500/20 to-blue-600/5",
  kraken: "from-purple-500/20 to-purple-600/5",
};

const SelectExchange = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>
        <LangToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">{t.selectTitle}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t.selectSubtitle}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {EXCHANGES.map((ex, i) => (
          <motion.button
            key={ex.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/api-key/${ex.id}`)}
            className={`glass-panel p-5 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors bg-gradient-to-br ${exchangeColors[ex.id] || ""}`}
          >
            {ex.logo.startsWith("http") ? (
              <img src={ex.logo} alt={ex.name} className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-3xl">{ex.logo}</span>
            )}
            <span className="font-semibold text-sm">{ex.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SelectExchange;
