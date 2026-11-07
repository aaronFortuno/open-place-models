# Roca Foradada · r1

An original printable reconstruction of the pierced rock in the Agulles sector of Montserrat, El Bruc. The surface uses a 64 × 64 m patch of the ICGC 2021–2023 LiDAR terrain model. The original 50 cm samples are reduced to a 1 m grid and rounded to centimetres. The surface is CC BY 4.0, with attribution to the Institut Cartogràfic i Geològic de Catalunya. The original opening geometry is also CC BY 4.0. [ICGC elevation data and licence](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The opening follows the dimensions recorded by Jordi Navarro and Montse Mañosa in their 29 January 2023 cave survey. The west section is a rounded triangle approximately 10.2 m wide and 13 m high. The published survey gives an interior length of about 13 m. The west sill is fitted at 892.8 m in the terrain model, and the opening runs on a bearing of 74° towards the east-northeast. The vault, narrower middle and small sideways shift are approximations. The subtraction volume extends beyond the cliff faces to open both ends. The provincial inventory reports a larger span and height. A published photogrammetric study shows the void, and the model here uses an original profile built from the survey dimensions. [Cave survey](https://espeleoworld.com/c/la-roca-foradada-bruc) · [Provincial inventory](https://patrimonicultural.diba.cat/print/pdf/node/74394) · [Photogrammetric study, figure 14](https://doi.org/10.3390/geosciences12100370)

## Files and placement

- `print.glb` is one closed solid with one through opening. Its anchor is `[1.7865106079801403, 41.61225600493541]` in WGS84 and its vertical origin is at 819 m. X is east, Y is up and Z is south, all in metres. The GLB records the base elevation and the `EGM08D595` vertical datum.
- `terrain.json` supplies the surface grid and a closed cutter for integration into a larger terrain. `grid.elevations` runs from northwest to southeast, eastward within each row. `void.vertices` uses the same X and Z axes, with absolute orthometric Y. `void.faces` indexes the flat vertex array in groups of three, with outward winding.
- `thumbnail.webp` shows the west entrance along the axis of the opening. It is rendered directly from the GLB.

The generator checks that the carved result is one positive-volume solid with one through opening, a clear axial ray at 897 m and rock above it at 907 m. At 1:2,000 the nominal west section is 5.1 × 6.5 mm before vertical exaggeration. Check the vault in the slicer at the chosen scale.

```sh
node scripts/generate-foradada.mjs
python scripts/render-thumbnail.py models/roca-foradada/r1/print.glb --camera -.96 .14 .28
```
