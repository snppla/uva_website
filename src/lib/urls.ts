export function imageUrl(key: string, size: "full" | "thumb" = "full") {
  return `/uploads/images/${key}${size === "thumb" ? "_thumb" : ""}.webp`;
}
