// Host half. Pure client UI plugin: the empty apply exists so the package
// appears in the host Loader (its `dsh.client` bundle is discovered by
// dsh-client-modules). No host-side behavior.
function apply() {}
export { apply };
