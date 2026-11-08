# Castell de Bellver · r1

The model covers the castle proper on the hill above Palma. It preserves the circular open courtyard, three projecting flank towers and the separate Torre de l’Homenatge joined to the roof terrace by a pointed-arch bridge. The parapets and the inner gallery use simplified profiles and shallow recesses. The outer earthworks, entrance causeways and moat remain part of the surrounding topography and base map. [Ajuntament de Palma plan and guide](https://www.palmaeduca.cat/p_activitats/docs/Guia%20did%C3%A0ctica%20HCHC%20Edat%20Mitjana.pdf) · [Historic architectural description](https://palmacultura.cat/documentos/D_2873.pdf) · [Balearic heritage description](https://www.illesbalears.travel/es/mallorca/castillo-bellver)

## Survey and registration

- The OSM core and courtyard (relation `6214762` v3), the keep (way `55170713` v9) and a PNOA orthophoto define the plan. The observed body is about 50 m in diameter, with a 27 m open court and an approximately 11.4 m keep. The bridge and three flank tower outlines were added from the orthophoto. The outer ring of fortifications is separately mapped as relation `6214761` v14. [Castle proper](https://www.openstreetmap.org/relation/6214762) · [Keep](https://www.openstreetmap.org/way/55170713) · [Outer works](https://www.openstreetmap.org/relation/6214761)
- Samples from the IGN PNOA terrain and surface coverages place the moat floor near 108 m, the courtyard near 115 m, the main roof near 126 m and the highest keep sample at 140 m. The highest model point is 140.6 m. The bridge section, tower offsets and small wall profiles are approximations from the plan and images. [PNOA elevations](https://pnoa.ign.es/pnoa-lidar/productos-a-descarga) · [IGN terrain and surface coverage services](https://www.ign.es/web/ign/portal/ide-area-nodo-ide-ign)
- The WGS84 anchor is `[2.61929838, 39.56383125]` at the centre of the court. The mesh uses metres, X east, Y up and Z south. Y=0 is the embedded foundation at 104.4 m orthometric elevation. The model measures approximately 60.8 × 72.9 m in plan and 36.2 m in height including the foundation. [Survey fixture](survey-layout.json)

The GLB is an original CC BY 4.0 reconstruction. The PNOA source is credited to the Instituto Geográfico Nacional de España. The OSM-based plan and registration are © OpenStreetMap contributors under ODbL 1.0. [OSM copyright and licence](https://www.openstreetmap.org/copyright) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Validation

- The 29,548-byte GLB contains 1,195 vertices and 2,390 triangles in one closed solid. The generator verifies the open courtyard and pointed arch, and checks that the deck remains over the arch.
- Relleu Obert replaced the castle proper and the keep with OpenStreetMap at 1:1,000 and retained the separate outer fortifications. Ray checks found an open courtyard and arch, an intact deck and a keep top at 140.6 m after accounting for the engine’s vertical scale. The height-limited and hidden-building modes passed.
- The rotated OpenFreeMap selection at 1:2,500 and 26°, and the partial OpenStreetMap selection at 1:1,500 and −19°, also passed the mesh audit. The arch spans roughly 6.3 m at its base, giving 6.3 mm at 1:1,000 and 2.5 mm at 1:2,500. Slicing and physical printing are pending.

```sh
node scripts/generate-castell-de-bellver.mjs
python scripts/render-thumbnail.py models/castell-de-bellver/r1/print.glb --camera 1 .66 -.77 --light .8 .68 -.5
```

An optional argument to the generator writes the matching catalogue entry.
