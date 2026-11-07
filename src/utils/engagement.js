export const ENGAGEMENT_THRESHOLD_MS = 10_000;

// No identities or fingerprints: just visible/focused time and a trusted UI action.
export function createEngagementMeter() {
  let previous = null, wasActive = false, activeMs = 0, interacted = false;
  return {
    sample(time, active, trustedInteraction = false) {
      if (previous !== null && wasActive) activeMs += Math.max(0, Math.min(5000, time - previous));
      previous = time;
      wasActive = active;
      if (active && trustedInteraction) interacted = true;
      return { active_ms: Math.floor(activeMs), interacted, ready: active && interacted && activeMs >= ENGAGEMENT_THRESHOLD_MS };
    },
  };
}

export function startEngagementTracking({ windowRef = window, documentRef = document, sessionId, send, now = () => performance.now() }) {
  const key = "pdd-analytics-engaged";
  let sent = false;
  try { sent = windowRef.sessionStorage.getItem(key) === sessionId; } catch { /* Memory-only fallback. */ }
  if (sent) return () => {};
  const meter = createEngagementMeter();
  const active = () => documentRef.visibilityState === "visible" && documentRef.hasFocus()
    && !/^\/admin(?:\/|$)/i.test(windowRef.location.pathname);
  const listeners = [];
  let timer;
  const stop = () => {
    if (timer !== undefined) windowRef.clearInterval(timer);
    for (const [target, name, handler] of listeners) target.removeEventListener(name, handler);
  };
  const sample = event => {
    const state = meter.sample(now(), active(), event?.isTrusted === true && ["pointerdown", "keydown", "wheel", "touchstart"].includes(event.type));
    if (!sent && state.ready) {
      sent = true;
      stop();
      try { windowRef.sessionStorage.setItem(key, sessionId); } catch { /* Keep working without storage. */ }
      send({ active_ms: state.active_ms, interacted: true });
    }
  };
  const listen = (target, name) => { target.addEventListener(name, sample, { passive: true }); listeners.push([target, name, sample]); };
  for (const name of ["pointerdown", "keydown", "wheel", "touchstart", "visibilitychange"]) listen(documentRef, name);
  for (const name of ["focus", "blur", "pagehide"]) listen(windowRef, name);
  sample();
  timer = windowRef.setInterval(sample, 1000);
  return stop;
}
