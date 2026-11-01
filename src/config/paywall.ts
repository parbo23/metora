/**
 * Master switch for the paywall. Shot On v1 ships free: with this flag off the
 * export gate always lets the action through and the paywall route is not
 * reachable. The purchase and paywall code stays in the tree so it can be
 * turned back on without rebuilding it.
 */
export const PAYWALL_ENABLED = false;
