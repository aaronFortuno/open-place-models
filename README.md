# Open Place Models

A static catalogue of georeferenced 3D models of real places. The catalogue includes [Torre Glòries](models/torre-glories/r1/README.md), [Barcelona Cathedral](models/barcelona-cathedral/r2/README.md) and [Tour Eiffel](models/eiffel-tower/r2/README.md).

Browse the [model gallery](https://aaronfortuno.github.io/open-place-models/) to filter places by geometry, country and city, then orbit, zoom and download a model. The details panel shows the selected file size. You can link directly to a model with `?model=<id>`, or to a particular resolution, such as [Tour Eiffel in detail](https://aaronfortuno.github.io/open-place-models/?model=eiffel-tower&variant=detailed).

Read [catalog.geojson](catalog.geojson) to find the models. Each feature has a stable `id`, a revision and the geographic footprint in WGS84 longitude and latitude. The `anchor` locates the origin of the GLB at ground level. The GLB uses metres with X east, Y up and Z south. Resolve the `mesh` path relative to the catalogue URL. The same revision path identifies the same file.

Source code is MIT licensed. Each model entry records its geometry licence, attribution and sources. The first model’s author contributions are CC BY 4.0. Its mapped footprint and placement derive from OpenStreetMap under ODbL 1.0. [MIT](LICENSE) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright)

Regenerate the pilot with `node scripts/generate-glories.mjs`.

See the [candidate queue](CANDIDATES.md) for places under consideration and the [contribution guide](CONTRIBUTING.md) for the catalogue format and validation steps.

## Gallery development and publishing

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm build` creates a standalone site in `dist/`. It stages the index, model thumbnails and all referenced GLBs. Use `pnpm preview` to check the production build locally. The site loads only the selected GLB and serves the viewer, index and models from the same origin.

GitHub Pages uses GitHub Actions as its publishing source. The workflow builds and deploys on pushes to `main` and can also be run manually. The repository paths for the catalogue and model revisions stay stable for Relleu Obert and other consumers. [Publishing workflow](.github/workflows/pages.yml)
