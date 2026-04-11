// For local testing use your Mac's IP; for production use deployed API URL
const BASE_URL = "http://10.58.145.97:4000/api/auth";
const ATTENDANCE_URL = "http://10.58.145.97:4000/api/attendance";

export type AttendanceRecord = {
  id: string;
  date: string;
  type: "PUNCH_IN" | "PUNCH_OUT";
  markedAt: string;
};

export type TodayAttendance = {
  punchIn: string | null;
  punchOut: string | null;
};

export async function getStudentAttendance(studentId: string, token: string): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(`${ATTENDANCE_URL}/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export async function getTodayAttendance(studentId: string, token: string): Promise<TodayAttendance> {
  try {
    const res = await fetch(`${ATTENDANCE_URL}/student/${studentId}/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { punchIn: null, punchOut: null };
    return res.json();
  } catch { return { punchIn: null, punchOut: null }; }
}

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
