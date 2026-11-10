import { getSupabase } from "./supabase";

/** Réduit la photo (économise les données mobiles) puis l'envoie dans le stockage Supabase. */
export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Service momentanément indisponible. Réessaie plus tard.");
  const blob = await resizeToJpeg(file, 800, 0.82);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("defarko-photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error("Impossible d'envoyer la photo. Réessaie avec une autre image.");
  return sb.storage.from("defarko-photos").getPublicUrl(path).data.publicUrl;
}

function resizeToJpeg(file: File, max: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Image non supportée."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image non supportée."))), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image non supportée."));
    };
    img.src = url;
  });
}
