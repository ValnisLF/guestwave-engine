export async function handleStripeWebhook(rawBody: string, signature: string) {
  // Stub: real implementation should verify signature and parse event
  return { ok: true, event: null };
}

export default handleStripeWebhook;
