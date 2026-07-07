const USER_A_NAME = "Shahul";
const USER_B_NAME = "Shaima";

export function getUserNames(email?: string | null) {
  const normalized = email?.split("@")[0]?.toLowerCase() ?? "";

  if (normalized === USER_B_NAME.toLowerCase()) {
    return { currentName: USER_B_NAME, partnerName: USER_A_NAME };
  }

  if (normalized === USER_A_NAME.toLowerCase()) {
    return { currentName: USER_A_NAME, partnerName: USER_B_NAME };
  }

  return { currentName: "You", partnerName: "Partner" };
}

/** "Shahul's" for a real name, but "Your" for the generic "You" fallback so labels like "{possessive} Total" stay grammatical. */
export function getPossessive(name: string): string {
  return name === "You" ? "Your" : `${name}'s`;
}
