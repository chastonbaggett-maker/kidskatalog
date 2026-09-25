/**
 * Pair tokens are random ids stored in the shared device-pairs document.
 * They are not signed to a host or origin. A parent deployment and the kids
 * deployment redeem the same row, so a kids process with no Turso or Blob
 * cannot see a token that the parent preview just wrote.
 */
export function pairStoreMissing(input: {
  nodeEnv: string | undefined;
  tursoConfigured: boolean;
  blobConfigured: boolean;
}): boolean {
  return input.nodeEnv !== "development" && !input.tursoConfigured && !input.blobConfigured;
}
