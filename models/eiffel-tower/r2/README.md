# Tour Eiffel · r2 lightweight

Paris, France. This simplified reconstruction retains the four splayed feet, four open arches, three principal platforms and taper to the antenna. The ground span is 125 m and the tip is 330 m high. The three decks are modelled around 57.6 m, 115.7 m and 276.1 m. The four main openings between the first and second decks remain clear. The upper shaft has open bays joined by horizontal bands and closes where its silhouette narrows. Individual lattice diagonals, railings and secondary fittings were removed. The antenna and bands are slightly thickened for smaller physical models. [Official dimensions](https://www.toureiffel.paris/fr/le-monument/chiffres-cle) · [Architecture and construction](https://www.toureiffel.paris/fr/le-monument/histoire)

The WGS84 ground anchor, footprint and replacement identifiers are shared with [r1](../r1/README.md). Geometry is in metres with X east, Y up and Z south. The model’s east–west and north–south spans are each 176.76 m. [OSM outline](https://www.openstreetmap.org/way/5013364) · [Open Landmarks registration](https://open-landmarks.benmaps.fr/assets/eiffel-tower/4e011f6dced3b66b9599894f5e689977b06694c5d678a09872892d7f72e9a7d1/asset.json)

## Source and licence

Newcandle from Thingiverse created the source STL. Open Landmarks contributors supplied the geographic registration. Open Place Models contributors sampled the registered cross-sections, reconstructed the silhouette as solid lofts and joined them with Manifold. The reconstructed geometry is CC BY-SA 3.0. The footprint and placement derive from OpenStreetMap under ODbL 1.0. [Original STL](https://commons.wikimedia.org/wiki/File:EiffelTower_fixed.stl) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) · [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright)

After `pnpm install --frozen-lockfile`, run `node scripts/generate-eiffel-light.mjs` from the repository root. The script records the sampled profiles and generates the GLB without downloading the source mesh again.

## Validation

- The 21,196-byte GLB has 816 vertices and 1,692 triangles. A topology audit found a single closed component, no duplicate positions, no zero-area triangles and no edge or vertex manifold defects. Its signed volume is 185,485 m³.
- Local Relleu Obert checks used Paris terrain and building data at 1:2,000 and 0°, at 1:5,000 and 37°, and with a partial crop at 8°. The model contacts the terrain and replaces the mapped tower while retaining neighbouring buildings. The 1:2,000 3MF contains 20,804 triangles across four closed pieces and passes the Relleu Obert 3MF audit.
- Face-on and oblique inspections confirmed the four distinct feet, the curvature of the base arches and the clear bays between decks. The lofted upper ribs measure roughly 4.7–6.5 m across and the antenna stem measures 4 m near its tip. At 1:5,000 these widths are about 0.94–1.30 mm and 0.8 mm respectively. At 1:10,000 they are about 0.47–0.65 mm and 0.4 mm. The full tower is 66 mm at 1:5,000 and 33 mm at 1:10,000. The smaller scale is a useful slicer check because the narrowest openings and crown can merge, depending on extrusion width. Physical printing and supports remain to be checked.
- The catalogue supplies this lightweight model by default and offers the 1.62 MB r1 detail for 1:1,500 and larger model scales.
