# Roca Foradada · r2

The terrain patch extends to 96 × 96 m. It uses the 2021–2023 ICGC LiDAR terrain model sampled at one metre. The wider patch includes the descending terrain beyond the eastern opening, so the surrounding coarser elevation model can blend back in below the sill. The GLB includes the wider rocky spur. [ICGC source and CC BY 4.0 terms](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat)

The vault is an approximation based on the survey by Jordi Navarro and Montse Mañosa. It preserves the triangular section and the 74° bearing used in r1. The cutter now reaches 30 m along that axis to clear the terrain beyond the eastern mouth. The 30 m endpoint is an excavation margin in the model. The survey gives an interior length of 13 m. [Field survey](https://espeleoworld.com/c/la-roca-foradada-bruc) · [r1 placement and modelling notes](../r1/README.md)

The GLB is a single closed solid with one through opening. Its horizontal anchor and EGM08D595 vertical datum are unchanged. The GLB records its base elevation. `terrain.json` carries the one-metre surface grid and the closed cutter in absolute orthometric metres, using the same format as r1. The audit verifies an unobstructed section from outside both mouths with twelve rays spanning four elevations and three lateral offsets.

Use the [r2 checkout](https://github.com/aaronFortuno/open-place-models/tree/aa3ae71) to regenerate this revision.

```sh
node scripts/generate-foradada.mjs
python scripts/render-thumbnail.py models/roca-foradada/r2/print.glb --camera -.96 .11 .28
```
