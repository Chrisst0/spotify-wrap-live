export interface TopItem {
    id: string;
    name: string;
    totalDurationMs: number;
    playCount: number;
}

export interface TimeStat {
    period: string; // 'day', 'week', 'month', 'year'
    totalDurationMs: number;
    trackCount: number;
}

export interface WrappedSummary {
    topArtists: TopItem[];
    topTracks: TopItem[];
    topAlbums: TopItem[];
    totalListeningTimeMs: number;
}
