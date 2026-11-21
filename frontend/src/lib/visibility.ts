/** Only poll a tab the user can actually see. */
export function shouldRefresh(visibilityState: string): boolean {
  return visibilityState === "visible";
}
