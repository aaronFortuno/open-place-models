# Open Place Models

A static catalogue of georeferenced 3D models of real places. The first model is [Torre Glòries](models/torre-glories/r1/README.md) in Barcelona.

Read [catalog.geojson](catalog.geojson) to find the models. Each feature has a stable `id`, a revision and the geographic footprint in WGS84 longitude and latitude. The `anchor` locates the origin of the GLB at ground level. The GLB uses metres with X east, Y up and Z south. Resolve the `mesh` path relative to the catalogue URL. The same revision path identifies the same file.

Source code is MIT licensed. Each model entry records its geometry licence, attribution and sources. The first model’s author contributions are CC BY 4.0. Its mapped footprint and placement derive from OpenStreetMap under ODbL 1.0. [MIT](LICENSE) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright)

Regenerate the pilot with `node scripts/generate-glories.mjs`.

See the [contribution guide](CONTRIBUTING.md) for the catalogue format and the handoff from candidate research to modelling.
