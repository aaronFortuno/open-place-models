# Palau de la Música Catalana · r1

An original reconstruction of Barcelona's Palau de la Música Catalana: the historic concert hall, its attached western annex and the above-ground Petit Palau building. The short front's curved crest, corner tower and open crown distinguish the old hall. Recessed arches and window bays follow the two built elevations. Measured roof tiers retain the main plane, higher exterior skylight and curved rear volumes. The central plaza/access recess stays open.

The GLB is **83,836 bytes**, with **3,426 vertices and 6,992 triangles**. It contains two closed physical components: the main hall with its annex, and the separate Petit Palau volume. They share one georeferenced mesh without an invented visible connecting plinth. The underlying terrain joins their foundations in a regional print.

## Survey framework and sources

The Ajuntament de Barcelona's municipal 3D product 146 supplies **14 selected roof/building parts** from `Barri_04_MTM_DWG.dwg`, dated **12 November 2026**. The drawing is ETRS89 / UTM 31N, EPSG:25831, in metres. LibreDWG 0.14 supplied the intermediate conversion. Extraction streams individual MESH records from the large neighbourhood file; the retained fixture contains only the local parts, their handles and geometry. The complete source drawing is not redistributed. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Neighbourhood 04 download](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.04.47)

The source archive SHA-256 is `ea6bef62f108b207ec40e3c58ab9f3acb444064b38dba98d88deaf0b61e0b54b`; the drawing hash is recorded in `survey.json`. Ten parts belong to the historic hall, two to the annex and two to Petit Palau. Two other candidates remain excluded: `17711F` extends through the western glazed-front area beyond the mapped physical footprints, and `179889` is mostly outside the complex and unconfirmed by the sampled current surface. The former's physical wall/roof and access-space treatment needs further section review before it is included.

OpenStreetMap ways `671830491`, `671830503` and `671830480` identify the three physical buildings independently. The named theatre way `377216661` is an institution boundary and is not treated as an extra solid. [Historic building](https://www.openstreetmap.org/way/671830491) · [Annex](https://www.openstreetmap.org/way/671830503) · [Petit Palau](https://www.openstreetmap.org/way/671830480)

The model anchor is **[2.17521985, 41.3875838]**, longitude–latitude order, derived from the combined physical footprint's bounding box. The corresponding UTM origin is approximately [431042.349, 4582112.151]. Municipal coordinates first transform to WGS84, then to the same local frame as the mapped features: X east, Y up and Z south. Y=0 is a buried foundation at **8 m EGM08D595**, supplied with `anchorElevation: 8`. Foundations follow only the individual building parts; there is no slab across the plaza.

## Heights and characteristic profiles

**44 ICGC GetFeatureInfo queries** sample the 2021–2023 LiDAR surface and terrain layers in the EGM08D595 orthometric datum. Street terrain controls range from approximately **9.93 to 11.44 m ASL**. Unobstructed points on the main roof range from 34.14 to 34.63 m; the model retains the municipal main tier at **34.416 m**. The raised exterior skylight is **37.661 m**, consistent with surface controls around 37.69–37.75 m. A high observation at the large body polygon's centroid falls under that skylight and is not used to raise the entire hall. [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

The front crest reaches **37.205 m ASL**. Its rounded profile is an original semielliptical approximation constrained by the municipal part's plan, the sampled top and the built front elevation. The tower's sampled maximum is approximately 39.94 m and the municipal top is 39.997 m; the simplified crown reaches **40 m ASL**. Its lower cylinder, collar and open upper cage are separated rather than represented by a solid cone. The thin metal cage is simplified and thickened to an eight-rib silhouette. Intermediate profiles and rib thickness are modelling estimates.

The custodian's façade-restoration drawings provide the short front, section and long side elevation, with a graphic scale. Their March 2019 drawing footer and PDF pages 13–14 are the primary visual controls. The central long-side arches rise above the narrower end bays, and the balcony bands remain separate from the roof. **42 recessed panels** represent the principal arches and windows; their widths, floor levels and approximate depth are calibrated visually against those drawings and the current custodian photograph. They are not surveyed XYZ façade sections. Windows retain a solid backing, with a nominal **0.72 m** recess. [Built elevations and sections](https://www.palaumusica.cat/proyecto-tecnico-fachadas-palau-de-la-musica_722971.pdf) · [Custodian's architectural account](https://www.palaumusica.cat/es/la-historia-del-palau_1671659)

The famous inverted stained-glass dome belongs to the **interior** of the concert hall. No exterior dome is invented from it. The external roof instead follows the measured planar tiers and raised skylight. Façade mosaics, individual balusters, glazing, stone carvings, the detailed corner sculpture and interior rooms are omitted. Reference photographs and complete technical drawings are not redistributed.

## Replacement and raw checks

The geographic footprint encloses the measured parts and their projecting balcony/crown envelope. RTT `icgc-638945` groups the Palau with neighbouring buildings: the three mapped physical buildings cover only about **43.1%** of that block while the block covers approximately **94.9%** of the target outlines. It is deliberately absent from explicit replacement IDs. Relleu Obert **0.24.12 or later** handles partial replacement while retaining the neighbours.

A bounded registration adjustment adds approximately **0.240 m²** of nearby RTT fragments along the historic street façades. Known neighbouring OSM footprints are excluded from those additions. A 0.05 m overlap, clipped to the physical envelope's interior, prevents numerical edge-only joins. The generator checks retained-fragment coverage and the expected envelope area. This mask adjustment does not change the physical GLB or fill the plaza. The three verified OSM building ways are the only explicit replacement identities.

The exported GLB has one indexed triangle mesh and primitive, baked metre coordinates and no transforms, textures, compression or external resources. Bounds are approximately **70.39 × 32.00 × 68.21 m** in X/Y/Z, including the buried foundations. Raw audit confirms two closed components, positive signed volume and no boundary, non-manifold or orientation-conflict edges. SHA-256: `f89116bb85e1e58d18978e6ce55df60b2de002e0d6bed7c745cae9b79fc2452f`.

Four foundation columns reach the buried base. Two plaza columns are clear between 12 and 42 m ASL, and the centre of the corner cage remains open from 35.4 to 39 m. Six roof controls preserve the main roof, skylight, front crest, tower top, annex and Petit Palau heights. Six horizontal façade rays verify the recessed front and side panels; geographic endpoints are recorded in [audit.json](audit.json).

Local integration in Relleu Obert **0.24.12**, with ICGC MET5 terrain and RTT buildings, passed three cases on 18 November 2026:

| Case | Print size | Scale | Rotation | Report |
| --- | --- | --- | --- | --- |
| Complete | 140 × 140 mm | 1:1,000 | +10° | [Validation](complet-validation.json) |
| Wider context | 160 × 140 mm | 1:2,500 | −23° | [Validation](girat-validation.json) |
| Partial crop | 65 × 65 mm | 1:1,000 | −19° | [Validation](parcial-validation.json) |

The complete cases retain four foundation contacts, all three air controls, six roof columns and six façade rays. The partial crop retains three contacts, both plaza air controls, four roof columns and five façade rays; the tower control is outside that crop. All roof and façade comparisons match the original GLB exactly. The complete-case comparison retains all 11 general source IDs, including the partially cut `icgc-638945`, and removes none wholesale. All material meshes are closed with no audit errors; the 5 m height limit and hidden-building controls also pass. [Review 3MF](complet-review.3mf)

The local gallery build passes. Interactive gallery inspection remains pending after the browser-control interruption; the user checks the published website manually.

[Front oblique review](front-review.webp) · [Long side review](side-review.webp)

These local reference comparisons and geometry checks are separate from the user's approval of likeness, slicer review and physical-print validation. The cage ribs are approximately 0.32 m thick: 0.32 mm at 1:1,000 and 0.13 mm at 1:2,500. At smaller map scales, those ribs and some façade details may be below the nozzle's useful resolution.

## Regeneration and reuse

Run `node --max-old-space-size=512 scripts/generate-palau-musica-catalana.mjs <optional-feature-output.json>`. The reduced `survey.json` retains all geometry and source measurements required for regeneration. Render the thumbnail with `python scripts/render-thumbnail.py models/palau-musica-catalana/r1/print.glb --camera 1 0.5 0.20 --light 1 1 0.3`. Review views use `--size 1280 800 --output <review.webp>`; the side camera is `1 0.5 -0.85`, with light `1 1 -1`.

The modelling code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry are attributed under CC BY 4.0. The OSM-derived registration and physical outlines retain ODbL 1.0 attribution. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
