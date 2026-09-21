import { SpotifyDatabase } from '../database/sqlite-repo';
import { TopItem, TimeStat, WrappedSummary } from '../shared-types/statistics';
export declare class StatisticsEngine {
    private db;
    constructor(spotifyDb: SpotifyDatabase);
    getTotalListeningTime(startTime: number, endTime: number): Promise<number>;
    getTopArtists(limit?: number, startTime?: number): Promise<TopItem[]>;
    getTopTracks(limit?: number, startTime?: number): Promise<TopItem[]>;
    getDailyStats(daysBack?: number): Promise<TimeStat[]>;
    getWrappedSummary(startTime: number): Promise<WrappedSummary>;
}
//# sourceMappingURL=engine.d.ts.map