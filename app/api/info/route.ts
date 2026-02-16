import { NextResponse } from 'next/server';
import ytDlp from '@/app/lib/ytdlp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const metadata = await ytDlp.getVideoInfo(url);

    // Group formats by resolution/quality
    const formats = metadata.formats || [];

    const processedFormats = formats
      .filter((f: any) => f.vcodec !== 'none' || f.acodec !== 'none')
      .map((f: any) => ({
        itag: f.format_id,
        qualityLabel: f.format_note || (f.height ? `${f.height}p` : 'Audio'),
        container: f.ext,
        hasAudio: f.acodec !== 'none',
        hasVideo: f.vcodec !== 'none',
        height: f.height,
      }));

    const uniqueFormatsMap = new Map();

    processedFormats.forEach((format: any) => {
      if (!format.hasVideo) return; // Skip audio-only for the main list

      let label = format.qualityLabel;
      if (format.height) label = `${format.height}p`;

      const key = label;

      if (!uniqueFormatsMap.has(key)) {
        uniqueFormatsMap.set(key, format);
      } else {
        const existing = uniqueFormatsMap.get(key);
        if (format.container === 'mp4' && existing.container !== 'mp4') {
          uniqueFormatsMap.set(key, format);
        }
        else if (format.container === existing.container) {
          uniqueFormatsMap.set(key, format);
        }
      }
    });

    const uniqueFormats = Array.from(uniqueFormatsMap.values())
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    // Add explicit MP3 option
    uniqueFormats.push({
      qualityLabel: 'Audio Only (MP3)',
      itag: 'mp3',
      container: 'mp3',
      hasAudio: true,
      hasVideo: false
    });

    return NextResponse.json({
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      formats: uniqueFormats.map((format: any) => ({
        qualityLabel: format.height ? `${format.height}p` : format.qualityLabel,
        itag: format.itag,
        container: format.container,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo
      })),
      videoDetails: {
        author: metadata.uploader,
        lengthSeconds: metadata.duration,
        viewCount: metadata.view_count,
      }
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}
