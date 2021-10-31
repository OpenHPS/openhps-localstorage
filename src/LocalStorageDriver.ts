import { DataServiceDriver, FilterQuery, MemoryQueryEvaluator, FindOptions, DataSerializer } from '@openhps/core';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { LocalStorageOptions } from './LocalStorageOptions';

export class LocalStorageDriver<I, T> extends DataServiceDriver<I, T> {
    protected options: LocalStorageOptions;
    protected _indexKeys: string[] = [];
    protected prefix: string;

    constructor(dataType?: new () => T, options?: LocalStorageOptions) {
        super(dataType as unknown as new () => T, options);
        this.options.namespace = this.options.namespace || 'default';
        this.options.chunkSize = this.options.chunkSize || 10;
        this.prefix = `${this.options.namespace}.${this.options.prefix || dataType.name}`.toLowerCase();

        if (typeof localStorage === 'undefined' || localStorage === null) {
            // eslint-disable-next-line
            var LocalStorage = require('node-localstorage').LocalStorage;
            global.localStorage = new LocalStorage(this.options.namespace);
        }

        this.once('build', this._initializeLocalStorage.bind(this));
    }

    private _initializeLocalStorage(): Promise<void> {
        return new Promise((resolve, reject) => {
            const metaData = DataSerializer.findRootMetaInfo(this.dataType);
            if (!metaData) {
                return resolve();
            }
            const indexes: Array<Promise<void>> = Array.from(metaData.dataMembers.values())
                .filter((dataMember: any) => dataMember.index)
                .map(this.createIndex.bind(this));
            Promise.all(indexes)
                .then(() => resolve())
                .catch(reject);
        });
    }

    public createIndex(dataMember: any): Promise<void> {
        return new Promise((resolve) => {
            if (dataMember.index) {
                localStorage.setItem(`${this.prefix}_index_${dataMember.key}`, JSON.stringify([]));
            }
            resolve();
        });
    }

    count(filter?: FilterQuery<T>): Promise<number> {
        return new Promise((resolve) => {
            const items: I[] = this._findAll();
            if (filter) {
                let count = 0;
                for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                    const keys = items.slice(i, i + this.options.chunkSize);
                    keys.forEach((key) => {
                        const value = this._findByUID(key);
                        if (MemoryQueryEvaluator.evaluate(value, filter)) {
                            count++;
                        }
                    });
                }
                resolve(count);
            } else {
                resolve(items.length);
            }
        });
    }

    private _findAll(): I[] {
        return JSON.parse(localStorage.getItem(`${this.prefix}_keys`)) || [];
    }

    private _findByUID(id: I): any {
        const compressedStr = localStorage.getItem(`${this.prefix}.${id}`);
        const jsonStr = this.options.compress ? decompressFromUTF16(compressedStr) : compressedStr;
        try {
            return JSON.parse(jsonStr);
        } catch (ex) {
            return undefined;
        }
    }

    findByUID(id: I): Promise<T> {
        return new Promise((resolve, reject) => {
            const serialized = this._findByUID(id);
            if (serialized) {
                const obj = this.options.deserialize(this._findByUID(id));
                resolve(obj);
            } else {
                reject(`${this.dataType.name} with identifier #${id} not found!`);
            }
        });
    }

    findOne(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.findAll(query, {
                limit: 1,
                sort: options.sort,
            })
                .then((results) => {
                    if (results.length > 0) {
                        return resolve(results[0]);
                    } else {
                        resolve(undefined);
                    }
                })
                .catch(reject);
        });
    }

    findAll(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T[]> {
        return new Promise<T[]>((resolve) => {
            const items: I[] = this._findAll();
            options.limit = options.limit || items.length;
            let data: T[] = [];
            for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                const keys = items.slice(i, i + this.options.chunkSize);
                keys.forEach((key) => {
                    const value = this._findByUID(key);
                    if (value && MemoryQueryEvaluator.evaluate(value, query)) {
                        data.push(value);
                        if (!options.sort && data.length >= options.limit) {
                            return;
                        }
                    }
                });
            }
            if (options.sort) {
                data = data
                    .sort((a, b) =>
                        options.sort
                            .map((s: any) => {
                                const res1 = MemoryQueryEvaluator.getValueFromPath(s[1] > 0 ? a : b, s[0])[1];
                                const res2 = MemoryQueryEvaluator.getValueFromPath(s[1] > 0 ? b : a, s[0])[1];
                                if (typeof res1 === 'number') {
                                    return res1 - res2;
                                } else if (typeof res1 === 'string') {
                                    return res1.localeCompare(res2);
                                } else {
                                    return 0;
                                }
                            })
                            .reduce((a: number, b: number) => a + b),
                    )
                    .slice(0, options.limit);
            }
            data = data.map(this.options.deserialize);
            resolve(data);
        });
    }

    insert(id: I, object: T): Promise<T> {
        return new Promise<T>((resolve) => {
            const serializedStr = JSON.stringify(this.options.serialize(object));
            const compressedStr = this.options.compress ? compressToUTF16(serializedStr) : serializedStr;
            localStorage.setItem(`${this.prefix}.${id}`, compressedStr);
            const items: I[] = this._findAll();
            if (!items.includes(id)) {
                items.push(id);
                localStorage.setItem(`${this.prefix}_keys`, JSON.stringify(items));
            }
            resolve(object);
        });
    }

    delete(id: I): Promise<void> {
        return new Promise<void>((resolve) => {
            const items: I[] = this._findAll();
            items.splice(items.indexOf(id), 1);
            localStorage.setItem(`${this.prefix}_keys`, JSON.stringify(items));
            localStorage.removeItem(`${this.prefix}.${id}`);
            resolve();
        });
    }

    deleteAll(filter?: FilterQuery<T>): Promise<void> {
        return new Promise((resolve, reject) => {
            const items: I[] = this._findAll();
            if (!filter) {
                Promise.all(items.map((item) => this.delete(item)))
                    .then(() => resolve())
                    .catch(reject);
            } else {
                for (let i = 0; i <= items.length; i += this.options.chunkSize) {
                    const keys = items.slice(i, i + this.options.chunkSize);
                    keys.forEach((key) => {
                        const value = this._findByUID(key);
                        if (MemoryQueryEvaluator.evaluate(value, filter)) {
                            this.delete(key);
                        }
                    });
                }
            }
            resolve();
        });
    }
}
