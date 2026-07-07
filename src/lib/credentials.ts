export function buildPassword(pin: string): string {
  return `water-${pin}-lock`;
}

/** Converts a name + 4-digit pin into the synthetic Supabase auth credentials this app uses in place of real email/password accounts. */
export function buildCredentials(name: string, pin: string) {
  const normalizedName = name.trim().toLowerCase();
  return {
    email: `${normalizedName}@water.app`,
    password: buildPassword(pin),
  };
}

export function isValidPin(pinDigits: string[]): boolean {
  return pinDigits.length === 4 && pinDigits.every((digit) => /^\d$/.test(digit));
}
