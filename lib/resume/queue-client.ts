export const APPLICATION_QUEUE_EVENT = "application-queue:changed";

export function notifyApplicationQueue() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APPLICATION_QUEUE_EVENT));
  }
}
