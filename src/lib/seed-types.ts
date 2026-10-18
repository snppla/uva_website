// Shapes shared by the seed planner (local), the seed API and the seed writers.

export type SeedPhoto = {
  /** Stable id from the source (e.g. "fb:1234"); re-imports with the same ref are skipped. */
  ref: string;
  caption: string;
  /** ISO timestamp, when known. */
  takenAt: string | null;
};

export type SeedAlbum = {
  title: string;
  slug: string;
  date: string | null; // YYYY-MM-DD
  description: string;
  createdAt: string | null; // ISO
};

export type SeedEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM, omitted for all-day
  endDate?: string;
  endTime?: string;
  location?: string;
  description?: string;
};

export type SeedPost = {
  title: string;
  slug: string;
  date: string; // YYYY-MM-DD
  excerpt?: string;
  body: string;
  /** ref of an imported photo to use as the cover */
  coverRef?: string;
};

export type SeedContent = {
  settings: Record<string, string>;
  /** ref of an imported photo for the home page banner */
  heroRef?: string;
  events: SeedEvent[];
  posts: SeedPost[];
};
