import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Save, DollarSign, Key, RefreshCw, ChevronRight, AlertCircle, CheckCircle2, Clock, Loader2, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import type { Session } from "@supabase/supabase-js";

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
    // Check if any admin exists
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
    // Assign first admin
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
    { id: "binance", label: t.adminMenuBinance, icon: Key, enabled: false },
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

        {data.status === "invalid" && info.error && (
          <p className="text-xs text-destructive">{info.error}</p>
        )}

        <p className="text-[10px] text-muted-foreground">
          {new Date(data.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
        </p>
      </CardContent>
    </Card>
  );
}

export default AdminRates;
