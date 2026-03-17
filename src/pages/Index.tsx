import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRatesFromDb } from "@/lib/store";
import { DEFAULT_RATES } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import ParticleBackground from "@/components/ParticleBackground";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [usdt, setUsdt] = useState(DEFAULT_RATES[0]);

  useEffect(() => {
    getRatesFromDb().then((rates) => {
      const found = rates.find((r) => r.symbol === "USDT");
      if (found) setUsdt(found);
    });
  }, []);

  const features = [
    { icon: Zap, title: t.featureFast, desc: t.featureFastDesc },
    { icon: Shield, title: t.featureSafe, desc: t.featureSafeDesc },
    { icon: Clock, title: t.feature24h, desc: t.feature24hDesc },
  ];

  return (
    <div className="min-h-screen bg-sci-fi overflow-x-hidden relative scanline-overlay scan-beam grid-overlay">
      <ParticleBackground />
      <div className="relative z-10">
        <header className="flex items-center justify-between px-4 pt-6 pb-2">
          <span className="text-gradient-purple text-lg font-bold tracking-tight neon-text">CryptoShop</span>
          <LangToggle />
        </header>

        <section className="relative px-4 pt-8 pb-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{t.heroTagline}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              <span className="text-gradient-purple text-5xl">{t.heroTitle}</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{t.heroSubtitle}</p>
          </motion.div>
        </section>

        <section className="px-4 py-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="glass-panel p-8 glow-purple relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t.rateLabel}</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{t.networkLabel}</span>
              </div>
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2 font-medium">1 USDT</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-muted-foreground text-2xl">=</span>
                  <span className="font-mono-num text-6xl font-bold text-primary leading-none neon-text">{usdt.buybackRate.toFixed(2)}</span>
                  <span className="text-lg text-muted-foreground font-medium">CNY</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">{t.liveUpdate}</span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.08 }} className="glass-panel p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold mb-1">{f.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="px-4 py-8 pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button size="lg" onClick={() => navigate("/select-exchange")} className="w-full h-14 text-base font-bold rounded-xl animate-pulse-glow">
              {t.ctaButton}
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">{t.ctaSubtext}</p>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default Index;
