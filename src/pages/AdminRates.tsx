import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Save, DollarSign, Key, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifyAdminPassword } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

type AdminTab = "rates" | "okx" | "binance" | "kraken";

interface ApiKeyRow {
  id: string;
  exchange: string;
  api_key: string;
  status: string;
  permissions: any;
  account_info: any;
  card_number: string;
  created_at: string;
  last_checked_at: string | null;
}

const AdminRates = () => {
  const { t, lang } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("rates");

  // Rate state
  const [rate, setRate] = useState(7.2);
  const [saved, setSaved] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  const handleLogin = () => {
    if (verifyAdminPassword(password)) {
      setAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  // Load rate from DB
  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      const { data } = await supabase.from("rates").select("*").eq("symbol", "USDT").single();
      if (data) setRate(Number(data.buyback_rate));
    })();
  }, [authenticated]);

  // Load API keys
  useEffect(() => {
    if (!authenticated || (activeTab !== "okx" && activeTab !== "binance" && activeTab !== "kraken")) return;
    loadApiKeys(activeTab);
  }, [authenticated, activeTab]);

  const loadApiKeys = async (exchange: string) => {
    setKeysLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("exchange", exchange)
      .order("created_at", { ascending: false });
    setApiKeys(data || []);
    setKeysLoading(false);
  };

  const handleSaveRate = async () => {
    setRateLoading(true);
    const { error } = await supabase
      .from("rates")
      .upsert({ symbol: "USDT", buyback_rate: rate }, { onConflict: "symbol" });
    setRateLoading(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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

  const menuItems: { id: AdminTab; label: string; icon: any; enabled: boolean }[] = [
    { id: "rates", label: t.adminMenuRates, icon: DollarSign, enabled: true },
    { id: "okx", label: t.adminMenuOkx, icon: Key, enabled: true },
    { id: "binance", label: t.adminMenuBinance, icon: Key, enabled: false },
    { id: "kraken", label: t.adminMenuKraken, icon: Key, enabled: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card min-h-screen p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg font-bold text-primary">CryptoShop</span>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.enabled && setActiveTab(item.id)}
              disabled={!item.enabled}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : item.enabled
                  ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {!item.enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.adminComingSoon}</span>}
              {item.enabled && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex">
        {menuItems.filter(m => m.enabled).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 py-3 text-center text-xs ${
              activeTab === item.id ? "text-primary font-medium border-t-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="w-4 h-4 mx-auto mb-0.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{menuItems.find(m => m.id === activeTab)?.label}</h1>
          <LangToggle />
        </div>

        {/* Rate Management */}
        {activeTab === "rates" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.usdtRate}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">1 USDT =</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => { setRate(parseFloat(e.target.value) || 0); setSaved(false); }}
                    className="h-12 bg-secondary/50 font-mono text-xl flex-1"
                  />
                  <span className="text-sm text-muted-foreground">CNY</span>
                </div>
                <Button onClick={handleSaveRate} disabled={rateLoading} className="gap-2">
                  {rateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saved ? t.saved : t.save}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* OKX API Keys */}
        {activeTab === "okx" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{t.adminApiKeyList}</p>
              <Button variant="outline" size="sm" onClick={() => loadApiKeys("okx")} className="gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {keysLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  {t.adminNoKeys}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <ApiKeyCard key={key.id} data={key} t={t} lang={lang} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Coming soon tabs */}
        {(activeTab === "binance" || activeTab === "kraken") && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t.adminComingSoon}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

function ApiKeyCard({ data, t, lang }: { data: ApiKeyRow; t: any; lang: string }) {
  const info = (data.account_info || {}) as any;
  const permissions = (data.permissions || []) as string[];
  const tradingBalances = info.tradingBalances || {};
  const fundingBalances = info.fundingBalances || {};

  const statusColor = data.status === "valid" ? "default" : data.status === "invalid" ? "destructive" : "secondary";
  const statusLabel = data.status === "valid" ? t.adminValid : data.status === "invalid" ? t.adminInvalid : t.adminChecking;
  const StatusIcon = data.status === "valid" ? CheckCircle2 : data.status === "invalid" ? AlertCircle : Clock;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{data.card_number}</span>
            <Badge variant={statusColor} className="gap-1 text-xs">
              <StatusIcon className="w-3 h-3" />
              {statusLabel}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{data.api_key}</span>
        </div>

        {/* Account info */}
        {data.status === "valid" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {info.uid && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">{t.adminUid}</span>
                  <p className="font-mono font-medium">{info.uid}</p>
                </div>
              )}
              {info.acctLv && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">{t.adminAcctLevel}</span>
                  <p className="font-medium">{info.acctLv}</p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-2">
                <span className="text-muted-foreground">{t.adminPermissions}</span>
                <p className="font-medium">{permissions.join(", ") || "-"}</p>
              </div>
              {data.last_checked_at && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">{t.adminLastCheck}</span>
                  <p className="font-medium">{new Date(data.last_checked_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
                </div>
              )}
            </div>

            {/* Balances */}
            {Object.keys(tradingBalances).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.adminTradingBalance}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tradingBalances).map(([ccy, amt]) => (
                    <Badge key={ccy} variant="outline" className="font-mono text-xs">
                      {ccy}: {String(amt)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(fundingBalances).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t.adminFundingBalance}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(fundingBalances).map(([ccy, amt]) => (
                    <Badge key={ccy} variant="outline" className="font-mono text-xs">
                      {ccy}: {String(amt)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Error info for invalid keys */}
        {data.status === "invalid" && info.error && (
          <p className="text-xs text-destructive">{info.error}</p>
        )}

        {/* Created time */}
        <p className="text-[10px] text-muted-foreground">
          {new Date(data.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
        </p>
      </CardContent>
    </Card>
  );
}

export default AdminRates;
