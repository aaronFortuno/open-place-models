# Balma de Can Solà · r1

This approximate rock shelter opens toward the east and southeast at the foot of the cliff below Can Solà de la Roca, El Bruc. The lip follows the steep break visible in the ICGC 2021–2023 terrain data. The surrounding 192 × 192 m patch samples that 0.5 m terrain at 1.5 m spacing. Coordinates are WGS84 and elevations use EGM08D595. The ICGC geographic-name layer independently places the feature at this cliff. [Terrain data and CC BY 4.0 terms](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat) · [ICGC geographic names](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Noms-geografics)

The recess has a curved, elongated opening, a floor, a roof and a closed back. Its limits follow the published dimensions of about 120 m across, 34 m deep and 15 m high. The floor elevations, interior profile and taper are an interpretation fitted to the exterior terrain. The EspeleoÍndex plans and photographs are cited as references and are outside this release. The model contains original geometry and CC BY 4.0 ICGC elevations. [EspeleoÍndex entry and survey references](https://espeleoindex.com/cavitat/can-sola-balma-de-1518/) · [EspeleoÍndex terms](https://espeleoindex.com/informacio/) · [Diputació de Barcelona inventory](https://patrimonicultural.diba.cat/print/pdf/node/74391)

The sidecar contains the local elevation grid and a closed volume to subtract from the terrain. The generator verifies a connected terrain solid, a clear path into the shelter at three sections and an intact floor, roof and back wall at each section. At 1:4,047, the reported maximum height corresponds to about 3.7 mm. Physical printing of the roof remains to be checked.

```sh
node scripts/generate-can-sola.mjs
python scripts/render-thumbnail.py models/balma-de-can-sola/r1/print.glb --camera 1 .43 .8
```

To regenerate from elevation samples, pass a JSON file with `anchor`, `side`, `step` and `elevations`. Use the catalogue anchor, 129 samples per side, 1.5 m spacing and row-major order from north to south and west to east.
