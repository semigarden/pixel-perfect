const fs = require('fs');
const path = require('path');

function isExecutable(p) {
    try {
        fs.accessSync(p, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

function resolveBundled(name) {
    const baseDir = process.pkg
        ? path.dirname(process.execPath)
        : process.cwd();

    const candidates = [
        path.join(baseDir, name),
        path.join(baseDir, 'bin', name),
        path.join(baseDir, 'vendor', name),
        path.join(baseDir, 'ffmpeg', name),
    ];

    for (const c of candidates) {
        if (isExecutable(c)) return c;
    }
    return null;
}

function resolveDependency(name) {
    const envKey = name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH';
    const envPath = process.env[envKey];
    if (envPath && isExecutable(envPath)) return envPath;

    if (process.pkg) {
        const bundled = resolveBundled(name);
        if (bundled) return bundled;
    }

    return name;
}

module.exports = { resolveDependency };
