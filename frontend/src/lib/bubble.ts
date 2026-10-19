let triggered = false;

export function resetBubble() {
  triggered = false;
}

export function triggerBubble() {
  if (triggered || !window.mygo) return;
  triggered = true;
  window.mygo.call("AppBridge.OnBubbleClicked").catch(() => {
    triggered = false;
  });
}
