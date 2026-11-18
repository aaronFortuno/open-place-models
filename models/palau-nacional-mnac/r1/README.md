# Palau Nacional · MNAC · r1

An original simplified reconstruction of the Palau Nacional in Barcelona. The model retains the central dome and lantern, two smaller side cupolas, four towers, the pitched wing roofs and the broad curved roof of the Saló Oval. The two narrow garden courts remain open through the footprint; the larger wing courts are recessed above the lower building body. The monumental outdoor stairways and neighbouring exhibition buildings are outside this revision.

## Source geometry and registration

The starting geometry is the Ajuntament de Barcelona's municipal 3D cartography, product 146, Poble-sec release dated **12 November 2026**. `Barri_11_MTM_DWG.dwg` supplies the plan and flat roof tiers in ETRS89 / UTM 31N, EPSG:25831. A bounded extraction retained 96 municipal objects overlapping the palace. The source identifiers and reduced polygon coordinates are retained in `survey.json`; the original neighbourhood drawing is not redistributed. [Municipal product and licence](https://portaldades.ajuntament.barcelona.cat/mapes/146) · [Poble-sec download](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.11.47)

The footprint and the two garden openings follow OpenStreetMap relation `21195792`, whose outer ring is way `43995751`. The central origin is **[2.1535, 41.3684]** in longitude–latitude order. Local coordinates use metres with X east, Y up and Z south. `anchorElevation: 72` places Y=0 at **72 m EGM08D595**. This common foundation is buried beneath the measured ground, which varies from approximately 74 to 81 m around the building. The model retains the existing terrain slope. [Mapped palace](https://www.openstreetmap.org/relation/21195792)

The source archive SHA-256 is `9a5bb19681d2203329bd5211fe3cf301d9131db277c5ac1ff0a0c0cb05635155`. The extracted drawing SHA-256 is `4296455bdd41020864d489ea14ec1ebedb64cb756f4c835fedc2a0ac36fe3ca0`. LibreDWG 0.14 supplied the intermediate JSON conversion. The fixture contains the bounded result needed to reproduce the model without downloading or converting the full drawing again.

## Roof measurements and approximations

The ICGC 2021–2023 LiDAR surface and terrain layers supplied **108 point samples** on 18 November 2026. Radial sections define the central dome and the side cupolas; transverse and longitudinal sections constrain the Saló Oval and the wing roof ridges. The central finial sample is **149.55 m above sea level**, the four tower tops are approximately **138.79–140.06 m**, and the side cupolas reach **123.12–123.63 m**. The two larger wing courts have measured floors near **89.06 and 89.71 m**, below their surrounding roofs. Individual tower shoulders retain their measured differences. [ICGC elevation service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial) · [Museum building description](https://www.museunacional.cat/ca/ledifici)

The original CAD describes flat tiers, so the sloping and curved roofs are synthetic surfaces fitted between the sampled heights. The tower hood transitions, side cupola profiles and connections between roof tiers are approximations. The Saló Oval retains the measured outer and raised inner roof outlines, connected by a few broad planar slopes and a shallow curved cap. Its changes in slope remain visible in this lightweight reconstruction. The dome uses 12 radial segments, the secondary rotational roofs use 8, and the Saló Oval uses 16 radial stations. Minor plan projections are simplified with a 1 m tolerance and the united solid with a 0.8 m tolerance. Roof caps below 75 m² are omitted unless they belong to one of the explicitly retained main features. Ordinary flat roof elevations are rounded to 0.5 m. One sealed internal pocket of approximately 0.049 m³ created by simplification is filled; it has no exterior opening.

Façade sculpture, window and arcade openings, balustrades, cornice mouldings, roof railings and stone detail are omitted. The tower and lantern finials are widened closed tips. At 1:3,000 some tips are still narrower than a standard 0.4 mm nozzle pass; their appearance depends on the slicer and printer.

## Reproduction and validation

Run `node scripts/generate-palau-nacional-mnac.mjs` from the repository root. An optional output filename writes the catalogue feature. Render the card with `python scripts/render-thumbnail.py models/palau-nacional-mnac/r1/print.glb --camera -0.85 0.70 -1.15`.

The GLB is **36,020 bytes**, with **1,462 vertices and 2,948 triangles**. Its bounding dimensions are approximately **170.49 × 77.55 × 172.75 m** in X/Y/Z. This is slightly above the general 20–30 kB target to retain the separate towers, roof tiers and courtyard openings. The raw indexed audit reports one connected closed component, positive volume and no boundary, non-manifold or inconsistently oriented edges. Vertical rays through the two garden courts are clear between 95 and 150 m above sea level. These controls and SHA-256 `bf83f08d09beca89f95a95abd499de343763d3e03b727ed872c1e467a7e89f87` are recorded in `audit.json`.

Local integration checks on 18 November 2026 used Relleu Obert 0.23.46, freshly downloaded ICGC MET5 terrain and ICGC RTT buildings:

| Case | Printed area | Scale | Rotation | Result |
| --- | --- | --- | --- | --- |
| Complete palace | 200 × 180 mm | 1:1,500 | 10° | Passed |
| Wider surroundings | 160 × 130 mm | 1:3,000 | −14° | Passed |
| Partial crop | 120 × 100 mm | 1:1,000 | 19° | Passed |

The complete and wider cases check solid contact with the actual terrain at four foundation points, and confirm that both narrow garden courts remain open. Every exported material part has closed topology and no audit errors. All three cases pass the 5 m height limit and hidden-building controls. A comparison against the same complete region without the catalogue model confirms that only `icgc-1175890` is replaced and all nine other source identifiers remain. That ICGC footprint has 95.43% area overlap with the mapped palace; all seven other ICGC features fetched for the region have zero overlap. The verified identifier is included alongside the OSM replacement identities.

The three `*-validation.json` reports record the controls. `complet-review.3mf` provides the 1:1,500 regional result for review. The local gallery build passes; interactive gallery review could not be completed because browser control stopped when it could not identify the current browser URL. Gallery appearance, slicer behaviour and physical printing remain for user review.

## Reuse

The modelling code uses the repository's MIT licence. The original reconstruction and municipal/ICGC-derived geometry are attributed under CC BY 4.0. OpenStreetMap-derived footprint and registration retain ODbL 1.0 attribution. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) · [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
