const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushNotification(
  pushToken: string | null,
  title: string,
  body: string
): Promise<void> {
  if (!pushToken) {
    console.log(`[Notification] No push token — skipping.`);
    return;
  }
  const payload = { to: pushToken, title, body, sound: "default" };
  console.log(`[Notification] Sending: "${title}" → ${pushToken}`);
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log(`[Notification] Response:`, JSON.stringify(data));
}
