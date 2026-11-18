import { normalizeText } from './text'

export type MatchableTrack = { id: string; title: string; artist: string }
export type MatchRow = { title: string; artist: string }

/**
 * Builds a matcher that maps an imported title/artist pair to a library track id.
 * Strategy: exact title+artist, then artist-contains (multi-artist credits),
 * then title only when it is unique in the library.
 */
export function createMatcher(tracks: MatchableTrack[]) {
  const prepared = tracks.map((track) => ({
    id: track.id,
    title: normalizeText(track.title),
    artist: normalizeText(track.artist),
  }))

  const exact = new Map<string, string>()
  const byTitle = new Map<string, string[]>()

  for (const track of prepared) {
    exact.set(`${track.title}|${track.artist}`, track.id)
    const bucket = byTitle.get(track.title) ?? []
    bucket.push(track.id)
    byTitle.set(track.title, bucket)
  }

  return function match(row: MatchRow): string | null {
    const title = normalizeText(row.title)
    const artist = normalizeText(row.artist)

    if (artist) {
      const direct = exact.get(`${title}|${artist}`)
      if (direct) return direct

      const loose = prepared.find(
        (track) =>
          track.title === title &&
          (track.artist.includes(artist) || artist.includes(track.artist)),
      )
      if (loose) return loose.id
    }

    const candidates = byTitle.get(title) ?? []
    return candidates.length === 1 ? candidates[0] : null
  }
}
