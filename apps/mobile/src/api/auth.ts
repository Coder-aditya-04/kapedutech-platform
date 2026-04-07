const BASE_URL = "http://192.168.2.174:4000/api/auth";

export type Student = {
  id: string;
  name: string;
  enrollmentNo: string;
  qrCode: string;
};

export type Parent = {
  id: string;
  name: string;
  phone: string;
  students: Student[];
};

export type VerifyOtpResponse = {
  token: string;
  parent: Parent;
};

export async function requestOtp(phone: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/parent/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to send OTP.");
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  const res = await fetch(`${BASE_URL}/parent/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "OTP verification failed.");
  }

  return data as VerifyOtpResponse;
}

export async function savePushToken(parentId: string, pushToken: string): Promise<void> {
  await fetch(`${BASE_URL}/parent/push-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId, pushToken }),
  });
}
