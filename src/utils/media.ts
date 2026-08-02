import type { InventoryItem } from "../types";

export const fallbackDressImage =
  "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=900&q=80";

function googleDriveFileId(url: string) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return fileMatch[1];

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes("drive.google.com") && openMatch?.[1]) return openMatch[1];

  return "";
}

export function normalizeMediaUrl(url: string, kind: "image" | "video" = "image") {
  const value = url.trim();
  if (!value) return "";

  const driveId = googleDriveFileId(value);
  if (driveId) {
    return kind === "image"
      ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`
      : `https://drive.google.com/uc?export=download&id=${driveId}`;
  }

  const dropboxMatch = value.match(/dropbox\.com\/(.+)/);
  if (dropboxMatch) {
    return value.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  }

  return value;
}

export function normalizeInventoryItemMedia(item: InventoryItem): InventoryItem {
  const images = item.images.map((imageUrl) => normalizeMediaUrl(imageUrl, "image")).filter(Boolean);
  return {
    ...item,
    images,
    featuredImage: normalizeMediaUrl(item.featuredImage || images[0] || fallbackDressImage, "image"),
    shortVideo: item.shortVideo ? normalizeMediaUrl(item.shortVideo, "video") : undefined
  };
}
