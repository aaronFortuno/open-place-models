# Taj Mahal · r1

The model covers the central mausoleum, the marble platform and the four corner minarets in Agra. It keeps the bulbous dome and finial, the four roof chhatris with open sides, the taper and balconies of the minarets, and the deep pointed portal recesses. The surrounding mosque, guest house, garden and riverfront terrace remain separate map features. The façades omit ornament and interior chambers. The tower profiles and dome curves use simplified sections. [Measured dimensions](https://ignca.gov.in/Asi_data/82052.pdf) · [Taj Mahal exterior guide](https://www.tajmahal.gov.in/the-taj-exteriors.aspx) · [UNESCO site](https://whc.unesco.org/en/list/252)

The square platform is about 96 m across before the minaret projections. The central building is 57.3 m wide, the four minarets are 41 m high above the platform and the top of the finial is 73.1 m above the terrace. The platform outline and minaret locations follow OpenStreetMap. The main axis faces approximately 179.3° true towards the garden. The 164 m terrain contact is an estimate from unobstructed Mapzen elevation samples around the platform. Relleu Obert uses that base to remove the coarse elevation bulge beneath the mausoleum. The source mesh uses metres and a local origin at the WGS84 anchor. [Platform and alignment](https://www.openstreetmap.org/way/375257537) · [Background terrain](https://registry.opendata.aws/terrain-tiles/)

The newly constructed geometry is licensed CC BY 4.0. The platform outline and geographic registration are derived from OpenStreetMap under ODbL 1.0. The printed finial is deliberately thickened to about 0.5 mm at 1:2,500. Check the chhatri roofs and the finial in the slicer before printing at this scale. [Model licence](https://creativecommons.org/licenses/by/4.0/) · [Map attribution](https://www.openstreetmap.org/copyright)

The closed GLB is 39,756 bytes, with 1,609 vertices and 3,278 triangles. The mesh audit passes and the platform keeps all five structures connected. Local Relleu Obert checks at 1:1,250 with OpenFreeMap, 1:2,500 with a 27° rotation and OSM building parts, and a partial 1:1,250 crop with a 9° rotation passed. The complete cases preserved neighboring buildings and respected the height limit and hidden-buildings settings. Physical printing remains to be checked.

```sh
node scripts/generate-taj-mahal.mjs
python scripts/render-thumbnail.py models/taj-mahal/r1/print.glb --camera .42 .3 1 --light -.24 .64 .82
```
