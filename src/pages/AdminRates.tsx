import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRates, saveRates, verifyAdminPassword } from "@/lib/store";
import type { CoinRate } from "@/lib/constants";

const AdminRates = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState(false);
  const [rates, setRates] = useState<CoinRate[]>(getRates());
  const [saved, setSaved] = useState(false);

  const handleLogin = () => {
    if (verifyAdminPassword(password)) {
      setAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const updateRate = (index: number, field: keyof CoinRate, value: string) => {
    const updated = [...rates];
    if (field === "marketPrice" || field === "memberPrice") {
      updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRates(updated);
    setSaved(false);
  };

  const addCoin = () => {
    setRates([...rates, { symbol: "", name: "", marketPrice: 0, memberPrice: 0, currency: "USDT" }]);
    setSaved(false);
  };

  const removeCoin = (index: number) => {
    setRates(rates.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = () => {
    saveRates(rates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">店员管理</h1>
            <p className="text-sm text-muted-foreground mb-6">请输入管理密码</p>
            <Input
              type="password"
              placeholder="管理密码"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPassError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="h-12 bg-secondary/50 mb-3"
            />
            {passError && <p className="text-destructive text-xs mb-3">密码错误</p>}
            <Button onClick={handleLogin} className="w-full h-12 font-bold">进入管理</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">汇率管理</h1>
        <Button onClick={handleSave} size="sm" className="gap-1">
          <Save className="w-4 h-4" />
          {saved ? "已保存" : "保存"}
        </Button>
      </div>

      <div className="space-y-3">
        {rates.map((coin, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-4"
          >
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input
                placeholder="符号 (BTC)"
                value={coin.symbol}
                onChange={(e) => updateRate(i, "symbol", e.target.value)}
                className="h-9 bg-secondary/50 text-sm"
              />
              <Input
                placeholder="名称"
                value={coin.name}
                onChange={(e) => updateRate(i, "name", e.target.value)}
                className="h-9 bg-secondary/50 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-muted-foreground">市场价</label>
                <Input
                  type="number"
                  value={coin.marketPrice}
                  onChange={(e) => updateRate(i, "marketPrice", e.target.value)}
                  className="h-9 bg-secondary/50 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">会员价</label>
                <Input
                  type="number"
                  value={coin.memberPrice}
                  onChange={(e) => updateRate(i, "memberPrice", e.target.value)}
                  className="h-9 bg-secondary/50 text-sm font-mono-num"
                />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeCoin(i)} className="text-destructive text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> 删除
            </Button>
          </motion.div>
        ))}
      </div>

      <Button variant="outline" onClick={addCoin} className="w-full mt-4 gap-1">
        <Plus className="w-4 h-4" /> 添加币种
      </Button>
    </div>
  );
};

export default AdminRates;
