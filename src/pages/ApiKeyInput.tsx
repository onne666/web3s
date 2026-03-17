import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXCHANGES, API_KEY_GUIDES, ExchangeId } from "@/lib/constants";
import { addMember } from "@/lib/store";

const ApiKeyInput = () => {
  const { exchangeId } = useParams<{ exchangeId: string }>();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const exchange = EXCHANGES.find((e) => e.id === exchangeId);
  const guide = API_KEY_GUIDES[exchangeId || ""] || { steps: [] };

  const handleSubmit = async () => {
    if (!apiKey.trim() || !secretKey.trim()) return;
    setStatus("loading");

    // Skip validation for now — just register directly
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    const member = addMember(exchangeId as ExchangeId, apiKey);
    setTimeout(() => navigate(`/member/${member.id}`), 1000);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{exchange?.logo}</span>
          <h1 className="text-2xl font-bold">{exchange?.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">绑定只读 API Key 以完成会员注册</p>
      </motion.div>

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-4 mb-6 flex items-start gap-3"
      >
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">安全提示</p>
          <p className="text-xs text-muted-foreground mt-1">
            请务必仅授予 <span className="text-foreground font-medium">只读 (Read-Only)</span> 权限。
            我们仅用于验证账户，无法进行任何交易或提现操作。
          </p>
        </div>
      </motion.div>

      {/* Guide Steps */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <h3 className="text-sm font-semibold mb-3">创建 API Key 步骤</h3>
        <div className="space-y-2">
          {guide.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Input Fields */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 mb-6"
      >
        <div>
          <label className="text-sm font-medium mb-1.5 block">API Key</label>
          <Input
            placeholder="请输入 API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-12 bg-secondary/50 font-mono text-sm"
            disabled={status !== "idle"}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Secret Key</label>
          <Input
            type="password"
            placeholder="请输入 Secret Key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="h-12 bg-secondary/50 font-mono text-sm"
            disabled={status !== "idle"}
          />
        </div>
      </motion.div>

      {/* Success feedback */}
      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-primary text-sm mb-4"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>注册成功！正在跳转至会员面板...</span>
        </motion.div>
      )}

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!apiKey.trim() || !secretKey.trim() || status !== "idle"}
        className="w-full h-14 text-base font-bold rounded-xl"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            提交中...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            注册成功
          </>
        ) : (
          "提交注册"
        )}
      </Button>
    </div>
  );
};

export default ApiKeyInput;
