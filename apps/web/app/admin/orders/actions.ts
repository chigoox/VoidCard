"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, shippedEmailHtml } from "@/lib/email";

const Schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid", "fulfilled", "shipped", "delivered", "refunded", "canceled"]),
  tracking_number: z.string().max(80).optional(),
  carrier: z.string().max(40).optional(),
});

export async function updateOrder(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const sb = createAdminClient();
  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.tracking_number?.trim()) patch.tracking_number = parsed.data.tracking_number.trim();
  if (parsed.data.carrier?.trim()) patch.carrier = parsed.data.carrier.trim();
  if (parsed.data.status === "shipped") patch.shipped_at = new Date().toISOString();
  if (parsed.data.status === "delivered") patch.delivered_at = new Date().toISOString();

  // Read prior state so we only email on transition into 'shipped'.
  const { data: prior } = await sb
    .from("vcard_orders")
    .select("status, email, customer_name, tracking_number, carrier")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await sb.from("vcard_orders").update(patch).eq("id", parsed.data.id);
  if (error) throw new Error(error.message);

  // Fire shipping email best-effort.
  const becameShipped = parsed.data.status === "shipped" && prior?.status !== "shipped";
  const recipient = (prior?.email as string | undefined) ?? null;
  if (becameShipped && recipient) {
    const { subject, html, text } = shippedEmailHtml({
      orderId: parsed.data.id,
      customerName: (prior?.customer_name as string | null) ?? null,
      carrier: parsed.data.carrier ?? (prior?.carrier as string | null) ?? null,
      tracking: parsed.data.tracking_number ?? (prior?.tracking_number as string | null) ?? null,
    });
    void sendEmail({ to: recipient, subject, html, text, tags: [{ name: "type", value: "order_shipped" }] }).catch(() => null);
    void sb.from("vcard_audit_log").insert({
      actor_id: admin.id,
      action: "order.shipped",
      target_type: "order",
      target_id: parsed.data.id,
      meta: { tracking: parsed.data.tracking_number, carrier: parsed.data.carrier },
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.id}`);
}
