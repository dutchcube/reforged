/** Leest JSON uit localStorage; bij ontbrekende of kapotte data komt `fallback` terug. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Schrijft JSON naar localStorage. Volle of geblokkeerde opslag mag de app niet breken. */
export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Zonder opslag werkt de app gewoon door, alleen zonder offline-kopie.
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // niets te doen
  }
}

/** Sleutels met gegevens van de ingelogde gebruiker; bij uitloggen worden ze gewist. */
export const USER_DATA_KEYS = [
  'reforged:active-session',
  'reforged:pending-sessions',
  'reforged:workouts-cache',
  'reforged:history-cache',
  'reforged:history-local',
]

/** True als een fout komt doordat er geen verbinding is (en opnieuw proberen dus zin heeft). */
export function isNetworkError(message: string | undefined): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    message ?? '',
  )
}
