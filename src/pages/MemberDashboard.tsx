import { motion } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getMembers, getRates } from "@/lib/store";
import { EXCHANGES } from "@/lib/constants";

const MemberDashboard = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const members = getMembers();
  const member = members.find((m) => m.id === memberId);
  const rates = getRates();

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
    <div className="min-h-screen bg-background px-4 py-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-muted-foreground text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> 首页
      </button>

      {/* Member Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="metal-texture rounded-2xl p-6 border border-border/50 glow-blue mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">MEMBER CARD</p>
            <p className="text-lg font-bold">CryptoShop</p>
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

      {/* Rates */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold mb-4">今日兑换汇率</h2>
        <div className="space-y-3">
          {rates.map((coin) => (
            <div key={coin.symbol} className="glass-panel p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{coin.name}</p>
                <p className="font-bold">{coin.symbol}</p>
              </div>
              <div className="text-right">
                <p className="font-mono-num text-2xl font-bold text-primary">{coin.buybackRate.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{coin.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MemberDashboard;
