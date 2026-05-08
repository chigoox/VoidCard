"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveProfilePassword, saveSettings } from "./actions";

export function SettingsClient({
  profileId,
  username,
  initial,
  canUsePasswordProtection,
}: {
  profileId: string;
  username: string;
  initial: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    customCss: string;
    hasProfilePassword: boolean;
  };
  canUsePasswordProtection: boolean;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [customCss, setCustomCss] = useState(initial.customCss);
  const [profilePassword, setProfilePassword] = useState("");
  const [hasProfilePassword, setHasProfilePassword] = useState(initial.hasProfilePassword);
  const [pending, start] = useTransition();
  const [passwordPending, startPassword] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  function savePassword(clear: boolean) {
    setPasswordMsg(null);
    startPassword(async () => {
      const res = await saveProfilePassword({ profileId, password: profilePassword, clear });
      if (!res.ok) {
        setPasswordMsg(res.error ?? "Could not update password.");
        return;
      }
      setHasProfilePassword(res.enabled);
      setProfilePassword("");
      setPasswordMsg(res.enabled ? "Profile password saved." : "Profile password removed.");
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await saveSettings({ profileId, displayName, bio, avatarUrl, customCss });
      setMsg(res.ok ? "Saved." : res.error ?? "Could not save.");
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Username</span>
          <input
            disabled value={`@${username}`}
            className="mt-1 w-full rounded-pill border border-onyx-700 bg-onyx-900 px-4 py-2.5 text-ivory-dim"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Display name</span>
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={64}
            className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ivory-mute">Avatar URL</span>
        <input
          value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} maxLength={1024}
          className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ivory-mute">Bio</span>
        <textarea
          value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280}
          className="mt-1 w-full rounded-card border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-ivory-mute">Custom CSS (free)</span>
        <textarea
          value={customCss} onChange={(e) => setCustomCss(e.target.value)} rows={6} maxLength={30000}
          spellCheck={false}
          className="mt-1 w-full rounded-card border border-onyx-600 bg-onyx-900 px-4 py-2.5 font-mono text-xs outline-none focus:border-gold/60"
          placeholder=":root { --gold: #ffd76b; }"
        />
      </label>
      <section className="rounded-card border border-onyx-700 bg-onyx-950/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Profile password</p>
            <p className="mt-2 text-sm text-ivory-dim">
              {hasProfilePassword
                ? canUsePasswordProtection
                  ? `Visitors must enter a password before viewing @${username}.`
                  : `A saved password exists for @${username}, but this plan no longer enables password gates.`
                : `Require a password before visitors can view @${username}.`}
            </p>
          </div>
          <span className="rounded-pill border border-onyx-700 px-3 py-1 text-[11px] uppercase tracking-widest text-ivory-mute">
            {hasProfilePassword && canUsePasswordProtection
              ? "Protected"
              : hasProfilePassword
                ? "Stored"
                : "Open"}
          </span>
        </div>
        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">New password</span>
          <input
            type="password"
            value={profilePassword}
            onChange={(e) => setProfilePassword(e.target.value)}
            maxLength={128}
            autoComplete="new-password"
            className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
            placeholder={hasProfilePassword ? "Enter a new password to rotate it" : "Minimum 8 characters"}
            data-testid="settings-profile-password"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canUsePasswordProtection ? (
            <button
              type="button"
              disabled={passwordPending}
              onClick={() => savePassword(false)}
              className="btn-gold"
              data-testid="settings-profile-password-save"
            >
              {passwordPending ? "Saving…" : hasProfilePassword ? "Update password" : "Enable protection"}
            </button>
          ) : (
            <Link href="/pricing" className="btn-ghost">
              Upgrade for password protection
            </Link>
          )}
          {hasProfilePassword && (
            <button
              type="button"
              disabled={passwordPending}
              onClick={() => savePassword(true)}
              className="btn-ghost"
              data-testid="settings-profile-password-clear"
            >
              Remove password
            </button>
          )}
          {passwordMsg && <span className="text-xs text-ivory-mute" data-testid="settings-profile-password-message">{passwordMsg}</span>}
        </div>
      </section>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-gold" data-testid="settings-save">
          {pending ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-xs text-ivory-mute" data-testid="settings-message">{msg}</span>}
      </div>
    </form>
  );
}
