# Changelog

## [1.3.0](https://github.com/forjd/minimap/compare/v1.2.2...v1.3.0) (2026-05-03)


### Features

* add backend command hints ([886eae3](https://github.com/forjd/minimap/commit/886eae34cf90992ffd060b1e4c0b2fb2e98bf161))
* add normalized check mode ([968a46c](https://github.com/forjd/minimap/commit/968a46cecf471fabf7d5cd7d1ba9e913ac947962))
* classify destructive commands ([a63f2cf](https://github.com/forjd/minimap/commit/a63f2cf04fd7c977e859f2d5168bfc21e9dfd1d5))
* configure render limits ([9fcb050](https://github.com/forjd/minimap/commit/9fcb050254ffe24a9d702995c2889e07fc222b4d))
* detect python validation commands ([1b5ddf0](https://github.com/forjd/minimap/commit/1b5ddf0e851d9a2d35d81acee0cdd1c6fe7f7efb))
* diverge claude profile output ([375f7a5](https://github.com/forjd/minimap/commit/375f7a55031215068af9ecc8d3e0d8a41a58d1a5))
* show compact drift diffs ([9ca32c9](https://github.com/forjd/minimap/commit/9ca32c9049008a65bc2700c0729dd9a1fa00efae))
* summarize workspace package stacks ([3a10fe4](https://github.com/forjd/minimap/commit/3a10fe47092acedd26c728f13a025addf1b6a1b1))

## [1.2.2](https://github.com/forjd/minimap/compare/v1.2.1...v1.2.2) (2026-05-02)


### Bug Fixes

* cap rendered workspace entries ([6809c71](https://github.com/forjd/minimap/commit/6809c71e743288600068370bc73074aa7cf1c15f)), closes [#8](https://github.com/forjd/minimap/issues/8)

## [1.2.1](https://github.com/forjd/minimap/compare/v1.2.0...v1.2.1) (2026-05-02)


### Bug Fixes

* confine cli reads and writes to repo ([7227386](https://github.com/forjd/minimap/commit/7227386a517b355c063f6e539a852eb5bf937073))


### Performance Improvements

* speed up cli scanning ([0509749](https://github.com/forjd/minimap/commit/05097499a240aef1973899ef70506bd19f38e413))

## [1.2.0](https://github.com/forjd/minimap/compare/v1.1.1...v1.2.0) (2026-05-02)


### Features

* add install script ([74b164a](https://github.com/forjd/minimap/commit/74b164ae00c8b67c4ee1848a1fbd527b9c4a2486))
* detect monorepo workspaces ([59a524a](https://github.com/forjd/minimap/commit/59a524adc4bbc487752dffabfe194400efd7d96f))

## [1.1.1](https://github.com/forjd/minimap/compare/v1.1.0...v1.1.1) (2026-05-02)


### Bug Fixes

* trigger release for binary artifacts ([8c8cef0](https://github.com/forjd/minimap/commit/8c8cef09b18ff87b27359ef95316e90328965553))

## [1.1.0](https://github.com/forjd/minimap/compare/v1.0.2...v1.1.0) (2026-05-02)


### Features

* add minimap agent skill ([cd7e33d](https://github.com/forjd/minimap/commit/cd7e33d22352e915395fad4609c90d5a579727ee))
* detect C and C++ projects ([1b10590](https://github.com/forjd/minimap/commit/1b105909c8f699bc244c3848175c296b50b06c0c))
* detect documentation and Codex assets ([ec56b0a](https://github.com/forjd/minimap/commit/ec56b0a22044209b1d0c047c44cb56cb6bc1401d))
* detect node cli applications ([a972cd9](https://github.com/forjd/minimap/commit/a972cd9e36299a4fda4dd5752e800cbe18662474))
* detect Swift and Xcode projects ([0664896](https://github.com/forjd/minimap/commit/06648964701950d4714f80641ede982313254a9b))
* expand repository detectors ([506eb3c](https://github.com/forjd/minimap/commit/506eb3ce670c4c5c5185825c5ad334327be313c9))
* summarize expanded ecosystems ([4441a9c](https://github.com/forjd/minimap/commit/4441a9c9e3fbcb167312aba0cd73c3557ca5a297))


### Bug Fixes

* dedupe rendered stack signals ([99ac6a9](https://github.com/forjd/minimap/commit/99ac6a9d3f1f606b7856aec3a430be28a9719a6b))
* detect shallow docs and Docker layouts ([be4de06](https://github.com/forjd/minimap/commit/be4de06528c402799b60719ba15b08a73f13d605))
* remove agent guidance from generated context ([4d11d09](https://github.com/forjd/minimap/commit/4d11d094177023fab0a54acae06b3fa7605ee566))

## [1.0.2](https://github.com/forjd/minimap/compare/v1.0.1...v1.0.2) (2026-05-02)


### Bug Fixes

* read cli version from package metadata ([f820206](https://github.com/forjd/minimap/commit/f8202062f4ce133a58f8ca5b08b67a579b2d9bc4))

## [1.0.1](https://github.com/forjd/minimap/compare/v1.0.0...v1.0.1) (2026-05-02)


### Bug Fixes

* normalize npm binary path ([599c382](https://github.com/forjd/minimap/commit/599c382bbc2e2a9f897fb5293c0a9df1cb2cb098))

## 1.0.0 (2026-05-02)


### Features

* build minimap mvp ([ec7cb91](https://github.com/forjd/minimap/commit/ec7cb911a4dde93085348ee66686a20fe9da7a75))


### Bug Fixes

* preserve npm binary ([f3e48a8](https://github.com/forjd/minimap/commit/f3e48a82dba5fc26013580289bf61b1469d8001e))
