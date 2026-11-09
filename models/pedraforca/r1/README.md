# Pedraforca · r1

This printable relief covers 2,200 × 1,600 m around the two Pollegons of Pedraforca, including the Calderer, the Enforcadura saddle and the scree slopes towards Gósol and Saldes. The gallery camera looks from the Gósol side to show the notch between the summits. [Parc Natural landscape description](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/pedraforca/el-paratge/patrimoni-natural-i-cultural/paisatge/) · [Parc Natural geological inventory](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/cadi/gaudeix-del-parc/guia-de-visita/arees-dinteres/interes-geologic/grans-arees-interes/massis-del-pedraforca/)

## Extent and source elevations

The centre is longitude **1.70436781159**, latitude **42.23877267224**. The cut is aligned with ETRS89 / UTM 31N grid north. Its west, south, east and north limits are `392000, 4676300, 394200, 4677900`. The GLB uses metres, with true east on +X, up on +Y and south on +Z. The flat underside at 1,545 m EGM08D595 is a fabrication base. Elevations above it retain their original vertical scale. [ICGC 2021–23 LiDAR terrain model](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat)

| Feature | ICGC terrain at control (m EGM08D595) | Published reference (m) |
| --- | ---: | ---: |
| Pollegó Superior | 2,506.20 | 2,507 |
| Calderer | 2,499.98 | 2,497 |
| Pollegó Inferior | 2,443.96 | 2,445 |
| Enforcadura, mapped point | 2,356.11 | 2,356 |
| Enforcadura, floor near the mapped point | 2,355.61 | |

The model uses the observed LiDAR terrain at these controls. At the Calderer this is approximately 3 m above the published height. The topographic names and the ICGC 2025 orthophoto identify the two scree slopes. Seven controls follow their descent, from 2,265 to 2,001 m on the Gósol side and from 2,264 to 1,838 m on the Saldes side. [Parc Natural summit heights](https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/pedraforca/el-paratge/patrimoni-natural-i-cultural/paisatge/) · [FEEC summit coordinates](https://www.feec.cat/activitats/100-cims/cim/pollego-superior-pedraforca/) · [FEEC saddle and slopes](https://www.feec.cat/agenda/activitats/100-cims/pollego-superior-100-cims/) · [ICGC geographic names](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Noms-geografics) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Ortoimatges/WMS-Ortofoto-Territorial)

## Geometry and scale

The adaptive triangulation allocates more faces where simple triangles differ most from the terrain samples, then incorporates the twelve summit, saddle and scree controls as vertices. The GLB is one closed solid with 2,396 triangles and occupies 29,596 bytes. An independent index audit found zero boundary, non-manifold or inconsistent edges. Vertical ray checks at the twelve controls recover the source elevations to within 0.05 m. Across the full 513 × 513 source lattice the vertical RMS error is 10.43 m, the 95th percentile absolute error is 23.26 m and the maximum is 47.62 m. Fine cliff detail and individual boulders are simplified at this triangle budget.

At 1:10,000 the standalone piece measures about 220 × 160 × 96 mm, with a 95th percentile vertical error of 2.33 mm against the input grid. At 1:15,000 it measures about 147 × 107 × 64 mm, with a corresponding error of 1.55 mm. These dimensions use the edges of the UTM-aligned cut. The solid has been checked digitally.

## Relleu Obert

The gallery lists the piece as `terrain`. Relleu Obert builds a continuous landscape with its normal ICGC MET5 source. The gallery mesh serves as a standalone printable cut. A local check of the catalogue loader returned zero model requests and zero warnings for selections inside and outside the piece. The MET5 raster differs from the twelve LiDAR controls by at most 1.64 m, with a maximum difference of 0.86 m at the three summits and the saddle.

For a similar cut in Relleu Obert, select the centre at **42.23877267224 N, 1.70436781159 E**, a footprint of 220 × 160 mm at 1:10,000 and a rotation of −0.87°. A footprint of 146.67 × 106.67 mm at 1:15,000 gives the same approximate geographic extent. Use vertical exaggeration 1 for the same proportions.

Two local Pure Relief cuts used the live ICGC MET5 raster captured for each selection, with vertical exaggeration 1 and a 240 × 240 terrain grid. Each produced one closed terrain solid of 118,080 triangles. No catalogue mesh was loaded in either cut.

| Cut | Pollegó Superior (m) | Calderer (m) | Pollegó Inferior (m) | Enforcadura (m) | Maximum difference across all twelve LiDAR controls (m) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1:10,000 · 220 × 160 mm · −0.87° | 2,504.54 | 2,497.76 | 2,442.93 | 2,355.41 | 2.22 |
| 1:15,000 · 160 × 120 mm · +22° | 2,504.02 | 2,498.92 | 2,442.67 | 2,355.42 | 2.18 |

Both scree profiles descend throughout the sampled controls. The saddle column uses the mapped point from the source elevation table.

## Reproduction

`survey-layout.json` records the source windows and the controls. `source-grid.bin.gz` is a generator input. It stores 513 × 513 signed, little-endian int16 decimetre differences, reset at the start of each row. To reproduce it, bilinearly sample pixel centres in the source COG's 2 m overview. Use a grid including both edges of the UTM bounds with spacings of 4.296875 m east and 3.125 m south, west to east and north to south. Round each elevation to a decimetre before calculating differences. The summit and saddle controls use the COG's native 0.5 m layer. [ICGC original DTM COG](https://datacloud.icgc.cat/datacloud/model-elevacions-terreny/tif_unzip/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023.tif)

```sh
node scripts/generate-pedraforca.mjs /path/to/candidate-feature.json
python scripts/render-thumbnail.py models/pedraforca/r1/print.glb --camera -1 .20 -.11
```

The terrain data and model are CC BY 4.0. Credit the Institut Cartogràfic i Geològic de Catalunya for the elevations and Open Place Models contributors for the triangulation. The gallery packages the GLB and thumbnail, 32,790 bytes in total. Regeneration gives GLB SHA-256 `4f8d9721d4b80e295305f6dcdb8a209ca92416d86225b2d186149f9ef3322f29`.
