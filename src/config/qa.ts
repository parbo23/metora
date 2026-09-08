/**
 * QA-only paywall bypass for TestFlight builds made with the `testflight` EAS
 * profile. That profile is the only place where EXPO_PUBLIC_QA_BYPASS_PAYWALL
 * is set (see eas.json); the `production` profile never defines it, so release
 * builds keep the normal RevenueCat / paywall behaviour.
 *
 * When enabled, RevenueCat is not configured at all and the app treats the
 * `metora_pro` entitlement as active. Settings shows a visible "QA TestFlight
 * Build" notice so a build with this flag can never be mistaken for a release.
 */
export function isQaPaywallBypassEnabled(
  value: string | undefined = process.env.EXPO_PUBLIC_QA_BYPASS_PAYWALL,
): boolean {
  return value === 'true';
}
