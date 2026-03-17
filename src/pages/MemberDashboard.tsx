import { motion } from "framer-motion";
import { Crown, ArrowLeft } from "lucide-react";
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
        className="metal-texture rounded-2xl p-6 border border-border/50 glow-green mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground">MEMBER CARD</p>
            <p className="text-lg font-bold">CRYPTO VIP</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
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

      {/* Rates Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold mb-4">今日会员专属汇率</h2>
        <div className="glass-panel overflow-hidden">
          <div className="grid grid-cols-3 gap-2 px-4 py-3 text-xs text-muted-foreground border-b border-border/50">
            <span>币种</span>
            <span className="text-right">收购价</span>
            <span className="text-right">溢价</span>
          </div>
          {rates.map((coin) => {
            const premium = (((coin.memberPrice - coin.marketPrice) / coin.marketPrice) * 100).toFixed(2);
            return (
              <div key={coin.symbol} className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border/30 last:border-0">
                <div className="font-semibold text-sm">{coin.symbol}</div>
                <div className="font-mono-num text-sm text-right text-primary font-semibold">
                  {coin.memberPrice.toLocaleString()}
                </div>
                <div className="font-mono-num text-xs text-right text-primary">+{premium}%</div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default MemberDashboard;
