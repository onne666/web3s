import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Copy, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getMembers, getRates } from "@/lib/store";
import { EXCHANGES, WALLET_ADDRESS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MemberDashboard = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const members = getMembers();
  const member = members.find((m) => m.id === memberId);
  const rates = getRates();
  const usdt = rates.find((r) => r.symbol === "USDT") || rates[0];

  const [amount, setAmount] = useState("");
  const [showWallet, setShowWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  const cnyAmount = amount ? (parseFloat(amount) * usdt.buybackRate).toFixed(2) : "0.00";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">会员信息未找到</p>
          <button onClick={() => navigate("/")} className="text-primary text-sm">返回首页</button>
        </div>
      </div>
    );
  }

  const exchange = EXCHANGES.find((e) => e.id === member.exchange);

  return (
    <div className="min-h-screen bg-sci-fi px-4 py-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> 首页
      </button>

      {/* Member Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="metal-texture rounded-2xl p-6 border border-border/50 glow-purple mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">MEMBER CARD</p>
            <p className="text-lg font-bold text-gradient-purple">CryptoShop</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">卡号</span>
            <span className="font-mono-num font-semibold">{member.cardNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">交易所</span>
            <span className="font-semibold">{exchange?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">API Key</span>
            <span className="font-mono-num text-xs">{member.apiKey}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">注册时间</span>
            <span className="text-xs">{new Date(member.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
        </div>
      </motion.div>

      {/* Exchange Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-4">代币兑换</h2>
        <div className="glass-panel p-6 glow-purple">
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">支付数量 (USDT)</label>
            <Input
              type="number"
              placeholder="请输入 USDT 数量"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 bg-secondary/50 font-mono-num text-xl"
              min="0"
              step="0.01"
            />
          </div>

          <div className="glass-panel p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">可兑换人民币</span>
              <div className="text-right">
                <span className="font-mono-num text-3xl font-bold text-primary">{cnyAmount}</span>
                <span className="text-sm text-muted-foreground ml-1">CNY</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              汇率: 1 USDT = {usdt.buybackRate.toFixed(2)} CNY
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setShowWallet(true)}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full h-14 text-base font-bold rounded-xl animate-pulse-glow"
          >
            确认兑换
          </Button>
        </div>
      </motion.div>

      {/* Wallet Dialog */}
      <Dialog open={showWallet} onOpenChange={setShowWallet}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">汇款信息</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Summary */}
            <div className="glass-panel p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">兑换摘要</p>
              <p className="font-mono-num text-lg font-bold">
                <span className="text-foreground">{parseFloat(amount || "0")} USDT</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="text-primary">{cnyAmount} CNY</span>
              </p>
            </div>

            {/* Chain Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary">
                TRON (TRC-20)
              </span>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={WALLET_ADDRESS} size={180} />
              </div>
            </div>

            {/* Wallet Address */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 text-center">钱包地址</p>
              <div className="flex items-center gap-2 glass-panel p-3">
                <span className="font-mono-num text-xs break-all flex-1 text-foreground">{WALLET_ADDRESS}</span>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-primary text-center mt-1">已复制到剪贴板</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              请向上方地址转入对应数量的 USDT，转账完成后将自动到账
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDashboard;
