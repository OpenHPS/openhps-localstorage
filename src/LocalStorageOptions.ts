import { DataServiceOptions } from '@openhps/core';

export interface LocalStorageOptions extends DataServiceOptions {
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
    /**
     * Prefix to use
     *
     * @default dataType.constructor.name
     */
    prefix?: string;
}
