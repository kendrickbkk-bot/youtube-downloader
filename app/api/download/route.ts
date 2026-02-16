import { NextResponse } from 'next/server';
import ytDlp from '@/app/lib/ytdlp';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs';

// Helper to find ffmpeg executable
function getFfmpegPath() {
    // 1. Try the imported path from ffmpeg-static
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        return ffmpegPath;
    }

    // 2. Try identifying it in local node_modules (common in dev/pnpm)
    // pnpm structure: node_modules/ffmpeg-static/ffmpeg
    const localPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
    if (fs.existsSync(localPath)) {
        return localPath;
    }

    // 3. Try finding it in pnpm hidden modules if strictly needed, but let's hope 1 or 2 works.
    // In production (Vercel), ffmpeg-static might behave differently, usually requiring specific config.
    // For now, ensuring dev works.

    return null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const itag = searchParams.get('itag');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const metadata = await ytDlp.getVideoInfo(url);
        const videoTitle = (metadata.title || 'video').replace(/[^\w\s-]/gi, '');

        const ffmpegBinary = getFfmpegPath();
        if (!ffmpegBinary) {
            console.error('ffmpeg binary not found. Imported:', ffmpegPath);
            return NextResponse.json({ error: 'ffmpeg binary missing' }, { status: 500 });
        }

        let filename = '';
        let contentType = '';
        let ffmpegArgs: string[] = [];

        // === MP3 DOWNLOAD ===
        if (itag === 'mp3') {
            filename = `${videoTitle}.mp3`;
            contentType = 'audio/mpeg';

            const audioFormat = metadata.formats.reverse().find((f: any) =>
                f.acodec !== 'none' && f.vcodec === 'none' && f.url
            );

            if (!audioFormat || !audioFormat.url) {
                console.error('Audio source not found for MP3');
                return NextResponse.json({ error: 'Audio source not found' }, { status: 404 });
            }

            ffmpegArgs = [
                '-i', audioFormat.url,
                '-vn',
                '-c:a', 'libmp3lame',
                '-q:a', '2',
                '-f', 'mp3',
                'pipe:1'
            ];
        }
        // === VIDEO DOWNLOAD ===
        else {
            filename = `${videoTitle}.mp4`;
            contentType = 'video/mp4';

            let videoFormat = null;
            if (itag) {
                videoFormat = metadata.formats.find((f: any) => String(f.format_id) === String(itag));
            } else {
                videoFormat = metadata.formats.reverse().find((f: any) => f.vcodec !== 'none');
            }

            if (!videoFormat || !videoFormat.url) {
                console.error('Video format not found or no URL');
                return NextResponse.json({ error: 'Video format not found' }, { status: 404 });
            }

            let audioFormat = null;
            let needsMerge = false;

            if (videoFormat.acodec === 'none') {
                needsMerge = true;
                audioFormat = metadata.formats.reverse().find((f: any) =>
                    f.acodec !== 'none' && f.vcodec === 'none' && f.url
                );
            }

            if (needsMerge && audioFormat && audioFormat.url) {
                ffmpegArgs = [
                    '-i', videoFormat.url,
                    '-i', audioFormat.url,
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-map', '0:v:0',
                    '-map', '1:a:0',
                    '-movflags', 'frag_keyframe+empty_moov',
                    '-f', 'mp4',
                    'pipe:1'
                ];
            } else {
                ffmpegArgs = [
                    '-i', videoFormat.url,
                    '-c:v', 'copy',
                    '-c:a', 'copy',
                    '-movflags', 'frag_keyframe+empty_moov',
                    '-f', 'mp4',
                    'pipe:1'
                ];
            }
        }

        console.log(`Spawning ffmpeg (${ffmpegBinary}) with args: ${ffmpegArgs.join(' ')}`);

        const ffmpegProcess = spawn(ffmpegBinary, ffmpegArgs, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        ffmpegProcess.stderr.on('data', (data) => {
            console.error(`FFmpeg stderr: ${data.toString()}`);
        });

        const passThrough = new PassThrough();
        ffmpegProcess.stdout.pipe(passThrough);

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
        headers.set('Content-Type', contentType);

        const readableStream = new ReadableStream({
            start(controller) {
                passThrough.on('data', (chunk) => controller.enqueue(chunk));
                passThrough.on('end', () => controller.close());
                passThrough.on('error', (err) => controller.error(err));
            },
            cancel() {
                ffmpegProcess.kill();
            }
        });

        return new NextResponse(readableStream, { headers });

    } catch (error) {
        console.error('Error downloading:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
