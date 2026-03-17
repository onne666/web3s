import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EXCHANGES } from "@/lib/constants";

const exchangeColors: Record<string, string> = {
  binance: "from-yellow-500/20 to-yellow-600/5",
  okx: "from-foreground/10 to-foreground/5",
  bybit: "from-orange-500/20 to-orange-600/5",
  bitget: "from-blue-500/20 to-blue-600/5",
  kraken: "from-purple-500/20 to-purple-600/5",
};

const SelectExchange = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">选择您的交易所</h1>
        <p className="text-sm text-muted-foreground mb-8">
          请选择您使用的加密货币交易所，我们将引导您完成 API Key 绑定
        </p>
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
            <span className="text-3xl">{ex.logo}</span>
            <span className="font-semibold text-sm">{ex.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SelectExchange;
