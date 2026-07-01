// One-line toggle for the mandatory-login-before-checkout requirement, so it
// can be A/B tested later without a code change. Defaults to true (current
// behavior) if the env var is unset.
export function requireLoginToBuy(): boolean {
  return process.env.REQUIRE_LOGIN_TO_BUY !== "false";
}
