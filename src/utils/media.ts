export const fallbackDressImage =
  "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?auto=format&fit=crop&w=900&q=80";

export function normalizeMediaUrl(url: string) {
  const value = url.trim();
  if (!value) return "";

  const googleDriveMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (googleDriveMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${googleDriveMatch[1]}`;
  }

  const googleOpenMatch = value.match(/[?&]id=([^&]+)/);
  if (value.includes("drive.google.com") && googleOpenMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${googleOpenMatch[1]}`;
  }

  const dropboxMatch = value.match(/dropbox\.com\/(.+)/);
  if (dropboxMatch) {
    return value.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  }

  return value;
}
