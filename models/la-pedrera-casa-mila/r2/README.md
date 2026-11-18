# La Pedrera · Casa Milà · r2

An original reconstruction with a changing stone façade, replacing r1's vertically repeated outline. The Passeig de Gràcia frontage, chamfer and Provença frontage now have floor-dependent projections, broad rounded cornice transitions and 124 recessed openings. These forms are part of the printable geometry. The roof, its principal structures and four courtyard/light-well openings retain the measured framework used in r1.

The default mesh is **395,144 bytes**, with **16,428 vertices and 32,868 triangles**. The larger size preserves defining façade surfaces. Fine balcony ironwork, individual stone blocks, carvings, window frames, glass, interiors and small decorative details are omitted.

## Sources and registration

The municipal and elevation sources are unchanged from [r1](../r1/README.md): 41 local roof parts from the Ajuntament de Barcelona's `Barri_07_MTM_DWG.dwg`, plus the retained ICGC LiDAR observations and roof controls. The drawing is ETRS89 / UTM 31N, EPSG:25831, in metres. The reduced fixture is sufficient for regeneration; the complete neighbourhood drawing is not redistributed. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Neighbourhood 07 download](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.07.47) · [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

OpenStreetMap relation `8974896`, outer way `124190212` and the municipal courtyard geometry constrain the plan. The street-facing source path has 262 observations. It is smoothed locally along the street while retaining its geographic position and main plan waves. The two principal courtyards and two small light wells remain open. [OSM building](https://www.openstreetmap.org/relation/8974896)

The anchor remains **[2.1618775, 41.3953994]** in longitude–latitude order. X is east, Y up and Z south; coordinates are metres. Y=0 is a buried foundation at **34 m EGM08D595**, supplied through `anchorElevation: 34`. The sampled street is approximately 37.5–39.1 m ASL. Bounds are approximately **64.02 × 43.57 × 52.84 m** in X/Y/Z, including the buried base.

## Façade interpretation and its limits

The current custodian's photograph fixes the visible opening rhythm, approximate floor positions and the relation between the two street fronts and chamfer. Its image coordinates are registered to five geographic path controls. Eighteen explicit stations describe varying projections along that path. The restoration elevation published by Rafael Vila Rodríguez supplies an independent check of the built opening and cornice arrangement; the Generalitat's heritage photographs show the other frontage. The historical 1906 design is contextual evidence only, because it contains unexecuted features. [Current custodian photograph](https://www.lapedrera.com/data/webp/la-pedrera-gaudi-44e2652facbd6a5f840cd90051ba83c4-b269eb0ef6cd0622cb8e35618f4c4b6b.webp) · [Restoration article, figure 13](https://informesdelaconstruccion.revistas.csic.es/index.php/informesdelaconstruccion/article/download/1431/1591/2039) · [Generalitat heritage file](https://calaix.gencat.cat/bitstream/handle/10687/116380/expdec77.pdf?isAllowed=y&sequence=1) · [Custodian's architectural description](https://www.lapedrera.com/es/casa-mila/arquitectura/)

These references do **not** provide surveyed XYZ sections of every floor. Floor heights, façade depths, cornice outsets and intermediate rounded profiles are a visual approximation registered to the measured plan and roof. They must not be interpreted as centimetre-accurate building measurements or a photogrammetric reconstruction. The station offsets are explicit, non-periodic estimates rather than a regular wave repeated across the façade.

Seven floor/cornice reference levels range from 40.4 to 65 m ASL. Their profiles change with height and along the frontage. Rounded cornice shoulders spread into the stone above and below the floor bands. Opening widths vary with the registered references; recessed panels have rounded corners and a 0.40 m reveal transition. The recesses represent the main opening relief in an opaque exterior solid rather than complete rooms or detailed glazing. Their unobserved depths are estimated.

Horizontal and vertical sampling adds stations at jambs, rounded corners, lintels and cornice transitions. Simplification tolerance is **0.05 m**. A trial at 0.035 m produced a 481,016-byte mesh; comparison of the two large renders retained the rounded façade while the final tolerance reduced file size by 17.9%.

The roof remains a faceted interpolation of 103 municipal/LiDAR controls, with six stair enclosures, two ventilation forms and 19 representative chimney crowns in measured groups. Their fine sculptural surfaces, detailed roof steps and balcony ironwork remain simplified. Reference photos and published drawings are not redistributed in this revision.

## Replacement and checks

The footprint is a replacement envelope enclosing the changing façade projections and a limited street-facing registration adjustment, while retaining the four interior holes. The two explicit OSM replacement IDs remain limited to Casa Milà. **Do not add `icgc-1518230` as an explicit replacement:** it represents a connected block containing neighbours. Relleu Obert **0.24.12 or later** subtracts the monument's area from that block without removing the adjacent buildings and clears the courtyard interiors.

RTT generalises the street outline and extends beyond some of the detailed frontage recesses. A comparison every 0.25 m along the registered frontage finds maximum outward differences of approximately 1.88 m on Passeig de Gràcia, 0.71 m at the chamfer and 1.82 m on Provença. Even a 4.3 cm residual strip in front of the replacement envelope was enough to obscure a façade control in regional validation. The envelope therefore includes only the nearby street-facing RTT fragments, bounded by the two party-wall planes. This adds approximately **28.55 m²** to the 1,510.70 m² envelope of the physical mesh, without extending the shared walls or filling the courtyards. The bounded fragments and registration method are retained in `survey.json`. This adjustment is a substitution mask for the generalised provider outline; it creates no physical masonry and does not move or deform the GLB.

The retained fragments overlap the original envelope by **0.05 m towards its interior**. This overlap is clipped to the original envelope, so it adds no further exterior area and prevents numerical edge-only joins from losing a small fragment. Regeneration checks that the selected final envelope covers every retained registration fragment within 0.000001 m² and matches its intended total area within 0.00001 m². The final replacement area is approximately **1,539.25 m²**, with all four courtyard/light-well holes preserved.

The raw GLB has one indexed mesh and primitive, baked metre coordinates and no transforms, textures, compression or external resources. Audit finds **one connected closed component**, positive signed volume and zero boundary, non-manifold or orientation-conflict edges. SHA-256: `e54b7e3bdd908e29a347231d8ccc7bf5f2978ce8aa7a0185a397e1dc1dbe35b1`.

The four courtyard/light-well columns are clear between 45 and 80 m ASL. Three roof controls retain 64.935, 65.360 and 66.147 m ASL. Four foundation columns reach the buried base. Six horizontal façade rays compare the cornice at 49 m ASL with the recessed window surface at 51.05 m, at representative stations on the three fronts. The final mesh changes outward offset by **1.36–1.55 m** between those heights. These are measurements of the synthetic mesh that demonstrate the lost vertical repetition has been removed; they are not surveyed real-building offsets. Geographic ray endpoints and all other controls are in [audit.json](audit.json).

[Front oblique review](front-review.webp) · [Other frontage review](side-review.webp)

Local integration in Relleu Obert **0.24.12**, with ICGC MET5 terrain and RTT buildings, passed three cases on 18 November 2026:

| Case | Print size | Scale | Rotation | Report |
| --- | --- | --- | --- | --- |
| Complete | 140 × 140 mm | 1:1,000 | +10° | [Validation](complet-validation.json) |
| Wider context | 160 × 140 mm | 1:2,500 | −23° | [Validation](girat-validation.json) |
| Partial crop | 65 × 65 mm | 1:1,000 | −19° | [Validation](parcial-validation.json) |

The four courtyard/light-well columns remain clear in every case. All six façade rays match the original GLB exactly in both complete cases; the partial crop retains the two Provença rays, also without a difference. Three low roof controls pass in complete cases and two in the partial crop. Four foundation contacts pass in complete cases and two in the partial crop. The complete-case comparison retains all three general building IDs, including the partially cut `icgc-1518230`, and removes none wholesale. All material meshes are closed with no audit errors; the 5 m height limit and hidden-building controls also pass. [Review 3MF](complet-review.3mf)

The local gallery build passes. Interactive gallery inspection remains pending after the browser-control interruption; the user checks the published website manually. The earlier r1 remains selectable for comparison, while r2 is the default. Reference comparison and mesh validity are separate from the user's approval of architectural likeness. Slicer and physical-print review remain with the user. At 1:2,500 some façade transitions and chimney shafts are smaller than a standard 0.4 mm nozzle pass.

## Regeneration and reuse

Run `node --max-old-space-size=512 scripts/generate-la-pedrera-casa-mila-r2.mjs <optional-feature-output.json>` from the repository root. Render the gallery thumbnail with `python scripts/render-thumbnail.py models/la-pedrera-casa-mila/r2/print.glb --camera 0.85 0.50 1.20`. The separate review views use `--size 1280 800 --output <review.webp>`; the second direction is `-0.15 0.48 1.45`.

The modelling code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry retain CC BY 4.0 attribution. The OSM-derived plan and geographic registration retain ODbL 1.0 attribution. The façade is an original approximation informed by factual reference geometry, with the uncertainty described above. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
