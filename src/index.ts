/**
 * Host half. This package is a pure client (browser) UI plugin, so the host
 * body is intentionally empty: the plugin appears in the host Loader, and the
 * `dsh.client` declaration in package.json is what exposes its `./client`
 * bundle to the web shell. There is no host-side behavior.
 */
export function apply(): void {}
