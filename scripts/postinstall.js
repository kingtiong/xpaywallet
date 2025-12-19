/* eslint-disable no-console */

const path = require('path');
const { spawnSync } = require('child_process');

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    windowsHide: true,
  });
  return result.status === 0;
}

function main() {
  const root = path.resolve(__dirname, '..');

  const rnNodeifyCmd = path.join(root, 'node_modules', 'rn-nodeify', 'cmd.js');
  const patchPackageBin = path.join(root, 'node_modules', 'patch-package', 'index.js');

  // Keep your original rn-nodeify arguments.
  const rnNodeifyArgs = [
    '--install',
    'http,https,zlib,path,crypto,fs,stream,assert,https,events,Buffer,process',
    '--hack',
  ];

  // rn-nodeify is a best-effort helper. If it fails (common on some Windows setups),
  // we still want `patch-package` to run so native/module fixes are applied.
  let rnNodeifyOk = true;
  try {
    rnNodeifyOk = runNodeScript(rnNodeifyCmd, rnNodeifyArgs);
    if (!rnNodeifyOk) {
      console.warn('[postinstall] rn-nodeify failed; continuing to patch-package.');
    }
  } catch (e) {
    console.warn('[postinstall] rn-nodeify threw; continuing to patch-package.');
  }

  const patchOk = runNodeScript(patchPackageBin, []);
  if (!patchOk) {
    process.exitCode = 1;
    return;
  }

  // Preserve a non-zero exit if rn-nodeify failed AND you explicitly want strict mode.
  // Default behavior is to succeed if patches applied.
  if (!rnNodeifyOk && process.env.RN_NODEIFY_STRICT === '1') {
    process.exitCode = 1;
  }
}

main();
