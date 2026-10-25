import { NextResponse } from "next/server";

/**
 * Payment checkout entry point.
 * Provider secrets must only be configured as server-side Vercel environment variables.
 * This route intentionally refuses to create a fake payment until merchant credentials
 * and the provider-specific production/sandbox integration are configured and verified.
 */
export async function POST(request: Request) {
  let body: { provider?: string; circleId?: string; amount?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête JSON invalide." }, { status: 400 });
  }

  if (!["mtn_momo", "orange_money"].includes(String(body.provider))) {
    return NextResponse.json({ error: "Choisis MTN Mobile Money ou Orange Money." }, { status: 400 });
  }
  if (!body.circleId || typeof body.circleId !== "string" ||
      !Number.isSafeInteger(body.amount) || Number(body.amount) <= 0) {
    return NextResponse.json({ error: "Cercle ou montant invalide." }, { status: 400 });
  }

  const provider = body.provider as "mtn_momo" | "orange_money";
  const configured = provider === "mtn_momo"
    ? Boolean(process.env.MTN_MOMO_API_USER && process.env.MTN_MOMO_API_KEY && process.env.MTN_MOMO_SUBSCRIPTION_KEY)
    : Boolean(process.env.ORANGE_MONEY_CLIENT_ID && process.env.ORANGE_MONEY_CLIENT_SECRET);

  if (!configured) {
    return NextResponse.json({
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      provider,
      error: provider === "mtn_momo"
        ? "MTN MoMo n'est pas encore configuré. Ajoute les identifiants marchands dans les variables d'environnement serveur de Vercel."
        : "Orange Money n'est pas encore configuré. Ajoute les identifiants marchands dans les variables d'environnement serveur de Vercel.",
      requiredSetup: provider === "mtn_momo"
        ? ["MTN_MOMO_API_USER", "MTN_MOMO_API_KEY", "MTN_MOMO_SUBSCRIPTION_KEY"]
        : ["ORANGE_MONEY_CLIENT_ID", "ORANGE_MONEY_CLIENT_SECRET"],
    }, { status: 503 });
  }

  // Credentials alone are not enough: provider-specific signed requests, callback
  // verification and status polling must be implemented against the merchant's
  // activated Cameroon product before any payment is accepted.
  return NextResponse.json({
    code: "PAYMENT_PROVIDER_REQUIRES_ACTIVATION",
    provider,
    error: "Les identifiants sont présents, mais l'intégration marchande doit encore être activée et testée avant d'accepter des paiements.",
  }, { status: 501 });
}
