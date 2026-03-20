import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

interface ProxyConfig {
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

async function getRelayConfig(supabase: any): Promise<{ relayUrl: string | null; relayToken: string | null }> {
  try {
    const { data } = await supabase.from("admin_settings").select("key, value").in("key", ["relay_url", "relay_auth_token"]);
    const map: Record<string, string> = {};
    if (data) for (const row of data) map[row.key] = row.value;
    return {
      relayUrl: map["relay_url"] || Deno.env.get("RELAY_SERVICE_URL") || null,
      relayToken: map["relay_auth_token"] || Deno.env.get("RELAY_AUTH_TOKEN") || null,
    };
  } catch {
    return {
      relayUrl: Deno.env.get("RELAY_SERVICE_URL") || null,
      relayToken: Deno.env.get("RELAY_AUTH_TOKEN") || null,
    };
  }
}

async function callBinanceViaRelay(
  relayUrl: string,
  relayToken: string,
  proxyConfig: ProxyConfig,
  binanceRequest: { method: string; url: string; headers: Record<string, string>; body?: string }
) {
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Relay-Auth": relayToken },
    body: JSON.stringify({ proxy: proxyConfig, request: binanceRequest }),
  });
  return res.json();
}

// Binance Universal Transfer type mapping
const TRANSFER_TYPE_MAP: Record<string, string> = {
  "spot_funding": "MAIN_FUNDING",
  "funding_spot": "FUNDING_MAIN",
  "spot_futures": "MAIN_UMFUTURE",
  "futures_spot": "UMFUTURE_MAIN",
  "funding_futures": "FUNDING_UMFUTURE",
  "futures_funding": "UMFUTURE_FUNDING",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimData, error: claimError } = await supabaseAuth.auth.getClaims(token);
    if (claimError || !claimData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimData.claims.sub as string;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_key_id, asset, amount, from_account, to_account } = await req.json();
    if (!api_key_id || !asset || !amount || !from_account || !to_account) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_key_id, asset, amount, from_account, to_account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transferKey = `${from_account}_${to_account}`;
    const transferType = TRANSFER_TYPE_MAP[transferKey];
    if (!transferType) {
      return new Response(
        JSON.stringify({ error: `Invalid transfer direction: ${from_account} -> ${to_account}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("api_key, secret_key, permissions, proxy_config")
      .eq("id", api_key_id)
      .eq("exchange", "binance")
      .single();

    if (keyError || !keyRow) {
      return new Response(
        JSON.stringify({ error: "API Key not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perms = ((keyRow.permissions || []) as string[])
      .flatMap((p) => p.split(",").map((s) => s.trim()))
      .filter(Boolean);
    if (!perms.includes("universal_transfer")) {
      return new Response(
        JSON.stringify({ error: "This API Key does not have universal_transfer permission" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      type: transferType,
      asset: String(asset),
      amount: String(amount),
      recvWindow: "5000",
      timestamp: Date.now().toString(),
    });

    const query = params.toString();
    const signature = await signBinance(keyRow.secret_key, query);
    const body = `${query}&signature=${signature}`;

    const binanceUrl = "https://api.binance.com/sapi/v1/asset/transfer";
    const binanceHeaders: Record<string, string> = {
      "X-MBX-APIKEY": keyRow.api_key,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const proxyConfig = (keyRow.proxy_config || {}) as ProxyConfig;
    const { relayUrl, relayToken } = await getRelayConfig(supabase);
    const useRelay = !!(relayUrl && relayToken);

    let binanceData: any;

    if (useRelay) {
      const relayProxy = (proxyConfig.enabled && proxyConfig.host)
        ? proxyConfig
        : { type: "direct" as const };
      binanceData = await callBinanceViaRelay(relayUrl!, relayToken!, relayProxy as ProxyConfig, {
        method: "POST",
        url: binanceUrl,
        headers: binanceHeaders,
        body,
      });
    } else {
      const res = await fetch(binanceUrl, { method: "POST", headers: binanceHeaders, body });
      binanceData = await res.json();
    }

    if (binanceData?.code || binanceData?.error) {
      return new Response(
        JSON.stringify({ success: false, error: binanceData?.msg || binanceData?.error || "Transfer failed", data: binanceData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: binanceData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
