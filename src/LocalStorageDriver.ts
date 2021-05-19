import { DataSerializer, DataServiceDriver, FilterQuery, MemoryQueryEvaluator, FindOptions } from '@openhps/core';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { LocalStorageOptions } from './LocalStorageOptions';

export class LocalStorageDriver<I, T> extends DataServiceDriver<I, T> {
    protected options: LocalStorageOptions;
    protected _indexKeys: string[] = [];
    protected serialize: (obj: T) => any;
    protected deserialize: (obj: any) => T;
    protected prefix: string;

    constructor(
        dataType?: new () => T,
        options?: LocalStorageOptions,
        serializer: (obj: T) => any = (obj) => DataSerializer.serialize(obj),
        deserializer: (obj: any) => T = (obj) => DataSerializer.deserialize(obj),
    ) {
        super(dataType as unknown as new () => T);
        this.options = options || {};
        this.options.namespace = this.options.namespace || 'default';
        this.options.chunkSize = this.options.chunkSize || 10;
        this.prefix = `${this.options.namespace}.${dataType.name}`.toLowerCase();

        this.serialize = serializer;
        this.deserialize = deserializer;

        if (typeof localStorage === 'undefined' || localStorage === null) {
            // eslint-disable-next-line
            var LocalStorage = require('node-localstorage').LocalStorage;
            global.localStorage = new LocalStorage(this.options.namespace);
        }
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
                return items.length;
            }
        });
    }

    private _findAll(): I[] {
        return JSON.parse(localStorage.getItem(`${this.prefix}_keys`)) || [];
    }

    private _findByUID(id: I): any {
        const compressedStr = localStorage.getItem(`${this.prefix}.${id}`);
        const jsonStr = this.options.compress ? decompressFromUTF16(compressedStr) : compressedStr;
        if (jsonStr === null) {
            return undefined;
        }
        return JSON.parse(jsonStr);
    }

    public findByUID(id: I): Promise<T> {
        return new Promise((resolve, reject) => {
            const serialized = this._findByUID(id);
            if (serialized) {
                const obj = DataSerializer.deserialize<T>(this._findByUID(id));
                resolve(obj);
            } else {
                reject(`${this.dataType.name} with identifier #${id} not found!`);
            }
        });
    }

    public findOne(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T> {
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

    public findAll(query?: FilterQuery<T>, options: FindOptions = {}): Promise<T[]> {
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
            data = data.map(this.deserialize);
            resolve(data);
        });
    }

    public insert(id: I, object: T): Promise<T> {
        return new Promise<T>((resolve) => {
            const serializedStr = JSON.stringify(DataSerializer.serialize(object));
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

    public delete(id: I): Promise<void> {
        return new Promise<void>((resolve) => {
            const items: I[] = this._findAll();
            items.splice(items.indexOf(id), 1);
            localStorage.setItem(`${this.prefix}_keys`, JSON.stringify(items));
            localStorage.removeItem(`${this.prefix}.${id}`);
            resolve();
        });
    }

    public deleteAll(filter?: FilterQuery<T>): Promise<void> {
        return new Promise((resolve, reject) => {
            const items: I[] = this._findAll();
            if (filter === undefined) {
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
