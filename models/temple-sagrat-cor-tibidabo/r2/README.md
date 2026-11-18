# Temple del Sagrat Cor del Tibidabo · r2

This revision reconstructs the temple's principal exterior forms beyond the municipal flat roof volumes used in r1. It retains an upright octagonal central belfry with separate radial ribs, four pointed corner towers, twelve simplified perimeter pinnacles and figures, the triangular front gable, three semicircular apses with sloping roofs, raised portal gablets and window surrounds, and two stepped flights within the crypt terrace. The wider crypt, western access recess and north-west annex retain their mapped positions. A compact original figure with open arms marks the summit.

The change prioritises recognisable architecture over the earlier 30 kB budget. The model remains an approximate exterior reconstruction: the photographs constrain the arrangement of façades and intermediate profiles, while survey data constrain plan and elevations. It does not reproduce the complete sculpture, window tracery, mosaics or interior rooms.

## Sources and placement

The source plan is the Ajuntament de Barcelona's 3D municipal cartography, product 146: **24 local roof parts** from `Barri_22_MTM_DWG.dwg`, released on 12 November 2026. The drawing is in ETRS89 / UTM31N, EPSG:25831, metres. The reduced fixture preserves source handles, polygons, original archive/drawing hashes and roof tiers. LibreDWG 0.14 supplied the intermediate conversion. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Neighbourhood 22 drawing](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.22.47)

The geographic anchor is **[2.1187514, 41.4220884]**. Coordinates are metres with X east, Y up and Z south. Y=0 is the buried foundation at **500 m EGM08D595**, supplied as `anchorElevation: 500`. The total height includes this foundation: the lowest mapped bases start at approximately 503 m and the hillside/terraces vary substantially around the complex.

The footprint combines OSM way `486759610`, bounded municipal geometry and the two RTT polygons verified in r1. Only **`icgc-1196281`**, **`icgc-1196284`** and **`osm-way-486759610`** are explicit replacements; the nearby small hermitage and amusement-park structures remain separate. [OSM building](https://www.openstreetmap.org/way/486759610) · [ICGC RTT layer](https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10)

The municipal front photograph provides a current reference for the portal/window hierarchy, gablets, tower proportions and perimeter figures. The custodians' architectural description and exterior photograph establish the octagonal crown and terrace arrangement; the diocesan description corroborates the crypt and monumental stairs. These references were used to reconstruct geometry; their photographs are linked rather than redistributed. [Municipal front photograph](https://tibidabo.cat/sites/default/files/paragraphs/page/2024-02/temple-%284%29.jpg) · [Custodians' architecture](https://tibidabo.salesianos.edu/architecture/) · [Custodians' exterior photograph](https://tibidabo.salesianos.edu/wp-content/uploads/2017/11/El-Tibidabo.jpg) · [Diocesan description](https://www.cataloniasacra.cat/temple-del-sagrat-cor-de-jesus-del-tibidabo/)

## Measured constraints and approximations

The retained **73 r1 point queries** are supplemented by **94 retained surface observations** from the ICGC 2021–2023, 1 m elevation service on 18 November 2026. Raw positions and values remain in `survey.json`. They constrain the upper terrace near **539.37 m ASL**, the front gable at **543.094 m**, perimeter remats around **547–548 m**, the four tower summits near **557.63–558.31 m**, the central pedestal at **568.853 m**, and the crowning figure's maximum sampled summit at **575.405 m**. Sampled raster elevations constrain broad geometry rather than individual sculptural details. [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

The central crown has an eight-sided vertical belfry, separate ribs and open space between them. The corner towers keep their municipal positions and measured tops. Apse plans follow the municipal outlines; their roof slopes are simplified radial lofts. The crypt's common buried plinth stops at 507 m, while visible terraces and annexes use their individual CAD heights.

Portal/window widths, recess depths, gablet profiles, intermediate rib slopes and statue proportions are visual approximations calibrated against those measured tiers. The main portal is recessed approximately **1.75 m** from its raised surround, and the principal window approximately **1.50 m**. These simplified depths and broad window divisions make an opaque printed façade legible; they are not measurements of the glazing or masonry thickness. Door and glazing planes are represented by recessed solid backs. The original small-scale railings, fine tracery and decorative sculpture remain omitted.

The two front stair flights use **24 representative treads each** between 507 and 518.536 m, inside the measured crypt envelope. The landings and overall rise are constrained; tread count, individual intermediate elevations and parapet sections are estimated. The western access recess from r1 remains open. Plan simplification is 0.18 m and solid simplification 0.075 m. Sealed internal pockets are filled because this model represents the exterior envelope; exterior recesses remain open.

## Geometry and review

The GLB is **121,128 bytes**, with **5,005 vertices and 10,046 triangles**. It contains one indexed mesh/primitive, baked metre coordinates and no transforms, compression, textures or external resources. Its bounds are approximately **71.72 × 75.40 × 68.14 m** in X/Y/Z. Raw audit finds one connected closed component, positive volume and no boundary, non-manifold or inconsistent-orientation edges. SHA-256 is recorded in `audit.json`.

The raw controls verify both western access columns remain clear between 515 and 518 m ASL, and a column between the crown ribs remains clear between 553 and 564 m ASL. The central belfry is present at 560 m, the front gable reaches its constrained summit, and both stair midpoints lie near 513.249 m. Horizontal façade rays independently verify the portal and window recess depths; their WGS84 segments accompany the audit for integration checks.

The [front](front-review.webp), [side](side-review.webp) and [rear](rear-review.webp) renders have been compared with the reference arrangement. The simple renderer has no cast shadows or ambient occlusion, so flat recess backs receive the same light as parallel outer walls; their existence is checked geometrically as well as visually. Final architectural likeness remains subject to the user's review. Slicing and physical printing remain with the user; slender figure arms and pinnacles can fall below a typical nozzle width at 1:2,500.

Local integration in Relleu Obert **0.24.12**, with ICGC MET5 terrain and RTT buildings, passed three cases on 18 November 2026:

| Case | Print size | Scale | Rotation | Report |
| --- | --- | --- | --- | --- |
| Complete | 140 × 140 mm | 1:1,000 | +12° | [Validation](complet-validation.json) |
| Wider context | 160 × 140 mm | 1:2,500 | −23° | [Validation](girat-validation.json) |
| Partial crop | 65 × 70 mm | 1:1,000 | −19° | [Validation](parcial-validation.json) |

All three air controls remain clear, and all four horizontal façade rays match the original GLB exactly in every crop. Both stair controls preserve the original surface and remain above terrain. Four foundation contacts pass in the full crops and two in the partial crop. The complete-case comparison removes only the two verified RTT counterparts and retains the other 14 source IDs. All material meshes are closed with no audit errors; the 5 m height limit and hidden-building controls also pass. [Review 3MF](complet-review.3mf)

The gallery build passes. Interactive gallery inspection remains pending after the browser-control interruption; the published website is checked manually by the user. The earlier r1 remains selectable in the gallery for comparison, while r2 is the default.

## Regeneration and reuse

Run `node scripts/generate-temple-sagrat-cor-tibidabo-r2.mjs` from the repository root. An optional filename writes the catalogue feature. The retained fixture is sufficient to regenerate the mesh without downloading the full drawing or querying elevations again.

Render the thumbnail with `python scripts/render-thumbnail.py models/temple-sagrat-cor-tibidabo/r2/print.glb --camera 0.80 0.55 1.20 --light 1 0.7 0.6`. Add `--size 1280 800 --output front-review.webp` for a separate comparison image. The published r1 files remain unchanged.

Code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry retain CC BY 4.0 attribution. OSM-derived registration and footprint retain ODbL 1.0 attribution. Third-party photographs remain under their respective owners' terms. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
