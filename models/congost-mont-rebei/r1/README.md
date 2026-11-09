# Congost de Mont-rebei · r1

This revision shows about 40 m of the Camí nou on the Catalan bank of the Noguera Ribagorçana, north of the Cova Colomera branch. The model cuts the walking ledge and continuous rock overhang into the west-facing limestone wall. Its endpoints taper into the cliff. The gallery isolates this stretch of wall. The historical lower path, handrail, bench and Montfalcó stairs are outside its scope. [Official Camí nou itinerary](https://fundaciocatalunya-lapedrera.com/ca/espais-natura/congost-mont-rebei/itineraris) · [Geological inventory](https://mediambient.repositori.gencat.cat/handle/20.500.14343/2295) · [View of the ledge from the north, Oriol Sastre](https://commons.wikimedia.org/wiki/File:Congost_de_Mont-rebei_20201110_05.jpg)

## Georeferencing and shape

The centre is `[0.68174979514, 42.07957531998]` in WGS84, or `[308242, 4661212]` in ETRS89 / UTM 31N. The main shelf runs from northing 4661192 to 4661232 and follows the wall near the alignment shared by the Fundació’s route and OpenStreetMap way `198762251` version 6. The photographed shelf informed the cross section. The older path follows a separate line closer to the river. A third track shows substantial horizontal and vertical drift under the wall, so its figures are used only for the published 1–1.5 m walking width. [Fundació route map](https://www.google.com/maps/d/viewer?mid=1EhOWyFnJQj6Cd-sGpsMurLioSoHG6sGL) · [OSM Camí nou](https://www.openstreetmap.org/way/198762251) · [Field route and width](https://www.rutespirineus.cat/rutes/congost-de-mont-rebei/)

The exterior uses the ICGC 2021–23 terrain model at 0.5 m, checked against the 1 m surface model and the 2025 orthophoto. At each cross section, the cutter starts on the river side of the terrain break and extends approximately 1.5 m into the rock from the modelled floor edge. The floor follows the terrain break and the official route elevations. Its fitted range is 534.62–537.10 m EGM08D595. Roof clearance of about 2.4–2.7 m and the bevels at the back are estimates from the photographs. The surface raster alone records the upper surface of the cliff. The original cutter supplies the recess, including the floor and underside of the roof. [ICGC 0.5 m DTM](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat) · [ICGC 1 m DSM](https://catalegs.ide.cat/geonetwork/hub-litoral/api/records/model-superficies-lidar-catalunya-1m-2021-2023) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial)

The cutter starts above 534 m. In the same ICGC terrain capture, samples in the river channel are around 476 m, about 59 m below the central walking surface. The sidecar supplies a 63 × 63 m terrain patch, which includes part of the channel, while the preview GLB shows a 24 × 24 m section of the Catalan wall trimmed at 550 m. The elevations and independently modelled geometry are CC BY 4.0, with attribution to the ICGC and Open Place Models contributors. The route and images are reference sources.

## Validation and reproduction

The gallery mesh has 1,716 triangles and occupies 21,344 bytes. Its generator checks that three approaches reach the ledge and that the roof, floor and back survive at each section. The independent solid audit found one connected component with zero boundary or inconsistent edges. The estimated clearance width of 1.35 m corresponds to 2.25 mm at 1:600, 1.125 mm at 1:1,200 and 0.56 mm at 1:2,400. The latter falls below the Relleu Obert 0.8 mm threshold. A physical print can be used to check support beneath the overhang.

Relleu Obert passed the following local Landscape selections using the ICGC MET5 terrain and OpenFreeMap vectors.

- The full selections at 1:600 and at 1:1,200 rotated 22° passed the solid audit. At each of the three sections, a ray entered the ledge and the other rays hit the floor, roof and back.
- A partial selection at 1:1,000 rotated −15° cut through the trail segment. The remaining two sections passed the same ray checks and the resulting solids were closed.
- At 1:600 the water mesh of the Noguera Ribagorçana had 20,296 triangles. Its vertex and index buffers were byte-identical to a control using the same elevation patch with the cutter moved above the terrain. The highest point of that water mesh was 506.69 m.
- At 1:2,400 the engine omitted the cutter because the estimated clearance was below 0.8 mm.

To regenerate the model and write a separate candidate feature with the committed elevations:

```sh
node scripts/generate-cavity.mjs congost-mont-rebei models/congost-mont-rebei/r1/terrain.json /path/to/candidate-feature.json
python scripts/render-thumbnail.py models/congost-mont-rebei/r1/print.glb --camera -1 .18 -.3 --light -.34 .90 .12
```

To rebuild the elevation input, sample the source DTM in a 63 m square centred on the anchor. Use 85 × 85 samples at 0.75 m spacing, bilinearly interpolated from the 0.5 m pixel centres in EPSG:25831. Rows run north to south and columns west to east. Round to centimetres and pass an object with `anchor`, `side`, `step` and `elevations` as the second generator argument. `profile.json` records the survey windows, sources and fit controls. [ICGC original DTM COG](https://datacloud.icgc.cat/datacloud/model-elevacions-terreny/tif_unzip/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023.tif)

Regeneration from the committed grid gives GLB SHA-256 `d54220a40917dbc69411f70c92a34bab59ffcc79c71b1af166f5144dbe4121d8`.
