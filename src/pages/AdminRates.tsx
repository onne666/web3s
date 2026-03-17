import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRates, saveRates, verifyAdminPassword } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const AdminRates = () => {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState(false);
  const [rate, setRate] = useState(() => {
    const rates = getRates();
    const usdt = rates.find((r) => r.symbol === "USDT");
    return usdt?.buybackRate ?? 7.2;
  });
  const [saved, setSaved] = useState(false);

  const handleLogin = () => {
    if (verifyAdminPassword(password)) {
      setAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const handleSave = () => {
    saveRates([{ symbol: "USDT", name: "Tether", buybackRate: rate, currency: "CNY" }]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="glass-panel p-6 text-center">
            <div className="flex justify-end mb-2"><LangToggle /></div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">{t.adminTitle}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t.adminSubtitle}</p>
            <Input
              type="password"
              placeholder={t.adminPasswordPlaceholder}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPassError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="h-12 bg-secondary/50 mb-3"
            />
            {passError && <p className="text-destructive text-xs mb-3">{t.passwordError}</p>}
            <Button onClick={handleLogin} className="w-full h-12 font-bold">{t.enterAdmin}</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sci-fi px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t.rateManagement}</h1>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button onClick={handleSave} size="sm" className="gap-1">
            <Save className="w-4 h-4" />
            {saved ? t.saved : t.save}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-6 glow-purple">
        <p className="text-sm font-semibold mb-4">{t.usdtRate}</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">1 USDT =</span>
          <Input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => { setRate(parseFloat(e.target.value) || 0); setSaved(false); }}
            className="h-12 bg-secondary/50 font-mono-num text-xl flex-1"
          />
          <span className="text-sm text-muted-foreground">CNY</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminRates;
