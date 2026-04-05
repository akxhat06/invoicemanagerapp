"use client";

import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MIN_PASSWORD_LEN = 8;

function formatProfileSaveError(message: string): string {
  const lower = message.toLowerCase();
  if (
    message.includes("profiles_username_lower_unique") ||
    (lower.includes("unique") && lower.includes("username"))
  ) {
    return "That username is already taken. Choose another.";
  }
  return message;
}

type Props = {
  initialUsername: string;
  initialPhone: string;
  initialAddress: string;
  email: string;
  initialAvatarUrl: string;
};

export function ProfileScreen({
  initialUsername,
  initialPhone,
  initialAddress,
  email,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image size must be under 3MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setError("You must be signed in.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError("Could not upload image. Ensure a public 'avatars' bucket exists.");
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = publicData.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileError) {
      setUploading(false);
      setError(profileError.message);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        avatar_url: publicUrl,
      },
    });

    setAvatarUrl(publicUrl);
    setUploading(false);
    setMessage("Profile photo updated.");
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!skipRequiredFieldValidation()) {
      if (!username.trim()) {
        setError("Username is required.");
        return;
      }
      const phoneDigitsCheck = phone.replace(/\D/g, "");
      if (phone.trim().length > 0 && phoneDigitsCheck.length !== 10) {
        setError("Phone number must be exactly 10 digits.");
        return;
      }
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("You must be signed in.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    const resolvedUsername = skipRequiredFieldValidation() ? username.trim() || "Dev user" : username.trim();
    const payload = {
      username: resolvedUsername,
      phone: phoneDigits.length === 10 ? phoneDigits : null,
      address: address.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error: profileError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);
    if (profileError) {
      setSaving(false);
      setError(formatProfileSaveError(profileError.message));
      return;
    }

    await supabase.auth.updateUser({
      data: {
        username: resolvedUsername,
      },
    });

    setSaving(false);
    setMessage("Profile updated.");
    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < MIN_PASSWORD_LEN) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (pwError) {
      setPasswordError(pwError.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
    router.refresh();
  }

  return (
    <section className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Profile</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Upload a profile image, set your username, add your address, and change your password.
        </p>
      </div>

      <form onSubmit={handleSave} className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-sm">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
          <div className="flex items-center gap-4">
            <div className="bg-accent text-accent-foreground flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-bold ring-2 ring-black/5 dark:ring-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (username.trim()[0] || email[0] || "?").toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Profile image</p>
              <p className="text-muted-foreground mt-0.5 text-xs">JPG, PNG, WEBP, GIF, SVG · up to 3MB</p>
            </div>
          </div>
          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted/70">
              {uploading ? "Uploading..." : "Upload profile image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || saving}
                onChange={(e) => void handleAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="p-name" className="mb-1.5 block text-sm font-medium">
            Username
          </label>
          <input
            id="p-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={saving}
            className="bg-panel-field w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60"
            placeholder="Unique name for display and sign-in"
            autoComplete="username"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Used on the dashboard and to sign in instead of email (must be unique).
          </p>
        </div>

        <div>
          <label htmlFor="p-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="p-email"
            type="email"
            value={email}
            disabled
            className="bg-panel-field/70 text-muted-foreground w-full rounded-lg border border-border px-3.5 py-3 text-[15px]"
          />
        </div>

        <div>
          <label htmlFor="p-phone" className="mb-1.5 block text-sm font-medium">
            Phone
          </label>
          <input
            id="p-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            disabled={saving}
            className="bg-panel-field w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60"
            placeholder="10-digit phone number"
            inputMode="numeric"
            maxLength={10}
          />
        </div>

        <div>
          <label htmlFor="p-address" className="mb-1.5 block text-sm font-medium">
            Address
          </label>
          <textarea
            id="p-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={saving}
            rows={4}
            className="bg-panel-field w-full resize-y rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60"
            placeholder="Street, city, state, PIN — anything you want on file"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-accent-secondary text-accent-secondary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <form
        onSubmit={(e) => void handlePasswordSubmit(e)}
        className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
      >
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Update password</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose a new password. You stay signed in after it changes.
          </p>
        </div>

        <div>
          <label htmlFor="p-new-password" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <input
            id="p-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={passwordSaving}
            autoComplete="new-password"
            className="bg-panel-field w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60"
            placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
          />
        </div>

        <div>
          <label htmlFor="p-confirm-password" className="mb-1.5 block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="p-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={passwordSaving}
            autoComplete="new-password"
            className="bg-panel-field w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-60"
            placeholder="Re-enter new password"
          />
        </div>

        {passwordError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {passwordError}
          </p>
        )}
        {passwordMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {passwordMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={passwordSaving || !newPassword || !confirmPassword}
          className="bg-accent-secondary text-accent-secondary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-60"
        >
          {passwordSaving ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
