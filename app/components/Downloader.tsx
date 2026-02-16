"use client";

import { useState } from 'react';
import { Download, Loader2, Youtube, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface VideoFormat {
    qualityLabel: string;
    itag: number;
    container: string;
    hasAudio: boolean;
    hasVideo: boolean;
}

interface VideoInfo {
    title: string;
    thumbnail: string;
    formats: VideoFormat[];
    videoDetails: {
        author: string;
        lengthSeconds: string;
        viewCount: string;
    };
}

export default function Downloader() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

    const fetchInfo = async () => {
        if (!url) return;
        setLoading(true);
        setError('');
        setVideoInfo(null);

        try {
            const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch video info');
            }

            setVideoInfo(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (itag: number, hasAudio: boolean) => {
        setDownloading(itag);

        // Create a temporary link to start download
        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&itag=${itag}`;

        // For direct downloads (typically 360p/720p with audio), works instantly.
        // For high quality (needs merge), browser will handle the stream.
        // We use window.location for simplicity, or an hidden iframe/anchor.

        try {
            // Check if we can reach the endpoint first? No, just trigger it.
            // We use an anchor tag to trigger download
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = ''; // Browser handles filename
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            setError('Download failed to start');
        } finally {
            // Reset downloading state after a short delay, as we can't track stream progress easily here
            setTimeout(() => setDownloading(null), 2000);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-center mb-8">
                <Youtube className="w-12 h-12 text-red-600 mr-3" />
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-purple-600">
                    YouTube Downloader
                </h1>
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube URL here..."
                    className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                />
                <button
                    onClick={fetchInfo}
                    disabled={loading || !url}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start'}
                </button>
            </div>

            {error && (
                <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {videoInfo && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-6 mb-8">
                        <div className="relative w-full md:w-1/2 aspect-video rounded-xl overflow-hidden shadow-lg group">
                            <Image
                                src={videoInfo.thumbnail}
                                alt={videoInfo.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold mb-2 line-clamp-2">{videoInfo.title}</h2>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-4">{videoInfo.videoDetails.author}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm text-zinc-500">
                                <div>Duration: {new Date(parseInt(videoInfo.videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8)}</div>
                                <div>Views: {parseInt(videoInfo.videoDetails.viewCount).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg mb-4">Download Options</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {videoInfo.formats.map((format) => (
                                <button
                                    key={format.itag}
                                    onClick={() => handleDownload(format.itag, format.hasAudio)}
                                    disabled={downloading === format.itag}
                                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2">{format.qualityLabel || 'Audio'}</span>
                                        <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 group-hover:text-red-600 transition-colors uppercase">
                                            {format.container}
                                        </span>
                                        {!format.hasAudio && format.hasVideo && (
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium">
                                                HQ
                                            </span>
                                        )}
                                    </div>
                                    {downloading === format.itag ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                    ) : (
                                        <Download className="w-5 h-5 text-zinc-400 group-hover:text-red-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
