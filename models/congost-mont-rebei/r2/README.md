# Congost de Mont-rebei · r2

This revision follows about 244 m of the Camí nou along the Catalan wall, north of the Cova Colomera branch. The gallery model gives the ledge 261 m of context, from the exposed river channel to the cliff above the route. It shows an upper cut at 592 m and a flat printing base at 473 m. The northern end includes the cliff bend beyond the detailed ledge. [Fundació Catalunya La Pedrera itinerary](https://fundaciocatalunya-lapedrera.com/ca/espais-natura/congost-mont-rebei/itineraris) · [Official route map](https://www.google.com/maps/d/viewer?mid=1EhOWyFnJQj6Cd-sGpsMurLioSoHG6sGL) · [Geological inventory](https://mediambient.repositori.gencat.cat/handle/20.500.14343/2295)

## Georeferencing and shape

The modelled portion runs from UTM northing 4,661,030 to 4,661,245 in ETRS89 / UTM 31N (EPSG:25831). The model uses metres with true east on +X, up on +Y and south on +Z. Its floor profile is fitted to shelf breaks in the ICGC 2021–23 0.5 m bare-earth terrain, using the official itinerary to find the correct wall. The older path follows a separate line lower in the gorge. The ICGC 2025 orthophoto and OpenStreetMap paths `209374197` and `198762251` help check the alignment. At six floor and roof controls the 1 m surface raster is about 7–19 m above the corresponding bare-earth samples, so the floor fit uses the bare-earth terrain. [ICGC 0.5 m DTM](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat) · [ICGC 1 m DSM](https://catalegs.ide.cat/geonetwork/hub-litoral/api/records/model-superficies-lidar-catalunya-1m-2021-2023) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial)

The walking surface is approximately 532.35–537.10 m EGM08D595. Width and overhang clearance are estimates, with about 1.35 m of depth into the rock and around 2.4–2.7 m of overhead clearance in the covered parts. A series of photographs shows cut ledges, roofs and open stretches. The model uses a roof where those observations agree with the terrain break, with an open shelf in less certain stretches. About 155 m has an estimated roof. The documented 6 m tunnel awaits a reliable location for its portals. Handrails, benches and the older route are outside this revision. [Field description and photographs](https://www.rutespirineus.cat/rutes/congost-de-mont-rebei) · [View south from the path, Oriol Sastre](https://commons.wikimedia.org/wiki/File:Congost_de_Mont-rebei_20201110_05.jpg) · [View north from the path, EliziR](https://commons.wikimedia.org/wiki/File:Congost_de_Mont-rebei_des_del_cam%C3%AD_de_dalt_(mar%C3%A7_2013)_-_panoramio_(1).jpg) · [A. E. Talaia historical account](https://ccbe.feec.cat/docs/aetalaia/Hemeroteca/SSD_Seccio_Senders_Dossiers/SSD19951008_113.pdf)

## Regional crops and physical scale

The catalogue shows one gallery entry. Four hidden landform sectors provide the corrections for Relleu Obert. Each uses an 89 × 89 grid at 0.875 m from the same 0.5 m ICGC DTM. Adjacent cutters overlap by about 1.1 m and use the same cross sections at their joints. The four correction files total 260,375 bytes. The gallery GLB is shared and is 75,628 bytes. The regional terrain continues outside each patch, with the cutter confined to the height of the walking route above the water.

The catalogue uses a conservative minimum width of 1.2 m for applying the cut. That equals 0.96 mm at 1:1,250, 0.8 mm at 1:1,500 and 0.6 mm at 1:2,000. Relleu Obert needs at least 0.8 mm to apply the cutter. At the exact threshold, the terrain sampling and rotation can affect small features. The standalone GLB occupies a bounding box of about 123 × 213 × 95 mm at 1:1,250. A physical print can be used to check support below the roofs and cliff overhangs.

## Validation and reproduction

The gallery GLB has 6,234 triangles and one connected solid. An independent edge audit found zero boundary, non-manifold or inconsistent edges. Twenty-one rays verify entrances, roofs, floors, back walls, open sky and the three sector joints. The local gallery build stages one card, one overview GLB, one thumbnail and four regional correction files, 340,651 bytes in total.

Local Landscape tests used the ICGC MET5 terrain and OpenFreeMap vectors.

- The complete 168 × 242 mm selection at 1:1,250, rotated +6°, applied all four sectors. All 21 rays passed, including the three joints and two open stretches. The materials passed the closed-solid audit. The full Landscape model had 937,890 triangles.
- The 88 × 88 mm partial selection at 1:1,250, rotated +11° and centred on `42.07843 N, 0.68160 E`, retained the south and bend sectors. Both sections and their shared joint passed the ray checks. The edge also crosses the overlap with the central sector. The engine reports that sector as omitted because the shared section has already been carved.
- The 105 × 100 mm partial selection at 1:1,400, rotated −17°, applied the bend, central and north sectors. All 16 rays passed, including two joints and both open stretches. At all 63 water probes below 516 m, the intersections matched a control with the same terrain patches and raised cutters within 0.025 mm at print scale. The symmetric difference was 0.100 mm³, about 0.0075% of the water volume.
- At 1:2,400 all four sectors were below the width threshold, and the continuous base terrain passed the closed-solid audit.

`survey.json.gz` contains the fitted stations, DTM input coordinates and source checksum, and the sampled terrain used by the generator. The gallery terrain uses a grid with samples about every 3 m along the gorge and denser cross sections near the ledge. Each regional patch bilinearly samples the same source from the WGS84 anchor and stores orthometric elevations rounded to centimetres. The terrain and generated model are CC BY 4.0, credited to the ICGC and Open Place Models contributors. Photos and route files are reference sources. [ICGC original DTM COG](https://datacloud.icgc.cat/datacloud/model-elevacions-terreny/tif_unzip/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023.tif)

```sh
node scripts/generate-mont-rebei.mjs /path/to/candidate.json /path/to/rays.json
python scripts/render-thumbnail.py models/congost-mont-rebei/r2/print.glb --camera -1 .29 -.22 --light -.45 .88 .20
```

GLB SHA-256 `855cba82173f2f95ecf69f9d6c6e5bfcf99d51e94ddcd5be23e538ea2ff0515d`.
