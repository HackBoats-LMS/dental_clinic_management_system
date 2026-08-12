import crypto from "crypto";

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

// Server-generated daily verification code.
// Derived from a secret so it cannot be guessed remotely, while still being
// stable for the whole day and displayable on the clinic board.
export function getDailyCode(date: Date = new Date()): string {
  const secret =
    process.env.DAILY_CODE_SECRET || process.env.NEXTAUTH_SECRET || "kothamas-daily-code";
  const day = formatDate(date);
  const hash = crypto.createHmac("sha256", secret).update(`dental-verify:${day}`).digest("hex");
  return `KOTHA-${hash.slice(0, 6).toUpperCase()}`;
}
