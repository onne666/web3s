import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, TrendingUp, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRates } from "@/lib/store";

const Index = () => {
  const navigate = useNavigate();
  const rates = getRates();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Premium Crypto Buyback</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            高于市价回收
            <span className="text-gradient-green block text-4xl mt-1">您的加密资产</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
            注册成为会员，享受高于市场价的专属收购价格，即时结算，安全可靠
          </p>
        </motion.div>

        {/* Member Card Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative mx-auto max-w-sm"
        >
          <div className="metal-texture rounded-2xl p-6 border border-border/50 glow-green">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs text-muted-foreground">MEMBER CARD</p>
                <p className="text-lg font-bold text-foreground">CRYPTO VIP</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">专属溢价</p>
                <p className="font-mono-num text-2xl font-bold text-primary">+2.5%</p>
              </div>
              <p className="text-xs text-muted-foreground">PREMIUM MEMBER</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Rate Comparison */}
      <section className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4">今日收购汇率</h2>
          <div className="glass-panel overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-4 py-3 text-xs text-muted-foreground border-b border-border/50">
              <span>币种</span>
              <span className="text-right">市场价</span>
              <span className="text-right text-primary font-medium">会员价</span>
              <span className="text-right">溢价</span>
            </div>
            {rates.map((coin, i) => {
              const premium = (((coin.memberPrice - coin.marketPrice) / coin.marketPrice) * 100).toFixed(2);
              return (
                <motion.div
                  key={coin.symbol}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{coin.symbol}</span>
                  </div>
                  <span className="font-mono-num text-sm text-right text-muted-foreground">
                    {coin.marketPrice.toLocaleString()}
                  </span>
                  <span className="font-mono-num text-sm text-right text-primary font-semibold">
                    {coin.memberPrice.toLocaleString()}
                  </span>
                  <span className="font-mono-num text-xs text-right text-primary font-medium flex items-center justify-end">
                    +{premium}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold mb-4">会员权益</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: TrendingUp, title: "高于市价回收", desc: "各币种收购价均高于市场价 2-3%" },
              { icon: Zap, title: "即时结算", desc: "验证通过后即时完成交易结算" },
              { icon: Shield, title: "安全保障", desc: "仅需只读权限 API，资产安全无忧" },
            ].map((b, i) => (
              <div key={i} className="glass-panel p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-4 py-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
            仅需 2 分钟 · 免费注册 · 安全无风险
          </p>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
