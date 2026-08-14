/** Background bed tracks for the site music player. */

export type MusicTrack = {
  id: string;
  title: string;
  url: string;
};

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    id: "marble-balloon-hop",
    title: "Marble Balloon Hop",
    url: "/music/marble-balloon-hop.mp3",
  },
  {
    id: "clouds-in-a-bubble",
    title: "Clouds in a Bubble",
    url: "/music/clouds-in-a-bubble.mp3",
  },
  {
    id: "cloudy-day-dance",
    title: "Cloudy Day Dance",
    url: "/music/cloudy-day-dance.mp3",
  },
  {
    id: "sunny-ukulele-dance",
    title: "Sunny Ukulele Dance",
    url: "/music/sunny-ukulele-dance.mp3",
  },
] as const;

export const DEFAULT_MUSIC_TRACK_ID = MUSIC_TRACKS[0]!.id;

export function getMusicTrack(id: string): MusicTrack {
  return MUSIC_TRACKS.find((t) => t.id === id) ?? MUSIC_TRACKS[0]!;
}

export function nextMusicTrackId(id: string): string {
  const i = MUSIC_TRACKS.findIndex((t) => t.id === id);
  const idx = i < 0 ? 0 : (i + 1) % MUSIC_TRACKS.length;
  return MUSIC_TRACKS[idx]!.id;
}
