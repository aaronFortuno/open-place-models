# Roca dels Moros del Cogul · r1

This model represents the southwest-facing sandstone overhang, its short recess and the ground immediately in front. The gallery view shows a 16 × 16 m terrain crop. Relleu Obert uses a 22 × 22 m elevation patch and a closed volume that opens the recess in the terrain. The gate, individual masonry blocks, paintings and engravings are omitted. The interpretation centre is outside the model footprint. [Scientific report, pp. 5, 16–17 and 72](https://calaix.gencat.cat/bitstream/handle/10687/445369/qmem15715.pdf?isAllowed=y&sequence=1) · [Official virtual visit](https://patrimoni.gencat.cat/ca/monuments/activite/visita-virtual-el-cogul)

## Measurements and registration

The scientific report describes a detached block of about 11 × 4 × 4 m and the mural recess within it at about 3 m wide, 2 m deep and 4 m high. The Museu d’Arqueologia de Catalunya catalogues the wider shelter at 10 × 4 × 3 m and records its southwest orientation. The cutter represents the narrower recess around the mural. Its principal mouth section is about 3.16 m wide and 3.55 m high, and the back is approximately 2.15 m inside. The sections reproduce the shape of a shallow overhang with one higher side. They are simplified estimates from the report’s photographs and the Giravolt scan. [Scientific report](https://calaix.gencat.cat/bitstream/handle/10687/445369/qmem15715.pdf?isAllowed=y&sequence=1) · [MAC catalogue, p. 63](https://artprimer.mac.cat/wp-content/uploads/2020/10/MAC_CATALEG_ARTPRIMER.pdf) · [Giravolt scan](https://doi.org/10.5281/zenodo.10326867)

The model anchor is `[0.69710504, 41.46480201]` in WGS84, or `[307683.5, 4592916.5]` in ETRS89 / UTM 31N. It is an estimate of the opening from Prudenci Español’s site plan, the orthophoto and the local rise in the elevation profiles. The outward bearing is approximately 225°. The ICGC DTM at the anchor gives 277.75 m EGM08D595. The EspeleoÍndex reference `[307693, 4592910]` lies on the visitor approach in the orthophoto. The scientific report gives `[307690.13, 4592924.13]` as its site reference. Both were used to locate the site before fitting the entrance. [Site plan, p. 51](https://dialnet.unirioja.es/descarga/articulo/4673278.pdf) · [Entrance reference](https://espeleoworld.com/c/la-roca-dels-moros) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial)

## Geometry and reuse

The 0.5 m ICGC LiDAR DTM records the approach slope but smooths the overhang. The 1 m ICGC LiDAR DSM restores the upper rock surface within the sandstone footprint interpreted from the orthophoto. The footprint and the transition parameters are recorded in `profile.json`. The sample grid outside this small patch remains the original DTM. The sidecar holds the resulting elevation grid and the simplified cavity cutter, both in metres. [ICGC elevation products](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions)

The Giravolt model by Lluís González covers the mural sector and has no geographic anchor in the file. It was read as a shape and scale reference for the original cutter. Its CC BY 4.0 declaration agrees on Sketchfab, in the public Zenodo record and in the GLB metadata. The file retrieved from Zenodo has MD5 `ca90f1ae153fe3ed81902822d5b5c787`. The gallery mesh, the simplified cutter and the adjusted ICGC elevations are released under CC BY 4.0. Credit Open Place Models contributors, the ICGC and Lluís González / Giravolt. [Sketchfab source](https://sketchfab.com/3d-models/roca-dels-moros-del-cogul-pintures-rupestres-4013e271542845e181744344546e42ee) · [Zenodo record and licence](https://doi.org/10.5281/zenodo.10326867) · [ICGC geoinformation licence](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Validation

- The 21,368-byte GLB has 859 vertices and 1,714 triangles. The cutter has 79 vertices and 154 triangles. The independent mesh audit found one closed, consistently oriented solid per file, positive volumes, no coincident vertices or degenerate faces and a single connected face ring at each vertex.
- Relleu Obert verified an open approach with the roof, floor, back and lateral shoulders intact at 1:500 with no rotation, 1:1,000 at 22°, and in a partial 1:750 crop at −15°. The partial crop was offset 6 m to the southeast along the face and 9 m to the southwest towards the approach. The mesh remained closed in each case. The cutter removed approximately 217, 27 and 65 mm³ respectively. At 1:5,000 the entrance was omitted, as expected below the engine’s 0.8 mm width threshold.
- The effective width of 2.6 m gives about 5.2 mm at 1:500 and 2.6 mm at 1:1,000. Slicing and physical printing remain to be checked.

```sh
node scripts/generate-cavity.mjs roca-dels-moros-cogul
python scripts/render-thumbnail.py models/roca-dels-moros-cogul/r1/print.glb --camera 0.14 0.17 1 --light -0.5 0.90 0.33
```

The pinned generator uses the checked-in grid and profile. The GLB regenerates to SHA-256 `22759c002399240c4c682ec5f27512a5098dbebf18fcc1709ba8b36e9a040c61`. To reproduce the grid from the source products, bilinearly sample both crops onto the 45 × 45 local grid at 0.5 m spacing. Add the positive DSM–DTM difference across the recorded rock outline with a smoothstep weight over the signed-distance interval in `profile.json`. Round the result to centimetres and store rows north to south and west to east.
