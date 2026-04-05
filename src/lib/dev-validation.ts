/**
 * When true, client-side "required field" checks are skipped so flows can be tested quickly in dev.
 * Set NEXT_PUBLIC_RELAX_VALIDATION=1 in .env.local to also relax in production builds (e.g. staging).
 */
export function skipRequiredFieldValidation(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_RELAX_VALIDATION === "1";
}
