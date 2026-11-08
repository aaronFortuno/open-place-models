# Roca Foradada · r3

This 160 × 160 m terrain patch includes the Cadireta to the north and the higher ridge to the southeast. The surface grid samples the 2021–2023 ICGC LiDAR terrain at 1.25 m. It preserves the r2 geographic anchor and EGM08D595 vertical datum. [ICGC source and CC BY 4.0 terms](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat)

The Cadireta is an interpreted profile fitted to the measured 902.35 m crest. Its cap projects north over a narrower trunk. The rounded cross-sections use the proportions of the cardinal views in Janeras et al. (2022), Figure 20, and the approximate 17.2 × 25.3 × 47.9 m dimensions of the upper block and trunk in Cabranes Medina (2015), Table 4. The local surface envelope and an underside cutter represent the overhang. The exact underside and fractures would require the original photogrammetric mesh. [Janeras et al.](https://doi.org/10.3390/geosciences12100370) · [Cabranes Medina](https://hdl.handle.net/2099.1/25652)

The Foradada keeps the r2 cutter path, section and portal positions. The sidecar stores both closed cutters in its existing void mesh, in absolute metres. The generated GLB is a single closed solid with one through opening. The generator checks twelve rays across the two mouths and verifies that rock remains above the vault. Three vertical rays through the Cadireta’s cap verify the air gap beneath it.

```sh
node scripts/generate-foradada.mjs
python scripts/render-thumbnail.py models/roca-foradada/r3/print.glb --camera -.96 .11 .28
```

The generator can also take a JSON file with the same WGS84 anchor and a centred odd square of half-metre ICGC samples. The `anchor`, `side` and row-major `grid` fields give the anchor, sample count per side and elevations. Rows run north to south and columns west to east. The input needs to cover at least 161 × 161 m to interpolate the model grid.
