import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXCHANGES, API_KEY_GUIDES, ExchangeId, EXCHANGES_WITH_PASSPHRASE } from "@/lib/constants";
import { addMember } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const ApiKeyInput = () => {
  const { exchangeId } = useParams<{ exchangeId: string }>();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const exchange = EXCHANGES.find((e) => e.id === exchangeId);
  const guide = API_KEY_GUIDES[exchangeId || ""];
  const steps = guide ? (lang === "en" ? guide.stepsEn : guide.steps) : [];
  const needsPassphrase = EXCHANGES_WITH_PASSPHRASE.includes(exchangeId || "");

  const handleSubmit = async () => {
    if (!apiKey.trim() || !secretKey.trim()) return;
    if (needsPassphrase && !passphrase.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    if (exchangeId === "okx" || exchangeId === "binance") {
      const functionName = exchangeId === "okx" ? "validate-okx-apikey" : "validate-binance-apikey";

      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { api_key: apiKey, secret_key: secretKey, passphrase },
        });

        if (error) {
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }

        if (data?.success) {
          setStatus("success");
          setTimeout(() => navigate(`/member/${data.id}`), 1000);
        } else {
          setStatus("error");
          setErrorMsg(data?.error || t.validationFailed);
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || t.validationFailed);
      }
    } else {
      // Other exchanges: use legacy localStorage flow for now
      await new Promise((r) => setTimeout(r, 800));
      setStatus("success");
      const member = addMember(exchangeId as ExchangeId, apiKey);
      setTimeout(() => navigate(`/member/${member.id}`), 1000);
    }
  };

  const canSubmit =
    apiKey.trim() &&
    secretKey.trim() &&
    (!needsPassphrase || passphrase.trim()) &&
    status === "idle";

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>
        <LangToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          {exchange?.logo.startsWith("http") ? (
            <img src={exchange.logo} alt={exchange.name} className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-2xl">{exchange?.logo}</span>
          )}
          <h1 className="text-2xl font-bold">{exchange?.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{t.bindTitle}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-4 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">{t.securityTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.securityDesc} <span className="text-foreground font-medium">{t.securityReadOnly}</span> {t.securityDescEnd}
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8">
        <h3 className="text-sm font-semibold mb-3">{t.guideTitle}</h3>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-1.5 block">{t.apiKeyLabel}</label>
          <Input placeholder={t.apiKeyPlaceholder} value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="h-12 bg-secondary/50 font-mono text-sm" disabled={status === "loading" || status === "success"} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">{t.secretKeyLabel}</label>
          <Input type="password" placeholder={t.secretKeyPlaceholder} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="h-12 bg-secondary/50 font-mono text-sm" disabled={status === "loading" || status === "success"} />
        </div>
        {needsPassphrase && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t.passphraseLabel}</label>
            <Input type="password" placeholder={t.passphrasePlaceholder} value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="h-12 bg-secondary/50 font-mono text-sm" disabled={status === "loading" || status === "success"} />
          </div>
        )}
      </motion.div>

      {status === "success" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-primary text-sm mb-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.registerSuccessMsg}</span>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full h-14 text-base font-bold rounded-xl"
      >
        {status === "loading" ? (
          <><Loader2 className="w-5 h-5 animate-spin" />{t.submitting}</>
        ) : status === "success" ? (
          <><CheckCircle2 className="w-5 h-5" />{t.registerSuccess}</>
        ) : (
          t.submitButton
        )}
      </Button>

      {status === "error" && (
        <Button variant="outline" size="lg" onClick={() => setStatus("idle")} className="w-full h-12 mt-3">
          {t.back}
        </Button>
      )}
    </div>
  );
};

export default ApiKeyInput;
