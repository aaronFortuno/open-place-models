# La Pedrera · Casa Milà · r1

An original lightweight reconstruction of Casa Milà in Barcelona. The mapped façade waves, two large courtyards, two smaller service light wells and uneven roof terrace distinguish the model from a flat extrusion. The roof retains six stair enclosures, two smaller service crowns and representative chimney groups at measured locations. Window openings, balcony ironwork, individual rooftop steps, tile patterns, sculptural faces and fine façade relief are omitted.

## Sources and registration

The Ajuntament de Barcelona's municipal 3D cartography, product 146, supplies **41 local roof parts** from `Barri_07_MTM_DWG.dwg`, released on **12 November 2026**. The drawing uses ETRS89 / UTM 31N, EPSG:25831, in metres. LibreDWG 0.14 supplied an intermediate JSON conversion; the bounded extraction retains source handles and reduced polygons in `survey.json`. The complete neighbourhood drawing is not redistributed. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Neighbourhood 07 download](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.07.47)

OpenStreetMap relation `8974896` provides the exterior plan, including its detailed curved façade outline. Its outer way is `124190212`; the two mapped courtyard ways are `646020449` and `646020462`. The final footprint retains that exterior and the courtyard/light-well outlines measured in the municipal upper-roof geometry. The smaller wells are open in the current LiDAR observations, so the older CAD floor caps at 43.5 m are omitted. [OSM building](https://www.openstreetmap.org/relation/8974896)

The anchor is **[2.1618775, 41.3953994]** in longitude–latitude order. Coordinates use metres with X east, Y up and Z south. Y=0 is a buried foundation at **34 m EGM08D595**, placed through `anchorElevation: 34`. The sampled street elevations are approximately 37.5–39.1 m, and the main courtyard floors are approximately 36.4–36.9 m. The lower anchor preserves those levels without flattening the neighbouring streets.

The source archive SHA-256 is `5b880a757af6e285dfeeba368ad89080a768d31093e93b2ce538b1c0a0f7eae4`. The individual drawing hash is retained in the fixture with the conversion method and date.

## Roof and chimney reconstruction

ICGC 2021–2023 LiDAR surface and terrain layers supplied **114 general point queries** plus **423 queries in six bounded roof sectors** on 18 November 2026. The six tall municipal roof parts identify the stair enclosures independently of the chimney search. Their sampled tops are approximately **76.69–77.57 m above sea level**. All retained query locations and results remain in the source fixture. [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

The terrace is a continuous faceted surface fitted to 103 controls: observed lower roof samples and recorded or derived base levels for the roof structures. Interpolation uses the nearest six controls, and the triangulation retains explicit low-point samples. The intermediate slopes are an approximation of the walkable roof rather than a detailed survey of every stair or parapet. Interior triangle diagonals are improved while keeping the boundary and controls fixed. The final contour tolerance is 0.40 m and solid simplification tolerance is 0.20 m.

The operator describes six stair enclosures, two ventilation structures and 29 individual chimneys. This default model simplifies those chimneys to **19 representative crowns in six measured groups**. Candidate positions come from elevated LiDAR returns inside the six municipal roof sectors, with the stair enclosures excluded. Nearby returns are reduced deterministically to distinct peaks; none are placed randomly. The individual chimneys and their exact grouping are therefore not reproduced one for one. Six tapered stair forms follow the municipal outlines and measured tops. Two smaller service crowns use simple ventilation profiles, with their base levels estimated from the nominal five-metre height. Their intermediate cross-sections and the chimney shoulders are synthetic. [Custodian's architectural description](https://www.lapedrera.com/es/casa-mila/arquitectura/)

The façade's horizontal plan waves are retained. Fine balcony projections, openings and changes between individual floor bands are simplified into the solid exterior. Sealed interior pockets resulting from the roof unions are filled; the four exterior light wells remain open.

## Replacement and review

The RTT identifier `icgc-1518230` covering this block is deliberately **absent** from explicit replacement IDs because that object also contains neighbouring buildings. It covers 99.43% of Casa Milà, while the monument occupies only 12.38% of the source polygon. The listed OSM relation and outer way identify only Casa Milà. **Relleu Obert 0.24.12 or later is needed** to subtract the model area from this aggregated footprint while retaining neighbouring geometry and clearing the courtyard interiors. The previous version reproduces a blocked courtyard with the same inputs.

The GLB is **29,564 bytes**, with **1,196 vertices and 2,404 triangles**. It has one indexed mesh and primitive, baked metre coordinates and no transforms, compression, textures or external resources. Its bounding dimensions are approximately **64.55 × 43.57 × 52.39 m** in X/Y/Z, including the buried foundation. Raw audit reports one connected closed component, positive volume and no boundary, non-manifold or inconsistent-orientation edges.

Vertical rays through both principal courts and both small wells remain clear from 45 to 80 m above sea level. Three low roof controls retain 64.935, 65.360 and 66.147 m, and four foundation controls lie inside the mapped solid. `audit.json` records their geographic positions and SHA-256 `15da3230f4726ea6fb3098c575593d476ba831a69dfeccb308001c41d47b7a66`.

Local integration in Relleu Obert **0.24.12**, with ICGC MET5 terrain and RTT buildings, passed these three cases on 18 November 2026:

| Case | Print size | Scale | Rotation | Report |
| --- | --- | --- | --- | --- |
| Complete | 140 × 140 mm | 1:1,000 | +10° | [Validation](complet-validation.json) |
| Wider context | 160 × 140 mm | 1:2,500 | −23° | [Validation](girat-validation.json) |
| Partial crop | 65 × 65 mm | 1:1,000 | −19° | [Validation](parcial-validation.json) |

All four courtyard/light-well rays remain clear between 45 and 80 m ASL in all three cases. Three low roof controls match the original GLB exactly in the complete and wider cases; the partial crop retains two. Four foundation contacts pass in the complete cases and two in the partial crop. The complete-case comparison retains all three general building IDs, including the partially cut `icgc-1518230`, and removes none wholesale. Every material mesh is closed, with no audit errors. The 5 m height limit and hidden-building controls also pass. [Review 3MF](complet-review.3mf)

The local gallery build passes. Interactive gallery inspection remains pending because browser control stopped when it could not determine the current URL safely; this is not a claim of visual approval. At 1:2,500 some chimney shafts are below a typical 0.4 mm nozzle pass. Slicer and physical-print checks remain with the user.

## Regeneration and reuse

Run `node scripts/generate-la-pedrera-casa-mila.mjs` from the repository root. An optional output filename writes the catalogue feature. Render the thumbnail with `python scripts/render-thumbnail.py models/la-pedrera-casa-mila/r1/print.glb --camera 0.85 1.10 1.20`. The retained fixture is sufficient to regenerate the geometry without downloading the full city drawing or querying the elevation service again.

The modelling code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry are attributed under CC BY 4.0. OSM-derived footprint and registration retain ODbL 1.0 attribution. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
