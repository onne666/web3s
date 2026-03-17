import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRates } from "@/lib/store";

const Index = () => {
  const navigate = useNavigate();
  const rates = getRates();
  const usdt = rates.find((r) => r.symbol === "USDT") || rates[0];

  return (
    <div className="min-h-screen bg-sci-fi overflow-x-hidden">
      {/* Hero */}
      <section className="relative px-4 pt-16 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">快速 · 安全 · 便捷</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            <span className="text-gradient-purple text-4xl">CryptoShop</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            专业数字资产兑换服务，即时结算，安全可靠
          </p>
        </motion.div>
      </section>

      {/* USDT Rate Card */}
      <section className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-panel p-8 glow-purple text-center"
        >
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">USDT 兑换汇率</p>
          <div className="flex items-baseline justify-center gap-3 mb-2">
            <span className="font-mono-num text-2xl font-bold text-foreground">1</span>
            <span className="text-sm text-muted-foreground">USDT</span>
            <span className="text-xl text-muted-foreground">=</span>
            <span className="font-mono-num text-5xl font-bold text-primary">{usdt?.buybackRate.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">CNY</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">实时更新 · Tether (TRC-20)</p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-4 py-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            onClick={() => navigate("/select-exchange")}
            className="w-full h-14 text-base font-bold rounded-xl animate-pulse-glow"
          >
            立即注册会员
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            仅需 2 分钟 · 免费注册
          </p>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
