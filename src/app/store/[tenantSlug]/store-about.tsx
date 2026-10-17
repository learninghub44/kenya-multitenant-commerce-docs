import Image from "next/image";
import { mapsHref, safeHttpsUrl, telHref, whatsappHref } from "@/lib/contact-links";
import styles from "./store-about.module.css";

export type PublicStoreProfile = {
  store_name: string; store_slug: string; currency: string;
  tagline: string | null; about: string | null; logo_url: string | null; banner_url: string | null;
  owner_name: string | null; owner_title: string | null; owner_bio: string | null; owner_photo_url: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  address_line: string | null; town: string | null; county: string | null; opening_hours: string | null;
  website_url: string | null; facebook_url: string | null; instagram_url: string | null; tiktok_url: string | null;
};

export default function StoreAbout({ profile }: { profile: PublicStoreProfile }) {
  const location = [profile.address_line, profile.town, profile.county].filter(Boolean);
  const socials = [
    { label: "Website", href: safeHttpsUrl(profile.website_url) },
    { label: "Facebook", href: safeHttpsUrl(profile.facebook_url) },
    { label: "Instagram", href: safeHttpsUrl(profile.instagram_url) },
    { label: "TikTok", href: safeHttpsUrl(profile.tiktok_url) },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));
  const hasContact = Boolean(profile.phone || profile.whatsapp || profile.email);
  const hasOwner = Boolean(profile.owner_name || profile.owner_bio || profile.owner_photo_url);

  if (!profile.about && !hasOwner && !hasContact && location.length === 0 && !profile.opening_hours && socials.length === 0) return null;

  return <section className={styles.about} id="about" aria-labelledby="about-heading">
    <div className={styles.grid}>
      {(profile.about || hasOwner) && <div className={styles.story}>
        <h2 id="about-heading">About {profile.store_name}</h2>
        {profile.about && <p className={styles.aboutText}>{profile.about}</p>}
        {hasOwner && <div className={styles.owner}>
          <div className={styles.ownerPhoto}>
            {profile.owner_photo_url
              ? <Image src={profile.owner_photo_url} alt={profile.owner_name ?? "Shop owner"} fill sizes="96px" unoptimized />
              : <span aria-hidden="true">{(profile.owner_name ?? "?").charAt(0).toLocaleUpperCase()}</span>}
          </div>
          <div>
            <p className={styles.ownerLabel}>Meet the owner</p>
            {profile.owner_name && <h3>{profile.owner_name}</h3>}
            {profile.owner_title && <p className={styles.ownerTitle}>{profile.owner_title}</p>}
            {profile.owner_bio && <p className={styles.ownerBio}>{profile.owner_bio}</p>}
          </div>
        </div>}
      </div>}

      {(hasContact || location.length > 0 || profile.opening_hours || socials.length > 0) && <aside className={styles.contact} id="contact" aria-label="Contact and location">
        <h2>Visit and contact</h2>
        {hasContact && <div className={styles.contactButtons}>
          {profile.whatsapp && <a className={styles.whatsapp} href={whatsappHref(profile.whatsapp)} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
          {profile.phone && <a className={styles.call} href={telHref(profile.phone)}>Call {profile.phone}</a>}
          {profile.email && <a className={styles.call} href={`mailto:${profile.email}`}>{profile.email}</a>}
        </div>}
        {location.length > 0 && <div className={styles.detail}>
          <h3>Location</h3>
          <p>{location.join(", ")}</p>
          <a href={mapsHref(location)} target="_blank" rel="noopener noreferrer">Get directions</a>
        </div>}
        {profile.opening_hours && <div className={styles.detail}>
          <h3>Opening hours</h3>
          <p className={styles.hours}>{profile.opening_hours}</p>
        </div>}
        {socials.length > 0 && <div className={styles.detail}>
          <h3>Find us online</h3>
          <ul className={styles.socials}>
            {socials.map(item => <li key={item.label}><a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a></li>)}
          </ul>
        </div>}
      </aside>}
    </div>
  </section>;
}
