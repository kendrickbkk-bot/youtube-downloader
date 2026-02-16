import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

const YTDLP_FILENAME = 'yt-dlp';
const binaryPath = path.join(process.cwd(), YTDLP_FILENAME);

// Ensure binary exists (simple check, in prod we might need more robust handling)
if (!fs.existsSync(binaryPath)) {
    console.warn(`yt-dlp binary not found at ${binaryPath}. Please run the install script.`);
}

const ytDlp = new YTDlpWrap(binaryPath);

export default ytDlp;
export { binaryPath };
