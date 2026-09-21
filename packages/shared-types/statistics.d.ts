export interface TopItem {
    id: string;
    name: string;
    totalDurationMs: number;
    playCount: number;
}
export interface TimeStat {
    period: string;
    totalDurationMs: number;
    trackCount: number;
}
export interface WrappedSummary {
    topArtists: TopItem[];
    topTracks: TopItem[];
    topAlbums: TopItem[];
    totalListeningTimeMs: number;
}
//# sourceMappingURL=statistics.d.ts.map