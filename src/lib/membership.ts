// Club membership dates. Per the bylaws, membership runs for the calendar year, and dues paid from
// September 1 on count toward the next year.

const NEXT_YEAR_FROM_MONTH = 9;

/** Lifetime members are stored with this expiry so they never lapse. */
export const LIFETIME_EXPIRY = "9999-12-31";

export const isLifetime = (expiresOn: string | null) => expiresOn === LIFETIME_EXPIRY;

/** The membership year that dues paid on `paidOn` ("YYYY-MM-DD") are for. */
export function duesYear(paidOn: string) {
  const [y, m] = paidOn.split("-").map(Number);
  return m >= NEXT_YEAR_FROM_MONTH ? y + 1 : y;
}

/** Expiry after dues are paid on `paidOn`: Dec 31 of the year they're for. */
export const expiryAfterDues = (paidOn: string) => `${duesYear(paidOn)}-12-31`;

/** Whether a member can renew today: not lifetime, and not already paid up through the year dues would be for. */
export const canRenew = (expiresOn: string | null, today: string) =>
  !isLifetime(expiresOn) && (!expiresOn || expiresOn < expiryAfterDues(today));
