export const PROFILE_UPDATED_EVENT = "vibegigs:profile-updated";

export function notifyProfileUpdated(): void {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}
