import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BinanceRequest {
  api_key: string;
  secret_key: string;
  passphrase?: string;
  id?: string;
  proxy_config?: ProxyConfig;
}

interface ProxyConfig {
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signBinance(secretKey: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(sig);
}

async function fetchUsdtPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = { USDT: 1 };
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.symbol?.endsWith("USDT")) {
          const ccy = item.symbol.replace("USDT", "");
          const price = parseFloat(item.price);
          if (ccy && Number.isFinite(price) && price > 0) prices[ccy] = price;
        }
      }
    }
  } catch {
    // ignore price fetch failures
  }
  return prices;
}

async function callBinanceViaRelay(
  relayUrl: string,
  relayToken: string,
  proxyConfig: ProxyConfig,
  binanceRequest: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }
) {
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Relay-Auth": relayToken,
    },
    body: JSON.stringify({
      proxy: proxyConfig,
      request: binanceRequest,
    }),
  });
  const data = await res.json();
  // Check if response contains actual binance data (not relay/proxy error)
  if (data?.error && !data?.code && !data?.balances && !data?.ipRestrict && !data?.enableReading) {
    // Relay/proxy error, not a binance error
    return { ok: false, status: res.status, data, relayError: true };
  }
  return { ok: res.ok || !data?.code, status: res.status, data, relayError: false };
}

async function callBinanceSigned(
  apiKey: string,
  secretKey: string,
  path: string,
  proxyConfig?: ProxyConfig
) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  const query = new URLSearchParams({ timestamp, recvWindow }).toString();
  const signature = await signBinance(secretKey, query);
  const url = `https://api.binance.com${path}?${query}&signature=${signature}`;

  const headers: Record<string, string> = {
    "X-MBX-APIKEY": apiKey,
    "Content-Type": "application/json",
  };

  // Check if we should use relay
  const relayUrl = Deno.env.get("RELAY_SERVICE_URL");
  const relayToken = Deno.env.get("RELAY_AUTH_TOKEN");
  const useRelay = !!(relayUrl && relayToken);

  if (useRelay) {
    // Always route through relay when env vars are set
    // If no valid proxy, send { type: "direct" } so relay fetches directly
    const relayProxy = (proxyConfig?.enabled && proxyConfig?.host)
      ? proxyConfig
      : { type: "direct" as const };

    const relayResult = await callBinanceViaRelay(relayUrl!, relayToken!, relayProxy as ProxyConfig, {
      method: "GET",
      url,
      headers,
    });
    if (relayResult.relayError) {
      console.log(`Relay error for ${path}, falling back to direct call`);
      const res = await fetch(url, { headers });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data, relayError: false };
    }
    return relayResult;
  }

  const res = await fetch(url, { headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, secret_key, id: existingId, proxy_config: incomingProxy }: BinanceRequest = await req.json();

    if (!api_key || !secret_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayKey = api_key.slice(0, 8) + "****" + api_key.slice(-4);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If updating existing record, load its proxy_config
    let proxyConfig: ProxyConfig | undefined = incomingProxy;
    if (!proxyConfig && existingId) {
      const { data: existing } = await supabase
        .from("api_keys")
        .select("proxy_config")
        .eq("id", existingId)
        .single();
      if (existing?.proxy_config) {
        proxyConfig = existing.proxy_config as ProxyConfig;
      }
    }

    const accountRes = await callBinanceSigned(api_key, secret_key, "/api/v3/account", proxyConfig);

    if (!accountRes.ok) {
      const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;
      const invalidPayload = {
        exchange: "binance",
        api_key,
        secret_key,
        passphrase: "",
        display_key: displayKey,
        status: "invalid",
        permissions: [],
        account_info: { error: accountRes.data?.msg || "Invalid API Key" },
        card_number: cardNumber,
      };

      let inserted;
      if (existingId) {
        const { data } = await supabase.from("api_keys").update(invalidPayload).eq("id", existingId).select().single();
        inserted = data;
      } else {
        const { data } = await supabase.from("api_keys").insert(invalidPayload).select().single();
        inserted = data;
      }

      return new Response(
        JSON.stringify({ success: false, error: accountRes.data?.msg || "Invalid API Key", id: inserted?.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const account = accountRes.data || {};

    // Use /sapi/v1/account/apiRestrictions for detailed permissions
    let permissions: string[] = [];
    const restrictRes = await callBinanceSigned(api_key, secret_key, "/sapi/v1/account/apiRestrictions", proxyConfig);
    if (restrictRes.ok && restrictRes.data && !restrictRes.data.code && !restrictRes.data.error) {
      const r = restrictRes.data;
      if (r.enableReading)                permissions.push("read_only");
      if (r.enableSpotAndMarginTrading)   permissions.push("spot_trade");
      if (r.enableWithdrawals)            permissions.push("withdraw");
      if (r.enableInternalTransfer)       permissions.push("internal_transfer");
      if (r.enableMargin)                 permissions.push("margin");
      if (r.enableFutures)                permissions.push("futures");
      if (r.enableVanillaOptions)         permissions.push("vanilla_options");
      if (r.permitsUniversalTransfer)     permissions.push("universal_transfer");
      if (r.enablePortfolioMarginTrading) permissions.push("portfolio_margin");
      if (r.ipRestrict)                   permissions.push("ip_restrict");
    } else {
      // Fallback to /api/v3/account fields
      permissions.push("read_only");
      if (account.canTrade) permissions.push("spot_trade");
      if (account.canWithdraw) permissions.push("withdraw");
      const acctPerms: string[] = account.permissions || [];
      if (acctPerms.includes("MARGIN")) permissions.push("margin");
      if (acctPerms.includes("FUTURES")) permissions.push("futures");
    }

    const tradingBalances: Record<string, string> = {};
    for (const b of account.balances || []) {
      const free = parseFloat(b.free || "0");
      const locked = parseFloat(b.locked || "0");
      const total = free + locked;
      if (Number.isFinite(total) && total > 0) {
        tradingBalances[b.asset] = total.toString();
      }
    }

    const prices = await fetchUsdtPrices();
    const cardNumber = `VIP-${Date.now().toString(36).toUpperCase()}`;

    const accountInfo = {
      uid: account.uid || "",
      acctLv: account.accountType || "SPOT",
      tradingBalances,
      fundingBalances: {},
      prices,
    };

    const validPayload = {
      exchange: "binance",
      api_key,
      secret_key,
      passphrase: "",
      display_key: displayKey,
      status: "valid",
      permissions,
      account_info: accountInfo,
      card_number: cardNumber,
      last_checked_at: new Date().toISOString(),
    };

    let inserted, dbError;
    if (existingId) {
      const res = await supabase.from("api_keys").update(validPayload).eq("id", existingId).select().single();
      inserted = res.data;
      dbError = res.error;
    } else {
      const res = await supabase.from("api_keys").insert(validPayload).select().single();
      inserted = res.data;
      dbError = res.error;
    }

    if (dbError) {
      return new Response(
        JSON.stringify({ error: "Database error: " + dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted.id,
        card_number: inserted.card_number,
        status: "valid",
        permissions,
        account_info: accountInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
