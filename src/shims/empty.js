// Stand-in for Node-only modules (https, http, fs) that exifreader references
// behind runtime guards. Metora always hands exifreader an ArrayBuffer, so
// these code paths never run on device.
module.exports = {};
