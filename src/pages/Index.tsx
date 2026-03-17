import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRates } from "@/lib/store";

const Index = () => {
  const navigate = useNavigate();
  const rates = getRates();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero */}
      <section className="relative px-4 pt-16 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/3 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">快速 · 安全 · 便捷</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            <span className="text-gradient-blue text-4xl">CryptoShop</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            专业数字资产兑换服务，即时结算，安全可靠
          </p>
        </motion.div>
      </section>

      {/* Today's Rates */}
      <section className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4">今日兑换汇率</h2>
          <div className="space-y-3">
            {rates.map((coin, i) => (
              <motion.div
                key={coin.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="glass-panel p-5 glow-blue"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{coin.name}</p>
                    <p className="text-lg font-bold">{coin.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">兑换价</p>
                    <p className="font-mono-num text-3xl font-bold text-primary">
                      {coin.buybackRate.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{coin.currency}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
