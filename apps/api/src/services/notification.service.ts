const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushNotification(
  pushToken: string | null,
  studentName: string,
  time: string
): Promise<void> {
  if (!pushToken) {
    console.log(`[Notification] No push token for parent of ${studentName} — skipping.`);
    return;
  }

  const body = {
    to: pushToken,
    title: "Attendance Marked",
    body: `${studentName} checked in at ${time}`,
    sound: "default",
  };

  console.log(`[Notification] Sending push to token=${pushToken}`);

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log(`[Notification] Expo response:`, JSON.stringify(data));
}
