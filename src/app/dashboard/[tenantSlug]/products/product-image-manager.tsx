"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ProductImage = { id: string; secure_url: string; alt_text: string; position: number };

type UploadSignature = { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string };
type CloudinaryUpload = { secure_url: string; public_id: string; error?: { message?: string } };

export default function ProductImageManager({ tenantId, productId, images }: {
  tenantId: string; productId: string; images: ProductImage[];
}) {
  const router = useRouter();
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setBusy(true); setError(""); setMessage("");
    try {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, WebP, or AVIF image.");
      }
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
      const signatureResponse = await fetch("/api/uploads/cloudinary-signature", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, productId })
      });
      const signatureData = await signatureResponse.json() as UploadSignature & { error?: string };
      if (!signatureResponse.ok) throw new Error(signatureData.error ?? "Could not authorize upload.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("folder", signatureData.folder);
      formData.append("signature", signatureData.signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/image/upload`, {
        method: "POST", body: formData
      });
      const uploaded = await uploadResponse.json() as CloudinaryUpload;
      if (!uploadResponse.ok || !uploaded.secure_url || !uploaded.public_id) {
        throw new Error(uploaded.error?.message ?? "Cloudinary upload failed.");
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: saveError } = await supabase.rpc("register_product_image", {
        p_tenant_id: tenantId, p_product_id: productId, p_public_id: uploaded.public_id,
        p_secure_url: uploaded.secure_url, p_alt_text: altText.trim(), p_position: images.length
      });
      if (saveError) throw saveError;
      setAltText(""); setMessage("Image uploaded and attached to this product."); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload product image.");
    } finally { setBusy(false); }
  }

  return <details className="variant-manager">
    <summary>Product images ({images.length})</summary>
    {images.length > 0 && <div className="product-image-list">
      {images.map(item => <figure key={item.id}>
        <Image src={item.secure_url} alt={item.alt_text || "Product image"} width={120} height={100} unoptimized />
        <figcaption>{item.alt_text || "No alt text"}</figcaption>
      </figure>)}
    </div>}
    <label htmlFor={`product-image-alt-${productId}`}>Image description (alt text)</label>
    <input id={`product-image-alt-${productId}`} maxLength={250} value={altText} onChange={event => setAltText(event.target.value)} />
    <label htmlFor={`product-image-file-${productId}`}>Choose image (max 5 MB)</label>
    <input id={`product-image-file-${productId}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={upload} />
    {busy && <p role="status" className="form-message">Uploading image…</p>}
    {error && <p role="alert" className="form-message error">{error}</p>}
    {message && <p role="status" className="form-message">{message}</p>}
    <p className="field-help">Uploads use a short-lived server-generated signature. If the metadata save fails after upload, the Cloudinary file may need cleanup.</p>
  </details>;
}
