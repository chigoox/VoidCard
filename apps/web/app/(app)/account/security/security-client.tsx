"use client";

import "client-only";

import { useState, useTransition } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";

type Factor = {
  id: string;
  friendly_name: string | null;
  status: "verified" | "unverified";
  created_at: string;
};

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function SecurityClient({ factors }: { factors: Factor[] }) {
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function startEnroll() {
    setError(null);
    const sb = browserClient();
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setError(error.message);
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnroll() {
    if (!enrolling) return;
    setError(null);
    const sb = browserClient();
    const { data: chal, error: chalErr } = await sb.auth.mfa.challenge({ factorId: enrolling.id });
    if (chalErr) {
      setError(chalErr.message);
      return;
    }
    const { error: verErr } = await sb.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: chal.id,
      code,
    });
    if (verErr) {
      setError(verErr.message);
      return;
    }
    setEnrolling(null);
    setCode("");
    window.location.reload();
  }

  async function unenroll(factorId: string) {
    if (!confirm("Remove this 2FA factor?")) return;
    const sb = browserClient();
    const { error } = await sb.auth.mfa.unenroll({ factorId });
    if (error) {
      setError(error.message);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {factors.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ivory-mute">No 2FA factors yet.</td></tr>
            )}
            {factors.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3">{f.friendly_name ?? "TOTP"}</td>
                <td className="px-4 py-3 text-xs">
                  {f.status === "verified"
                    ? <span className="text-emerald-400">verified</span>
                    : <span className="text-amber-400">unverified</span>}
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(f.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => unenroll(f.id)} className="text-xs text-red-400 hover:underline">remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!enrolling && (
        <button onClick={() => start(startEnroll)} className="btn-primary" disabled={pending}>
          {pending ? "…" : "Add authenticator app"}
        </button>
      )}

      {enrolling && (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-ivory-mute">
            Scan the QR with your authenticator (1Password, Authy, Google Authenticator), then enter the 6-digit code.
          </p>
          <div className="flex flex-wrap items-start gap-6">
            {enrolling.qr.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="MFA QR code" src={enrolling.qr} width={180} height={180} className="rounded bg-white p-2" />
            ) : (
              <Image alt="MFA QR code" src={enrolling.qr} width={180} height={180} className="rounded bg-white p-2" unoptimized />
            )}
            <div className="text-xs text-ivory-mute">
              <div className="mb-2 uppercase tracking-widest">Manual entry</div>
              <code className="break-all rounded bg-onyx-900/60 px-2 py-1">{enrolling.secret}</code>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">6-digit code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="input w-32 tabular-nums"
              />
            </div>
            <button onClick={() => start(verifyEnroll)} className="btn-primary" disabled={pending || code.length !== 6}>
              Verify
            </button>
            <button onClick={() => { setEnrolling(null); setCode(""); }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {error && <div className="card border-red-500/40 px-4 py-3 text-sm text-red-300">{error}</div>}
    </div>
  );
}
