# Contributing a place

The catalogue is intended for maps and small physical models. Start with a single recognisable place. Record the scales at which its distinctive shape still reads and survives printing.

## Candidate research

1. Record a stable slug, names, country, approximate bounds and a geographic footprint. Identify which parts of the silhouette matter and what the general map sources currently provide.
2. Find verifiable dimensions, orientation and provenance. Prefer surveys, official dimensions and primary technical descriptions. A third-party mesh needs a licence that permits redistribution and the intended modifications. Record attribution for the geometry and the geographic data separately. Refer uncertain rights to a maintainer before modelling or importing.
3. Hand over a short candidate brief with links, expected footprint and height, target scales, licence notes and open questions. If replacement depends on provider identifiers, record the provider, IDs, date and evidence that those features represent the same structure. The researcher prepares the brief and leaves the revision and index edits to the modeller.

## Modelling and handoff

1. Make a closed printable solid at geographic scale. Put the model origin at the base anchor, use metres and orient X east, Y up and Z south. Simplify features smaller than a typical nozzle pass at the target scale. Save the source or regeneration script alongside the documented revision.
2. Export one GLB 2.0 scene with a single indexed triangle mesh, one primitive and baked vertex coordinates. Weld shared vertices and orient faces outward. Use Float32 positions and unsigned 16-bit or 32-bit indices. The Relleu Obert print loader expects direct, uncompressed geometry with no node transforms, textures, external resources or extensions. Aim for 20–30 kB for the default mesh when the silhouette allows it. Keep each GLB below 4 MiB. Add a detailed variant when it preserves useful features at closer scales.
3. Run a mesh audit for bounds, positive signed volume and closed topology. Check the shape at two scales and two map rotations, including a crop that cuts the model. In Relleu Obert confirm the base touches terrain, the model replaces its counterpart without hiding neighbours, and the height limit and hidden-building mode still apply. Export a 3MF for review.
4. Add the entry only after these checks pass. Document the geometry’s approximations, validation and licence in the revision README. Hand over the files and results for maintainer review. Publish a new revision path for any change to a released GLB.
5. Run `pnpm build` and check the model in the local gallery. Search for it, rotate and zoom it, and confirm the GLB and credits are accessible. The public gallery updates from the index on each deployment.

## Static index

The root `catalog.geojson` is a WGS84 GeoJSON FeatureCollection with `schemaVersion: 1`. Use a unique Feature `id`, a bounding box `[west, south, east, north]` and a Polygon or MultiPolygon footprint. The client looks up intersecting bounding boxes and only fetches meshes for the requested area.

The properties are `name`, `revision`, `anchor` as `[longitude, latitude]`, `height` in metres, `mesh` as a relative GLB path under `models/`, `license`, `attribution`, `sources` and the optional `spatialDataLicense` and `replacement`. The optional replacement lists contain verified `featureIds` and cadastral `families`. Relleu Obert also checks geographic overlap before replacing any footprint.

For the gallery, include `place` such as `Barcelona, Spain`, separate `city` and `country` fields for filtering, and `geometryType` as `building`, `monument`, `road` or `terrain`. Add `aliases` for alternative names. Set `thumbnail` to a small PNG, WebP or JPEG under `models/`, rendered from the default mesh. Use `byteLength` for the exact GLB size in bytes. The gallery build fills in omitted sizes and checks declared sizes against the files.

Render a 320 × 200 WebP beside a generated GLB with `python scripts/render-thumbnail.py models/<id>/<revision>/print.glb`. The offline script needs NumPy and Pillow. Use `--camera EAST UP SOUTH` to frame the feature that distinguishes the model at card size.

Use the top-level `mesh` and `revision` for the lightweight default. An optional `variants` array can add resolutions with `id`, `label`, `revision`, `mesh`, `byteLength` and their own credits where those differ. Variants share the entry’s footprint, anchor and height. The optional `maxScaleDenominator` is inclusive. A detailed variant with a value of `1500` is suggested at 1:1,000 and 1:1,500. The lightweight default applies at 1:2,000 and smaller map scales. A client choosing by scale should take the smallest applicable threshold and fall back to the default when none applies. The gallery lets readers select a resolution manually.

Serve the index and meshes from the same static directory. Keep the current index below 512 KiB. If the catalogue approaches that limit, agree on spatial partitioning with consumers before changing the schema. [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946) · [glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
