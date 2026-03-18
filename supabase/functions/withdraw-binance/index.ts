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

    const { api_key_id, currency, amount, address, chain } = await req.json();
    if (!api_key_id || !currency || !amount || !address || !chain) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_key_id, currency, amount, address, chain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("api_key, secret_key, permissions")
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
    if (!perms.includes("withdraw")) {
      return new Response(
        JSON.stringify({ error: "This API Key does not have withdraw permission" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseParams = new URLSearchParams({
      coin: String(currency),
      address: String(address),
      amount: String(amount),
      network: String(chain),
      recvWindow: "5000",
      timestamp: Date.now().toString(),
    });

    const query = baseParams.toString();
    const signature = await signBinance(keyRow.secret_key, query);
    const body = `${query}&signature=${signature}`;

    const binanceRes = await fetch("https://api.binance.com/sapi/v1/capital/withdraw/apply", {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": keyRow.api_key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const binanceData = await binanceRes.json();

    if (!binanceRes.ok || binanceData?.code) {
      return new Response(
        JSON.stringify({ success: false, error: binanceData?.msg || "Withdrawal failed", data: binanceData }),
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