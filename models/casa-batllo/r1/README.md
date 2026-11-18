# Casa Batlló · r1

An original exterior reconstruction of Casa Batlló in Barcelona. It retains the curved principal-floor tribune, broad recessed openings and bone-like columns, eight representative mask balconies and the upper tulip-shaped balcony, the two unequal curved roof crowns, the tower with its four-arm cross, four chimney groups, two covered light wells and the raised rear patio. The roof's curved front profile continues the façade coronament; its higher ridge remains behind that front profile.

The reconstruction prioritises these characteristic forms over a 30 kB file budget. Façade depths, intermediate roof slopes, balcony sections and individual ornaments remain approximations calibrated against references. Fine ceramic scales, colour patterns, ironwork, glazing details, interior rooms and complete sculptural detail are omitted.

## Source geometry and registration

The Ajuntament de Barcelona's municipal 3D cartography, product **146.07.47**, supplies nine bounded roof parts from `Barri_07_MTM_DWG.dwg` in ETRS89 / UTM31N, EPSG:25831. `survey.json` retains their handles, base/roof levels, reduced polygons and the source archive SHA-256. LibreDWG 0.14 supplied the intermediate conversion. The large neighbourhood drawing is not redistributed. These polygons constrain plan and tiers; they do not provide a full façade survey. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Neighbourhood 07 source](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.07.47)

OpenStreetMap relation **9427554**, outer way **679019065**, supplies the initial exterior registration. Its two inner ways, `679019233` and `679019240`, correspond to the light wells. They are covered in the building and represented by opaque roof surfaces here, so the catalogue footprint includes their areas. The final envelope also includes the façade projections; the model's lower footprint and roof levels are distinct from those projected forms. [OSM building](https://www.openstreetmap.org/relation/9427554)

The anchor is **[2.16476135, 41.39154105]** in longitude–latitude order. Coordinates are metres with X east, Y up and Z south. Y=0 is a buried foundation at **26 m EGM08D595**, supplied through `anchorElevation: 26`. Sampled surrounding terrain is approximately 28.58–29.34 m, so the origin is below street level. The model's total height includes that foundation.

The general RTT object **`icgc-1200192`** contains the entire connected block: it covers approximately 99.41% of the initial monument footprint, but that footprint occupies only 5.44% of the source block. It is deliberately absent from explicit replacement IDs. Only the OSM relation and exterior way identify this building alone. Relleu Obert **0.24.12 or later** is needed to subtract the catalogue envelope from the grouped block while retaining neighbouring buildings.

## Heights and exterior references

The fixture preserves **141 original elevation queries** plus **27 additional front-to-roof transect samples**, retrieved from ICGC's 2021–2023 elevation layers on 18 November 2026. They distinguish the terrace, covered light wells, roof ridge and forward crest. The first light-well cover is at approximately **54.242 m ASL** and the second at **55.400 m**. The principal municipal roof tier is **54.949 m**, the rear upper tier **53.219 m**, and the rear patio deck **33.362 m**. Higher vegetation or objects above that patio are not turned into a continuous roof. [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

At the centre of the main roof, the sampled ridge reaches **61.028 m** near local depth b=22 m. The forward section is lower and curved: **57.721 m** near b=24–24.5 m, then approximately 55.546 m at b=25 m. The roof therefore falls from its ridge to a separate front profile, rather than returning to a uniform flat terrace at the façade. The smaller companion roof follows its municipal plan with a sampled maximum near **57.857 m**. Interpolation between these sections is a synthetic smooth surface. The highest sampled cross control is **61.461 m** and the highest retained chimney observation **61.858 m**.

The custodian's current photographs establish the curved tribune, mask balcony forms, roof crowns, cross and chimney cap arrangement. A frontal photograph by **Adolf Mas Ginestà**, presented by the COAC archive, constrains the opening and balcony hierarchy. The main façade width of approximately 14.65 m and measured ground/roof tiers calibrate the photographic proportions. The retained sources supply geometric facts; their photographs are linked rather than redistributed. [Custodian's façade description](https://www.casabatllo.es/antoni-gaudi/casa-batllo/fachada/) · [Current façade details](https://www.casabatllo.es/wp-content/uploads/2025/06/Web_Facana-1.jpg) · [Tribune](https://www.casabatllo.es/wp-content/uploads/2025/06/Web_Facana-2.jpg) · [Roof and cross](https://www.casabatllo.es/wp-content/uploads/2025/06/Web_Facana-3.jpg) · [COAC architectural record](https://www.arquitecturacatalana.cat/es/obras/casa-batllo)

The glazed light wells are represented with solid covers at their observed elevations, including a simplified frame around the second cover. The rear patio remains open above its raised deck. The four chimney groups are registered to elevated returns and represented by four shafts each, with flared feet, sinuous stems, conical caps and small top balls. Their exact pipe counts and intermediate sections are simplified. [Custodian's interior and roof description](https://www.casabatllo.es/antoni-gaudi/casa-batllo/interior/) · [Roof photograph](https://www.casabatllo.es/wp-content/uploads/2025/06/Web_Interior_7.jpg)

Window recess depths, storey transitions, mask eye openings, mullions, balcony bowls and the four-arm cross are original simplified geometry. The photograph does not establish complete XYZ façade profiles, so those depths are not presented as new measured data. The exposed rear wall uses broad representative openings; its decorative ironwork, planting and fine glazed surfaces are omitted. Plan simplification is 0.10 m and solid simplification 0.055 m.

## Geometry and validation

The GLB is **170,904 bytes**, with **7,055 vertices and 14,242 triangles**. It has one indexed mesh/primitive, baked metre coordinates and no transforms, compression, textures or external resources. Bounds are approximately **45.04 × 35.86 × 45.27 m** in X/Y/Z, including the buried foundation. Raw audit finds one connected closed component, positive volume and no boundary, non-manifold or inconsistent-orientation edges. Its SHA-256 is `f0a63dab723c69866e3b14afb1487c8c7a64aa134aa3886bf59dc076e628fdcc`.

`audit.json` includes four foundation contacts, six roof/deck columns and four horizontal façade rays. The latter distinguish the projecting tribune columns from its recessed windows, and a regular upper window from its jamb. The two covered light-well controls reach their observed roof levels. The generated main ridge is within approximately 0.02 m of the retained control, while the curved front is within 0.001 m at the interior test point. WGS84 segments are retained for the regional integration checks.

The [frontal](front-review.webp), [side](side-review.webp) and [rear](rear-review.webp) renders have been compared with the reference arrangement. The frontal view uses a low viewing angle to distinguish the façade roofline from rooftop structures farther behind it. The renderer has no cast shadows or ambient occlusion, so flat recess backs can appear similar to parallel outer walls; their depth is also verified geometrically. Final visual likeness remains subject to the user's review. Slicing and physical printing remain with the user; small mask openings and slender columns may be below a typical nozzle pass at 1:2,500.

Local integration in Relleu Obert **0.24.12**, with ICGC MET5 terrain and RTT buildings, passed three cases on 18 November 2026:

| Case | Print size | Scale | Rotation | Report |
| --- | --- | --- | --- | --- |
| Complete | 140 × 140 mm | 1:1,000 | +10° | [Validation](complet-validation.json) |
| Wider context | 160 × 140 mm | 1:2,500 | −23° | [Validation](girat-validation.json) |
| Partial crop | 55 × 60 mm | 1:1,000 | −19° | [Validation](parcial-validation.json) |

All four façade rays match the original GLB exactly in every case. Six roof/deck columns pass in complete crops and five in the partial crop, including both covered light wells. Four foundation contacts pass in complete crops and three in the partial crop. The integrated ridge control is approximately 60.980 m ASL, within 0.05 m of the retained 61.028 m raster observation; the curved front remains at approximately 57.720 m. The complete-case comparison retains all four general source IDs, including the partially cut `icgc-1200192`, and removes none wholesale. All material meshes are closed with no audit errors; the 5 m height limit and hidden-building controls also pass. [Review 3MF](complet-review.3mf)

The local gallery build passes. Interactive gallery inspection remains pending after the browser-control interruption; the user checks the published website manually.

## Regeneration and reuse

Run `node scripts/generate-casa-batllo.mjs` from the repository root. An optional output filename writes the catalogue feature. The retained fixture regenerates the geometry without downloading the large neighbourhood source or querying elevations again.

Render the thumbnail with `python scripts/render-thumbnail.py models/casa-batllo/r1/print.glb --camera 0.85 0.30 -1.10 --light 0.15 0.5 -1`. Add `--size 1280 800 --output front-review.webp --camera 1 0.08 -1` for a separate frontal comparison image.

Code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry retain CC BY 4.0 attribution. OSM-derived placement and footprint retain ODbL 1.0 attribution. Linked third-party photographs remain under their owners' terms. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
