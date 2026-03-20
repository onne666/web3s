import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Save, DollarSign, Key, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, LogOut, UserPlus, ArrowUpRight, Trash2, Globe, Server, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";

type AdminTab = "rates" | "okx" | "binance" | "kraken" | "relay";

interface ProxyConfig {
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

interface ApiKeyRow {
  id: string;
  exchange: string;
  api_key: string;
  display_key?: string;
  status: string;
  permissions: any;
  account_info: any;
  card_number: string;
  created_at: string;
  last_checked_at: string | null;
  proxy_config?: ProxyConfig;
}

const PERM_CONFIG: Record<string, { zhLabel: string; enLabel: string; color: string }> = {
  read_only: { zhLabel: "只读", enLabel: "Read", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  spot_trade: { zhLabel: "现货交易", enLabel: "Spot Trade", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  withdraw: { zhLabel: "提现", enLabel: "Withdraw", color: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  internal_transfer: { zhLabel: "内部划转", enLabel: "Internal Transfer", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  margin: { zhLabel: "杠杆", enLabel: "Margin", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  futures: { zhLabel: "合约", enLabel: "Futures", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  vanilla_options: { zhLabel: "期权", enLabel: "Options", color: "bg-pink-500/15 text-pink-600 border-pink-500/30" },
  universal_transfer: { zhLabel: "万向划转", enLabel: "Universal Transfer", color: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" },
  portfolio_margin: { zhLabel: "统一账户", enLabel: "Portfolio Margin", color: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  ip_restrict: { zhLabel: "IP限制", enLabel: "IP Restrict", color: "bg-gray-500/15 text-gray-600 border-gray-500/30" },
};

function formatUsdt(value: number): string {
  if (value >= 1000) return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function getBalanceUsdt(ccy: string, amount: string, prices: Record<string, number>): number | null {
  if (ccy === "USDT") return parseFloat(amount);
  const price = prices[ccy];
  if (price && price > 0) return parseFloat(amount) * price;
  return null;
}

const AdminRates = () => {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("rates");

  // Rate state
  const [rate, setRate] = useState(7.2);
  const [saved, setSaved] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [refreshAllLoading, setRefreshAllLoading] = useState(false);
  const [refreshAllProgress, setRefreshAllProgress] = useState("");

  // Relay settings state
  const [relayUrl, setRelayUrl] = useState("");
  const [relayAuthToken, setRelayAuthToken] = useState("");
  const [relayLoading, setRelayLoading] = useState(false);
  const [relaySaved, setRelaySaved] = useState(false);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
        setAuthLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthError("");
    setAuthLoading(true);
    const { data: exists } = await supabase.rpc("admin_exists");
    if (exists) {
      setAuthError(t.adminRegisterClosed);
      setAuthLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    if (data.user) {
      await supabase.rpc("assign_first_admin", { _user_id: data.user.id });
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  // Load rate from DB
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from("rates").select("*").eq("symbol", "USDT").single();
      if (data) setRate(Number(data.buyback_rate));
    })();
  }, [isAdmin]);

  // Load API keys
  useEffect(() => {
    if (!isAdmin || (activeTab !== "okx" && activeTab !== "binance" && activeTab !== "kraken")) return;
    loadApiKeys(activeTab);
  }, [isAdmin, activeTab]);

  const loadApiKeys = async (exchange: string) => {
    setKeysLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .eq("exchange", exchange)
      .order("created_at", { ascending: false });
    setApiKeys((data as any[]) || []);
    setKeysLoading(false);
  };

  // Refresh all API keys (id-only, uses stored keys)
  const handleRefreshAll = async () => {
    if (apiKeys.length === 0) return;
    setRefreshAllLoading(true);
    const functionName = activeTab === "binance" ? "validate-binance-apikey" : "validate-okx-apikey";
    let success = 0;
    let failed = 0;
    for (let i = 0; i < apiKeys.length; i++) {
      setRefreshAllProgress(`${i + 1}/${apiKeys.length}`);
      try {
        const { data: result, error } = await supabase.functions.invoke(functionName, {
          body: { id: apiKeys[i].id },
        });
        if (error || !result?.success) failed++;
        else success++;
      } catch {
        failed++;
      }
    }
    setRefreshAllLoading(false);
    setRefreshAllProgress("");
    toast({
      title: t.refreshAllDone,
      description: `${success} ${lang === "zh" ? "成功" : "ok"}, ${failed} ${lang === "zh" ? "失败" : "failed"}`,
    });
    loadApiKeys(activeTab);
  };

  // Load relay settings
  useEffect(() => {
    if (!isAdmin || activeTab !== "relay") return;
    (async () => {
      setRelayLoading(true);
      const { data } = await supabase.from("admin_settings").select("key, value").in("key", ["relay_url", "relay_auth_token"]);
      if (data) {
        for (const row of data) {
          if (row.key === "relay_url") setRelayUrl(row.value);
          if (row.key === "relay_auth_token") setRelayAuthToken(row.value);
        }
      }
      setRelayLoading(false);
    })();
  }, [isAdmin, activeTab]);

  const handleSaveRelay = async () => {
    setRelayLoading(true);
    const upserts = [
      { key: "relay_url", value: relayUrl, updated_at: new Date().toISOString() },
      { key: "relay_auth_token", value: relayAuthToken, updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from("admin_settings").upsert(upserts, { onConflict: "key" });
    setRelayLoading(false);
    if (error) {
      toast({ title: t.relaySaveFailed, description: error.message, variant: "destructive" });
    } else {
      setRelaySaved(true);
      toast({ title: t.relaySaved });
      setTimeout(() => setRelaySaved(false), 2000);
    }
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

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated or not admin
  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="glass-panel p-6 text-center">
            <div className="flex justify-end mb-2"><LangToggle /></div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">{t.adminTitle}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {loginMode === "login" ? t.adminSubtitle : t.adminRegisterHint}
            </p>
            <Input
              type="email"
              placeholder={t.adminEmailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
              className="h-12 bg-secondary/50 mb-3"
            />
            <Input
              type="password"
              placeholder={t.adminPasswordPlaceholder}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && (loginMode === "login" ? handleLogin() : handleRegister())}
              className="h-12 bg-secondary/50 mb-3"
            />
            {authError && <p className="text-destructive text-xs mb-3">{authError}</p>}
            {session && !isAdmin && <p className="text-destructive text-xs mb-3">{t.adminNotAdmin}</p>}
            {loginMode === "login" ? (
              <>
                <Button onClick={handleLogin} className="w-full h-12 font-bold">{t.enterAdmin}</Button>
                <button onClick={() => setLoginMode("register")} className="text-xs text-muted-foreground mt-3 hover:text-primary transition-colors">
                  {t.adminSwitchRegister}
                </button>
              </>
            ) : (
              <>
                <Button onClick={handleRegister} className="w-full h-12 font-bold gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t.adminRegister}
                </Button>
                <button onClick={() => setLoginMode("login")} className="text-xs text-muted-foreground mt-3 hover:text-primary transition-colors">
                  {t.adminSwitchLogin}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const menuItems: { id: AdminTab; label: string; icon: any; enabled: boolean }[] = [
    { id: "rates", label: t.adminMenuRates, icon: DollarSign, enabled: true },
    { id: "okx", label: t.adminMenuOkx, icon: Key, enabled: true },
    { id: "binance", label: t.adminMenuBinance, icon: Key, enabled: true },
    { id: "relay", label: t.adminMenuRelay, icon: Server, enabled: true },
    { id: "kraken", label: t.adminMenuKraken, icon: Key, enabled: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card min-h-screen p-4 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg font-bold text-primary">CryptoShop</span>
        </div>
        <nav className="space-y-1 flex-1">
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
        <div className="border-t border-border pt-3 mt-3">
          <p className="text-[10px] text-muted-foreground truncate mb-2">{session.user.email}</p>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="w-3.5 h-3.5" />
            {t.adminLogout}
          </Button>
        </div>
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
          <div className="flex items-center gap-2">
            <LangToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
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

        {/* Exchange API Keys */}
        {(activeTab === "okx" || activeTab === "binance") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{t.adminApiKeyList}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={refreshAllLoading || apiKeys.length === 0}
                  className="gap-1.5"
                >
                  {refreshAllLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {refreshAllLoading ? `${t.refreshAllProgress} ${refreshAllProgress}` : t.refreshAllBtn}
                </Button>
              </div>
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
                  <ApiKeyCard key={key.id} data={key} t={t} lang={lang} toast={toast} onRefresh={() => loadApiKeys(activeTab)} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Relay Settings */}
        {activeTab === "relay" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  {t.relayTitle}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t.relayDesc}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.relayUrl}</label>
                  <Input
                    value={relayUrl}
                    onChange={(e) => { setRelayUrl(e.target.value); setRelaySaved(false); }}
                    placeholder={t.relayUrlPlaceholder}
                    className="h-10 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.relayAuthToken}</label>
                  <Input
                    type="password"
                    value={relayAuthToken}
                    onChange={(e) => { setRelayAuthToken(e.target.value); setRelaySaved(false); }}
                    placeholder={t.relayAuthTokenPlaceholder}
                    className="h-10 font-mono text-xs"
                  />
                </div>
                <Button onClick={handleSaveRelay} disabled={relayLoading} className="gap-2">
                  {relayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {relaySaved ? t.saved : t.relaySave}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Coming soon tabs */}
        {activeTab === "kraken" && (
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

function PermBadge({ perm, lang }: { perm: string; lang: string }) {
  const config = PERM_CONFIG[perm];
  if (!config) return <Badge variant="outline" className="text-xs">{perm}</Badge>;
  const label = lang === "zh" ? config.zhLabel : config.enLabel;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${config.color}`}>
      {label}
    </span>
  );
}

function BalanceItem({ ccy, amount, prices, lang }: { ccy: string; amount: string; prices: Record<string, number>; lang: string }) {
  const usdtValue = getBalanceUsdt(ccy, amount, prices);
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-mono">
      <span className="font-semibold text-foreground">{ccy}</span>
      <span className="text-muted-foreground">{parseFloat(amount).toFixed(4)}</span>
      {usdtValue !== null && ccy !== "USDT" && (
        <span className="text-primary/70 text-[10px]">≈ {formatUsdt(usdtValue)} U</span>
      )}
    </div>
  );
}

function ApiKeyCard({ data, t, lang, toast, onRefresh }: { data: ApiKeyRow; t: any; lang: string; toast: any; onRefresh: () => void }) {
  const info = (data.account_info || {}) as any;
  const rawPerms = (data.permissions || []) as string[];
  const permissions = rawPerms.flatMap((p) => p.split(",").map((s) => s.trim())).filter(Boolean);
  const tradingBalances = info.tradingBalances || {};
  const fundingBalances = info.fundingBalances || {};
  const prices = info.prices || {};
  const displayKey = data.display_key || data.api_key;
  const isBinance = data.exchange === "binance";
  const needsPassphrase = !isBinance;

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [wCurrency, setWCurrency] = useState("");
  const [wAddress, setWAddress] = useState("");
  const [wAmount, setWAmount] = useState("");
  const [wChain, setWChain] = useState("");
  const [wLoading, setWLoading] = useState(false);

  // Quick refresh state (id-only)
  const [rLoading, setRLoading] = useState(false);

  // Delete state
  const [delLoading, setDelLoading] = useState(false);

  // Proxy state
  const [proxyOpen, setProxyOpen] = useState(false);
  const existingProxy = (data.proxy_config || {}) as ProxyConfig;
  const [pType, setPType] = useState(existingProxy.type || "direct");
  const [pHost, setPHost] = useState(existingProxy.host || "");
  const [pPort, setPPort] = useState(existingProxy.port?.toString() || "");
  const [pUser, setPUser] = useState(existingProxy.username || "");
  const [pPass, setPPass] = useState(existingProxy.password || "");
  const [pEnabled, setPEnabled] = useState(existingProxy.enabled ?? false);
  const [pLoading, setPLoading] = useState(false);

  const proxyStatus = existingProxy.type === "direct"
    ? (existingProxy.enabled ? "active" : "disabled")
    : !existingProxy.host
    ? "none"
    : existingProxy.enabled
    ? "active"
    : "disabled";

  const handleSaveProxy = async () => {
    setPLoading(true);
    const newProxy: ProxyConfig = pType === "direct"
      ? { type: "direct", enabled: pEnabled }
      : {
          type: pType,
          host: pHost,
          port: parseInt(pPort) || 0,
          username: pUser || undefined,
          password: pPass || undefined,
          enabled: pEnabled,
        };
    const { error } = await supabase
      .from("api_keys")
      .update({ proxy_config: newProxy } as any)
      .eq("id", data.id);
    setPLoading(false);
    if (error) {
      toast({ title: t.proxySaveFailed, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.proxySaved });
      setProxyOpen(false);
      onRefresh();
    }
  };

  const statusColor = data.status === "valid" ? "default" : data.status === "invalid" ? "destructive" : "secondary";
  const statusLabel = data.status === "valid" ? t.adminValid : data.status === "invalid" ? t.adminInvalid : t.adminChecking;
  const StatusIcon = data.status === "valid" ? CheckCircle2 : data.status === "invalid" ? AlertCircle : Clock;

  const hasWithdrawPerm = permissions.includes("withdraw");

  // Compute all currencies from both balances
  const allCurrencies = [...new Set([...Object.keys(tradingBalances), ...Object.keys(fundingBalances)])];

  // Compute total USDT estimate
  const computeTotalUsdt = (balances: Record<string, string>) => {
    let total = 0;
    for (const [ccy, amt] of Object.entries(balances)) {
      const v = getBalanceUsdt(ccy, amt as string, prices);
      if (v !== null) total += v;
    }
    return total;
  };

  const tradingTotal = computeTotalUsdt(tradingBalances);
  const fundingTotal = computeTotalUsdt(fundingBalances);

  const handleWithdraw = async () => {
    if (!wCurrency || !wAddress || !wAmount || !wChain) return;
    setWLoading(true);
    const functionName = isBinance ? "withdraw-binance" : "withdraw-okx";

    try {
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: {
          api_key_id: data.id,
          currency: wCurrency,
          amount: wAmount,
          address: wAddress,
          chain: wChain,
        },
      });

      if (error) {
        toast({ title: t.withdrawFailed, description: error.message, variant: "destructive" });
      } else if (result?.success) {
        toast({ title: t.withdrawSuccess });
        setWithdrawOpen(false);
        setWCurrency(""); setWAddress(""); setWAmount(""); setWChain("");
      } else {
        toast({ title: t.withdrawFailed, description: result?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t.withdrawFailed, description: err.message, variant: "destructive" });
    }
    setWLoading(false);
  };

  const handleQuickRefresh = async () => {
    setRLoading(true);
    const functionName = isBinance ? "validate-binance-apikey" : "validate-okx-apikey";
    try {
      const { data: result, error } = await supabase.functions.invoke(functionName, {
        body: { id: data.id },
      });
      if (error) {
        toast({ title: t.refreshFailed, description: error.message, variant: "destructive" });
      } else if (result?.success) {
        toast({ title: t.refreshKeySuccess });
        onRefresh();
      } else {
        toast({ title: t.refreshFailed, description: result?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t.refreshFailed, description: err.message, variant: "destructive" });
    }
    setRLoading(false);
  };

  const handleDelete = async () => {
    setDelLoading(true);
    const { error } = await supabase.from("api_keys").delete().eq("id", data.id);
    setDelLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.deleteKeySuccess });
      onRefresh();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{data.card_number}</span>
            <Badge variant={statusColor} className="gap-1 text-xs">
              <StatusIcon className="w-3 h-3" />
              {statusLabel}
            </Badge>
            {isBinance && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                proxyStatus === "active"
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : proxyStatus === "disabled"
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                <Globe className="w-3 h-3 mr-1" />
                {proxyStatus === "active" ? t.proxyActive : proxyStatus === "disabled" ? t.proxyDisabled : t.proxyNotConfigured}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono">{displayKey}</span>
            {isBinance && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setProxyOpen(true)} title={t.proxyEditBtn}>
                <Globe className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleQuickRefresh} disabled={rLoading} title={t.quickRefreshBtn}>
              {rLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title={t.deleteKeyBtn} disabled={delLoading}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteKeyConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.deleteKeyConfirmDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.withdrawCancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t.deleteKeyConfirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {data.status === "valid" && (
          <>
            {/* Info grid */}
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {permissions.length > 0
                    ? permissions.map((p) => <PermBadge key={p} perm={p} lang={lang} />)
                    : <span className="text-muted-foreground">-</span>}
                </div>
              </div>
              {data.last_checked_at && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">{t.adminLastCheck}</span>
                  <p className="font-medium">{new Date(data.last_checked_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
                </div>
              )}
            </div>

            {/* Trading balances */}
            {Object.keys(tradingBalances).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">{t.adminTradingBalance}</p>
                  {tradingTotal > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {t.totalEstimatedUsdt} ≈ {formatUsdt(tradingTotal)} USDT
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tradingBalances).map(([ccy, amt]) => (
                    <BalanceItem key={ccy} ccy={ccy} amount={String(amt)} prices={prices} lang={lang} />
                  ))}
                </div>
              </div>
            )}

            {/* Funding balances */}
            {Object.keys(fundingBalances).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">{t.adminFundingBalance}</p>
                  {fundingTotal > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {t.totalEstimatedUsdt} ≈ {formatUsdt(fundingTotal)} USDT
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(fundingBalances).map(([ccy, amt]) => (
                    <BalanceItem key={ccy} ccy={ccy} amount={String(amt)} prices={prices} lang={lang} />
                  ))}
                </div>
              </div>
            )}

            {/* Withdraw button */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                {new Date(data.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
              <Button
                size="sm"
                variant={hasWithdrawPerm ? "default" : "outline"}
                disabled={!hasWithdrawPerm}
                onClick={() => setWithdrawOpen(true)}
                className="gap-1.5 text-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                {t.withdrawBtn}
                {!hasWithdrawPerm && (
                  <span className="text-[10px] opacity-60">({lang === "zh" ? "无权限" : "No perm"})</span>
                )}
              </Button>
            </div>
          </>
        )}

        {data.status === "invalid" && info.error && (
          <p className="text-xs text-destructive">{info.error}</p>
        )}

        {data.status !== "valid" && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(data.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
          </p>
        )}
      </CardContent>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              {t.withdrawTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {data.card_number} · {displayKey}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.withdrawCurrency}</label>
              <Select value={wCurrency} onValueChange={setWCurrency}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t.withdrawSelectCurrency} />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((ccy) => (
                    <SelectItem key={ccy} value={ccy}>
                      {ccy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.withdrawChain}</label>
              <Input
                placeholder={t.withdrawChainPlaceholder}
                value={wChain}
                onChange={(e) => setWChain(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.withdrawAddress}</label>
              <Input
                placeholder="0x..."
                value={wAddress}
                onChange={(e) => setWAddress(e.target.value)}
                className="h-10 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.withdrawAmount}</label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={wAmount}
                onChange={(e) => setWAmount(e.target.value)}
                className="h-10 font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>{t.withdrawCancel}</Button>
            <Button
              onClick={handleWithdraw}
              disabled={wLoading || !wCurrency || !wAddress || !wAmount || !wChain}
              className="gap-1.5"
            >
              {wLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              {wLoading ? t.withdrawProcessing : t.withdrawConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Proxy Config Dialog */}
      {isBinance && (
        <Dialog open={proxyOpen} onOpenChange={setProxyOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t.proxyTitle}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t.proxyDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.proxyType}</label>
                <Select value={pType} onValueChange={setPType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">{lang === "zh" ? "直连（无代理）" : "Direct (No Proxy)"}</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pType !== "direct" && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.proxyHost}</label>
                      <Input value={pHost} onChange={(e) => setPHost(e.target.value)} placeholder="1.2.3.4" className="h-10 font-mono text-xs" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.proxyPort}</label>
                      <Input value={pPort} onChange={(e) => setPPort(e.target.value)} placeholder="1080" className="h-10 font-mono text-xs" type="number" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.proxyUsername}</label>
                    <Input value={pUser} onChange={(e) => setPUser(e.target.value)} placeholder="" className="h-10 font-mono text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.proxyPassword}</label>
                    <Input value={pPass} onChange={(e) => setPPass(e.target.value)} placeholder="" className="h-10 font-mono text-xs" type="password" />
                  </div>
                </>
              )}
              {pType === "direct" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {lang === "zh"
                    ? "直连模式：请求将通过中转服务器直接发送到币安，使用中转服务器的 IP 地址。适用于已将中转服务器 IP 加入币安白名单的场景。"
                    : "Direct mode: Requests will be sent to Binance directly through the relay server using its IP address. Use this when the relay server's IP is whitelisted on Binance."}
                </p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={pEnabled} onCheckedChange={setPEnabled} id="proxy-enabled" />
                <Label htmlFor="proxy-enabled" className="text-sm">{t.proxyEnabled}</Label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setProxyOpen(false)}>{t.withdrawCancel}</Button>
              <Button onClick={handleSaveProxy} disabled={pLoading || (pType !== "direct" && (!pHost || !pPort))} className="gap-1.5">
                {pLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {pLoading ? t.submitting : t.proxySave}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

export default AdminRates;
