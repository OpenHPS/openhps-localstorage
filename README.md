<h1 align="center">
  <img alt="OpenHPS" src="https://openhps.org/images/logo_text-512.png" width="40%" /><br />
  @openhps/localstorage
</h1>
<p align="center">
    <a href="https://github.com/OpenHPS/openhps-localstorage/actions/workflows/main.yml" target="_blank">
        <img alt="Build Status" src="https://github.com/OpenHPS/openhps-localstorage/actions/workflows/main.yml/badge.svg">
    </a>
    <a href="https://codecov.io/gh/OpenHPS/openhps-localstorage">
        <img src="https://codecov.io/gh/OpenHPS/openhps-localstorage/branch/master/graph/badge.svg"/>
    </a>
    <a href="https://codeclimate.com/github/OpenHPS/openhps-localstorage/" target="_blank">
        <img alt="Maintainability" src="https://img.shields.io/codeclimate/maintainability/OpenHPS/openhps-localstorage">
    </a>
    <a href="https://badge.fury.io/js/@openhps%2Flocalstorage">
        <img src="https://badge.fury.io/js/@openhps%2Flocalstorage.svg" alt="npm version" height="18">
    </a>
</p>

<h3 align="center">
    <a href="https://github.com/OpenHPS/openhps-core">@openhps/core</a> &mdash; <a href="https://openhps.org/docs/localstorage">API</a>
</h3>

<br />

This repository contains the [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) component for OpenHPS (Open Source Hybrid Positioning System). It includes a data service that can be used to store data frames, objects and node data in a browser local strage.

OpenHPS is a data processing positioning framework. It is designed to support many different use cases ranging from simple positioning such as detecting the position of a pawn on a chessboard using RFID, to indoor positioning methods using multiple cameras.

## Features
- ```LocalStrageDriver``` that can be used to initialize a ```DataService``` or as a standalone data service.

## Getting Started
If you have [npm installed](https://www.npmjs.com/get-npm), start using @openhps/localstorage with the following command.
```bash
npm install @openhps/localstorage --save
```

### Usage
You can use a ```LocalStorageDriver``` in a data service such as a ```DataObjectService``` to
use the driver to store data objects of a specific type.

```typescript
import { ModelBuilder, DataObjectService, DataObject, ReferenceSpace } from '@openhps/core';
import { LocalStorageDriver } from '@openhps/localstorage';

ModelBuilder.create()
    .addService(new DataObjectService(new LocalStorageDriver(DataObject, {
        namespace: 'myapp'
    })))
    .addService(new DataObjectService(new LocalStorageDriver(ReferenceSpace, {
        namespace: 'myapp',
        compress: true // Compress data
    })))
    .addShape(/* ... */)
    .build().then(model => {
        /* ... */
    });
```

#### Driver Options
```typescript
{
    compress: false,        // Compress stored data with an LZ-based compression
    chunkSize: 10,          // Chunk size for querying
    namespace: 'default'    // Namespace used for storage
}
```

## Contributors
The framework is open source and is mainly developed by PhD Student Maxim Van de Wynckel as part of his research towards *Hybrid Positioning and Implicit Human-Computer Interaction* under the supervision of Prof. Dr. Beat Signer.

## Contributing
Use of OpenHPS, contributions and feedback is highly appreciated. Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License
Copyright (C) 2019-2022 Maxim Van de Wynckel & Vrije Universiteit Brussel

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.