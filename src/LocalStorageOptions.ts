export interface LocalStorageOptions {
    /**
     * Namespace
     *
     * @default default
     */
    namespace?: string;
    /**
     * Chunk size for querying
     *
     * @default 10
     */
    chunkSize?: number;
    /**
     * Compress data using LZ-based compression
     *
     * @default false
     */
    compress?: boolean;
}
