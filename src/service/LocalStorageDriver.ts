import { DataSerializer, DataServiceDriver, FilterQuery } from '@openhps/core';
import { compress, decompress } from 'lz-string';

export class LocalStorageDriver<I, T> extends DataServiceDriver<I, T> {
    public namespace: string;
    protected _indexKeys: string[] = [];

    constructor(dataType: new () => T, namespace = 'default') {
        super((dataType as unknown) as new () => T);
        this.namespace = `${namespace}.${dataType.name}`.toLowerCase();

        if (typeof localStorage === 'undefined' || localStorage === null) {
            // eslint-disable-next-line
            var LocalStorage = require('node-localstorage').LocalStorage;
            global.localStorage = new LocalStorage(namespace);
        }
    }

    public createIndex(index: string): Promise<void> {
        return new Promise((resolve) => {
            this._indexKeys.push(index);
            resolve();
        });
    }

    private _createIndexes(id: I, object: T): void {
        this._indexKeys.forEach((key) => {
            localStorage.setItem(`${this.namespace}.${key}[]`, null);
        });
    }

    private _deleteIndexes(id: I): void {
        this._indexKeys.forEach((key) => {
            const values = localStorage.getItem(`${this.namespace}.${key}`);
        });
    }

    public findByUID(id: I): Promise<T> {
        return new Promise((resolve) => {
            const compressedStr = localStorage.getItem(`${this.namespace}.uid.${id}`);
            const jsonStr = decompress(compressedStr);
            const obj = DataSerializer.deserialize<T>(JSON.parse(jsonStr));
            resolve(obj);
        });
    }

    public findOne(query?: FilterQuery<T>): Promise<T> {
        return new Promise<T>((_, reject) => {
            reject(new Error(`Not implemented!`));
        });
    }

    public findAll(query?: FilterQuery<T>): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            const items: I[] = JSON.parse(localStorage.getItem(`${this.namespace}_keys`)) || [];
            Promise.all(items.map((item) => this.findByUID(item)))
                .then((items) => {
                    resolve(items);
                })
                .catch(reject);
        });
    }

    public insert(id: I, object: T): Promise<T> {
        return new Promise<T>((resolve) => {
            const serializedStr = JSON.stringify(DataSerializer.serialize(object));
            localStorage.setItem(`${this.namespace}.${id}`, compress(serializedStr));
            const items: I[] = JSON.parse(localStorage.getItem(`${this.namespace}_keys`)) || [];
            items.push(id);
            localStorage.setItem(`${this.namespace}_keys`, JSON.stringify(items));
            resolve(object);
        });
    }

    public delete(id: I): Promise<void> {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(`${this.namespace}.${id}`);
            resolve();
        });
    }

    public deleteAll(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const items: I[] = JSON.parse(localStorage.getItem(`${this.namespace}_keys`)) || [];
            Promise.all(items.map((item) => this.delete(item)))
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}
