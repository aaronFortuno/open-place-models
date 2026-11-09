# Torre de Collserola · r2

This revision is based on the original Kimi-assisted reconstruction supplied by the catalogue maintainer. It keeps the open platform levels, lower stays, platform truss and stepped antenna. The separate auxiliary building remains part of the general map. The [r1 model](../r1/README.md) remains available at its original path.

## Geometry and placement

- The anchor remains `[2.1142631166666668, 41.41725973333333]` at 445 m above sea level. X points east, Y up and Z south, with positions in metres. The operator places the public viewing floor around 115 m above the hill. INDUS documents 13 platforms from approximately 65 to 132 m, including the public floor at 115.4 m. Those levels follow the supplied mesh. [Operator’s technical description](https://www.torredecollserola.com/torre-collserola) · [INDUS project description](https://www.indus-eng.com/project/torre-collserola/)
- The supplied model reaches 288.4 m from Y=0. The published mesh preserves the plan, face indices and all elevations up to 158 m, then scales the upper mast to an apex 268 m above the hill. That matches the documented visible height and puts the tip at 713 m above sea level. The overall height of approximately 288 m includes the buried base. [Technical visit report, UPC archive](https://upcommons.upc.edu/bitstream/2099/9753/1/Article003.pdf)
- The plan spans 86.88 × 75.24 m. The mapped outline retains the tower’s OSM geometry. Three narrow corridors cover the approximate directions and reach of the model’s stay anchors, whose positions and foundation details are schematic. Ground connectors keep the stays joined to the printable mesh. [OpenStreetMap relation 20725097](https://www.openstreetmap.org/relation/20725097)
- The outline and placement are credited to OpenStreetMap contributors under ODbL 1.0. The contributed mesh is credited to Open Place Models contributors under CC BY 4.0. [OpenStreetMap copyright](https://www.openstreetmap.org/copyright) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Validation

- The 297,008-byte GLB contains 12,006 vertices and 25,364 triangles in a single connected, closed solid with consistent face orientation. There are no zero-area faces. The extra weight reflects the open decks and truss. The antenna tip and fine elements may fall below a printer’s resolution at small scales.
- Relleu Obert 0.23.44 loaded the GLB with regional terrain. The OSM test at 1:2,000 replaced the four mapped tower parts and preserved the auxiliary building. An OpenFreeMap test at 1:5,000 and 26° replaced the overlapping tower volumes. An OSM crop at 1:2,000 and −19°, shifted 120 m east, produced a closed cut. Height limit and hidden-building modes passed. The apex stayed at 713 m after accounting for vertical exaggeration.

Run `node models/torre-collserola/r2/prepare.mjs /path/to/torre-collserola-r2.glb` with the maintainer’s original GLB. The script checks its SHA-256 before correcting the height. The published GLB has SHA-256 `11c57dae1a2519624dbdb3faf98b223e82967dd246cbc576475486b6add05eda`. Generate the thumbnail with `python scripts/render-thumbnail.py models/torre-collserola/r2/print.glb --camera 1 .24 1.25`.
