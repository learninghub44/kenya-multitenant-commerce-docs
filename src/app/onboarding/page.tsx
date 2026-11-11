"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import AuthShell from "../auth/auth-shell";
import styles from "./onboarding.module.css";
import { storeDisplayAddress } from "@/lib/store-url";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { normalizeKenyanPhone } from "@/lib/auth-helpers";

type SlugState = "idle" | "checking" | "available" | "taken" | "error";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/g, "");
}

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [tagline, setTagline] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  const cleanSlug = useMemo(() => slugify(slug), [slug]);
  const slugSyntaxValid = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(cleanSlug);
  const reserved = RESERVED_SLUGS.has(cleanSlug);

  useEffect(() => {
    if (!slugSyntaxValid || reserved) {
      setSlugState("idle");
      return;
    }
    let cancelled = false;
    setSlugState("checking");
    const timer = window.setTimeout(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          if (!cancelled) setSlugState("error");
          return;
        }
        const { data, error: rpcError } = await supabase.rpc("is_store_slug_available", { p_slug: cleanSlug });
        if (rpcError) throw rpcError;
        if (!cancelled) setSlugState(data ? "available" : "taken");
      } catch {
        if (!cancelled) setSlugState("error");
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cleanSlug, slugSyntaxValid, reserved]);

  async function createWorkspace(skipOptionalDetails = false) {
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.location.assign("/login?next=%2Fonboarding");
        return;
      }

      const cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 120) throw new Error("Business name must be between 2 and 120 characters.");
      if (!slugSyntaxValid) throw new Error("Choose a store address with 3–50 letters, numbers or hyphens.");
      if (reserved) throw new Error("That store address is reserved. Choose another one.");

      const { data: available, error: availabilityError } = await supabase.rpc("is_store_slug_available", { p_slug: cleanSlug });
      if (availabilityError) throw availabilityError;
      if (!available) {
        setSlugState("taken");
        throw new Error("That store address is unavailable. Choose another one.");
      }

      const cleanPhone = !skipOptionalDetails && phone.trim() ? normalizeKenyanPhone(phone) : null;
      const cleanWhatsapp = !skipOptionalDetails && whatsapp.trim() ? normalizeKenyanPhone(whatsapp) : null;
      if (!skipOptionalDetails && phone.trim() && !cleanPhone) throw new Error("Enter a valid Kenyan business phone number.");
      if (!skipOptionalDetails && whatsapp.trim() && !cleanWhatsapp) throw new Error("Enter a valid Kenyan WhatsApp number.");
      const cleanEmail = !skipOptionalDetails ? email.trim().toLowerCase() : "";
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("Enter a valid business email address.");

      const profile = {
        tagline: !skipOptionalDetails ? tagline.trim() || null : null,
        phone: cleanPhone,
        whatsapp: cleanWhatsapp,
        email: cleanEmail || null,
        town: !skipOptionalDetails ? town.trim() || null : null,
        county: !skipOptionalDetails ? county.trim() || null : null
      };
      const { error: createError } = await supabase.rpc("create_tenant_with_profile_for_current_user", {
        p_name: cleanName,
        p_slug: cleanSlug,
        p_profile: profile
      });
      if (createError) throw createError;
      setCreatedSlug(cleanSlug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your business workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const slugMessage = reserved ? "This address is reserved." :
    !slugSyntaxValid ? "Use 3–50 lowercase letters, numbers or hyphens." :
    slugState === "checking" ? "Checking availability…" :
    slugState === "available" ? "This address is available." :
    slugState === "taken" ? "This address is already in use." :
    slugState === "error" ? "Could not check availability. Check your connection and try again." : "Enter a store address.";

  return (
    <AuthShell
      headline="Give your business "
      accent="its own workspace."
      summary="Set up a separate catalogue and storefront. Add optional public contact details when you are ready."
    >
      <section className="auth-card" aria-labelledby="onboarding-title">
        {createdSlug ? (
          <>
            <p className="eyebrow">Workspace created</p>
            <h1 id="onboarding-title">Your store is ready to set up</h1>
            <p className="auth-description">Your workspace and owner access have been created. Continue with these recommended steps.</p>
            <ol className={styles.checklist}>
              <li><strong>1. Add your first product</strong><span>Publish an item with an accurate price and available stock.</span></li>
              <li><strong>2. Review store details</strong><span>Check your contact information and storefront profile.</span></li>
              <li><strong>3. Share your store link</strong><span>Customers can browse and send order requests. Online payment collection is not enabled.</span></li>
            </ol>
            <div className="form-message" role="status">Store address: <strong>{storeDisplayAddress(createdSlug)}</strong></div>
            <Link className="primary-button" href={`/dashboard/${createdSlug}`}>Open your workspace</Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Step {step} of 2</p>
            <h1 id="onboarding-title">{step === 1 ? "Create your workspace" : "Add your public store details"}</h1>
            <p className="auth-description">{step === 1 ? "Choose a business name and a unique store address." : "These optional details can appear on your public storefront. Leave any field blank if you are not ready."}</p>
            <div className={styles.progress} aria-label={`Step ${step} of 2`}><span style={{ width: step === 1 ? "50%" : "100%" }} /></div>
            {step === 1 ? (
              <div className={`${styles.checklist} ${styles.compact}`} aria-label="Setup checklist">
                <p><strong>Workspace basics</strong><span>Business name and a unique store address</span></p>
                <p><strong>Public store profile</strong><span>Optional contact information and tagline</span></p>
                <p><strong>First product</strong><span>Add this after your workspace is created</span></p>
              </div>
            ) : null}
            <form onSubmit={event => { event.preventDefault(); createWorkspace(false); }}>
              {step === 1 ? (
                <>
                  <div className="field">
                    <label htmlFor="business-name">Business name</label>
                    <input id="business-name" autoComplete="organization" placeholder="e.g. Wanjiku Fashions" required minLength={2} maxLength={120} value={name} onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
                  </div>
                  <div className="field">
                    <label htmlFor="store-address">Store address</label>
                    <input id="store-address" required minLength={3} maxLength={50} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={slug} onChange={e => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} />
                    <p className="field-help">Your shop address: <strong>{storeDisplayAddress(cleanSlug || "your-store")}</strong></p>
                    <p className={`field-help ${styles.slugStatus} ${slugState === "available" ? styles.success : slugState === "taken" || reserved ? styles.error : ""}`} role="status">{slugMessage}</p>
                  </div>
                  {error && <p className="form-message error" role="alert">{error}</p>}
                  <button className="primary-button" type="button" disabled={!name.trim() || !slugSyntaxValid || reserved || slugState !== "available"} onClick={() => { setError(""); setStep(2); }}>Continue</button>
                </>
              ) : (
                <>
                  <div className="field"><label htmlFor="tagline">Store tagline <span className="optional">(optional)</span></label><input id="tagline" maxLength={120} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short description of your business" /></div>
                  <div className="field"><label htmlFor="business-phone">Business phone <span className="optional">(optional)</span></label><input id="business-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" /></div>
                  <div className="field"><label htmlFor="business-whatsapp">WhatsApp number <span className="optional">(optional)</span></label><input id="business-whatsapp" type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="0712 345 678" /></div>
                  <div className="field"><label htmlFor="business-email">Public business email <span className="optional">(optional)</span></label><input id="business-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@business.co.ke" /></div>
                  <div className="field-row">
                    <div className="field"><label htmlFor="town">Town <span className="optional">(optional)</span></label><input id="town" maxLength={100} value={town} onChange={e => setTown(e.target.value)} /></div>
                    <div className="field"><label htmlFor="county">County <span className="optional">(optional)</span></label><input id="county" maxLength={100} value={county} onChange={e => setCounty(e.target.value)} /></div>
                  </div>
                  <p className="field-help">These details are public on your store profile. Only add contact information you want customers to see.</p>
                  {error && <p className="form-message error" role="alert">{error}</p>}
                  <button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
                  <button className="inline-link-button" type="button" disabled={busy} onClick={() => { setError(""); setStep(1); }}>Back</button>
                  <button className="inline-link-button" type="button" disabled={busy} onClick={() => createWorkspace(true)}>Skip optional details</button>
                </>
              )}
            </form>
          </>
        )}
      </section>
    </AuthShell>
  );
}
