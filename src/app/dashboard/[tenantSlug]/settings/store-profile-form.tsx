"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type StoreProfile = {
  tagline: string | null; about: string | null; logo_url: string | null; banner_url: string | null;
  owner_name: string | null; owner_title: string | null; owner_bio: string | null; owner_photo_url: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  address_line: string | null; town: string | null; county: string | null; opening_hours: string | null;
  website_url: string | null; facebook_url: string | null; instagram_url: string | null; tiktok_url: string | null;
};

type Kind = "logo" | "banner" | "owner";
type Draft = { [K in keyof StoreProfile]: string };


function toDraft(initial: Partial<StoreProfile>): Draft {
  const keys: (keyof StoreProfile)[] = ["tagline", "about", "logo_url", "banner_url", "owner_name", "owner_title", "owner_bio", "owner_photo_url",
    "phone", "whatsapp", "email", "address_line", "town", "county", "opening_hours", "website_url", "facebook_url", "instagram_url", "tiktok_url"];
  return Object.fromEntries(keys.map(key => [key, initial[key] ?? ""])) as Draft;
}

function ImageField({ label, help, value, kind, tenantId, onChange, round }: {
  label: string; help: string; value: string; kind: Kind; tenantId: string; onChange: (url: string) => void; round?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
      const signed = await fetch("/api/uploads/cloudinary-signature", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, kind }),
      });
      const sig = await signed.json() as { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string; error?: string };
      if (!signed.ok) throw new Error(sig.error ?? "Could not authorize the upload.");
      const form = new FormData();
      form.append("file", file); form.append("api_key", sig.apiKey); form.append("timestamp", String(sig.timestamp));
      form.append("folder", sig.folder); form.append("signature", sig.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sig.cloudName)}/image/upload`, { method: "POST", body: form });
      const uploaded = await response.json() as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !uploaded.secure_url) throw new Error(uploaded.error?.message ?? "Upload failed.");
      onChange(uploaded.secure_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload this image.");
    } finally { setBusy(false); }
  }

  return <div className="image-field">
    <div className={`image-preview${round ? " is-round" : ""}`}>
      {value ? <Image src={value} alt="" fill sizes="160px" unoptimized /> : <span aria-hidden="true">+</span>}
    </div>
    <div>
      <strong>{label}</strong>
      <p className="field-help">{help}</p>
      <div className="category-actions">
        <label className="secondary-button file-button">
          {busy ? "Uploading…" : value ? "Replace image" : "Choose image"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={upload} />
        </label>
        {value && <button className="secondary-button" type="button" onClick={() => onChange("")}>Remove</button>}
      </div>
      {error && <p className="form-message error" role="alert">{error}</p>}
    </div>
  </div>;
}

export default function StoreProfileForm({ tenantId, initial }: { tenantId: string; initial: Partial<StoreProfile> }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key: keyof StoreProfile) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(current => ({ ...current, [key]: event.target.value })); setSaved(false);
  };
  const setImage = (key: keyof StoreProfile) => (url: string) => { setDraft(current => ({ ...current, [key]: url })); setSaved(false); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved(false);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc("save_store_profile", { p_tenant_id: tenantId, p_profile: draft });
      if (rpcError) throw rpcError;
      setSaved(true); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the store profile.");
    } finally { setBusy(false); }
  }

  return <form className="profile-form" onSubmit={submit}>
    <fieldset>
      <legend>About your shop</legend>
      <label htmlFor="sp-tagline">Tagline</label>
      <input id="sp-tagline" maxLength={120} placeholder="e.g. Quality fashion delivered across Kisii" value={draft.tagline} onChange={set("tagline")} />
      <label htmlFor="sp-about">About</label>
      <textarea id="sp-about" rows={5} maxLength={2000} placeholder="Tell customers who you are and what you sell." value={draft.about} onChange={set("about")} />
    </fieldset>

    <fieldset>
      <legend>Branding</legend>
      <ImageField label="Logo" help="Square image works best." kind="logo" tenantId={tenantId} value={draft.logo_url} onChange={setImage("logo_url")} />
      <ImageField label="Banner" help="Wide image shown at the top of your shop." kind="banner" tenantId={tenantId} value={draft.banner_url} onChange={setImage("banner_url")} />
    </fieldset>

    <fieldset>
      <legend>Shop owner</legend>
      <ImageField label="Owner photo" help="Shown next to the owner introduction." kind="owner" tenantId={tenantId} value={draft.owner_photo_url} onChange={setImage("owner_photo_url")} round />
      <div className="field-row">
        <div><label htmlFor="sp-owner-name">Owner name</label><input id="sp-owner-name" maxLength={120} autoComplete="name" value={draft.owner_name} onChange={set("owner_name")} /></div>
        <div><label htmlFor="sp-owner-title">Role</label><input id="sp-owner-title" maxLength={80} placeholder="e.g. Founder" value={draft.owner_title} onChange={set("owner_title")} /></div>
      </div>
      <label htmlFor="sp-owner-bio">Short introduction</label>
      <textarea id="sp-owner-bio" rows={3} maxLength={1000} value={draft.owner_bio} onChange={set("owner_bio")} />
    </fieldset>

    <fieldset>
      <legend>Contact</legend>
      <div className="field-row">
        <div><label htmlFor="sp-phone">Phone</label><input id="sp-phone" type="tel" maxLength={20} placeholder="+254 712 345 678" value={draft.phone} onChange={set("phone")} /></div>
        <div><label htmlFor="sp-whatsapp">WhatsApp</label><input id="sp-whatsapp" type="tel" maxLength={20} placeholder="+254 712 345 678" value={draft.whatsapp} onChange={set("whatsapp")} /></div>
      </div>
      <label htmlFor="sp-email">Shop email</label>
      <input id="sp-email" type="email" maxLength={254} placeholder="hello@yourshop.co.ke" value={draft.email} onChange={set("email")} />
      <p className="field-help">Shown publicly on your shop. It is separate from your sign-in email.</p>
    </fieldset>

    <fieldset>
      <legend>Location and hours</legend>
      <label htmlFor="sp-address">Street or building</label>
      <input id="sp-address" maxLength={200} autoComplete="street-address" value={draft.address_line} onChange={set("address_line")} />
      <div className="field-row">
        <div><label htmlFor="sp-town">Town</label><input id="sp-town" maxLength={100} value={draft.town} onChange={set("town")} /></div>
        <div><label htmlFor="sp-county">County</label><input id="sp-county" maxLength={100} value={draft.county} onChange={set("county")} /></div>
      </div>
      <label htmlFor="sp-hours">Opening hours</label>
      <textarea id="sp-hours" rows={3} maxLength={500} placeholder={"Mon–Sat: 8am – 6pm\nSun: Closed"} value={draft.opening_hours} onChange={set("opening_hours")} />
    </fieldset>

    <fieldset>
      <legend>Online</legend>
      <label htmlFor="sp-website">Website</label>
      <input id="sp-website" type="url" maxLength={300} placeholder="https://" value={draft.website_url} onChange={set("website_url")} />
      <label htmlFor="sp-facebook">Facebook</label>
      <input id="sp-facebook" type="url" maxLength={300} placeholder="https://facebook.com/yourshop" value={draft.facebook_url} onChange={set("facebook_url")} />
      <label htmlFor="sp-instagram">Instagram</label>
      <input id="sp-instagram" type="url" maxLength={300} placeholder="https://instagram.com/yourshop" value={draft.instagram_url} onChange={set("instagram_url")} />
      <label htmlFor="sp-tiktok">TikTok</label>
      <input id="sp-tiktok" type="url" maxLength={300} placeholder="https://tiktok.com/@yourshop" value={draft.tiktok_url} onChange={set("tiktok_url")} />
    </fieldset>

    {error && <p className="form-message error" role="alert">{error}</p>}
    {saved && <p className="form-message" role="status">Store profile saved. Your shop is updated.</p>}
    <div className="profile-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save store profile"}</button></div>
  </form>;
}
