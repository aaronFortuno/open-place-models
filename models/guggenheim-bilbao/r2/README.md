# Museo Guggenheim Bilbao · r2

An original, stylised exterior reconstruction of Frank Gehry’s museum. This revision replaces the triangulated elevation surface of r1 with deliberately modelled architectural volumes: broad twisting atrium sails, two curved galleries, the long eastern Gallery 104, limestone wings and a simplified riverside canopy and support. The bridge deck, the separate Torre de La Salve, Puppy and the other outdoor artworks are outside the model. [Museum exterior](https://www.guggenheim-bilbao.eus/el-edificio/el-exterior) · [Architectural drawings and photographs](https://www.inexhibit.com/mymuseum/guggenheim-museum-bilbao/)

## Geometry and placement

- The geometry uses closed lofted and swept sections joined into one printable solid. The petals widen, lean and twist rather than following the noisy roof triangles used in r1. Curved surfaces are deliberately simplified; individual titanium panels, glazing, stairs and small rooftop equipment are omitted. Roof caps and the connections between sails are interpretive, not a surveyed reproduction of the construction.
- The geographic footprint follows the same trimmed OSM way `118499485` used by r1. The anchor and grid transform are retained, but this revision does not read or reuse the r1 roof samples or mesh. [OSM museum outline](https://www.openstreetmap.org/way/118499485)
- The WGS84 anchor is `[-2.93406129499, 43.26842817013]`. The GLB uses metres with X east, Y up and Z south. Y=0 is a flat base at 1.801 m EGM08_REDNAP, supplied separately as `anchorElevation`; unlike r1, the base does not follow the measured terrain slope.
- The bounds are approximately 219.09 × 154.59 m in plan and 56.154 m high. At 1:1,800 the geographic-scale model is about 122 × 86 × 31 mm; at 1:3,000 it is about 73 × 52 × 19 mm.

## Source attribution and licence

The independently reconstructed mesh is published under CC BY 4.0, credited to Open Place Models contributors. The mapped footprint and placement derive from OpenStreetMap under ODbL 1.0. No third-party mesh is imported. Following maintainer review, this licence covers the contributed geometry only and does not grant third-party data, trademark or other separate rights. The museum’s legal notice identifies the building’s graphic representation as a registered trademark and states that reproductions require prior written consent. [OSM licence](https://www.openstreetmap.org/copyright) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [Museum legal notice](https://www.guggenheim-bilbao.eus/aviso-legal)

## Validation

- The GLB is 87,848 bytes with 3,627 vertices and 7,254 triangles. An independent audit of the exported file found one connected, watertight and consistently oriented mesh with positive signed volume of 324,659.05 m³, no coincident vertices and no degenerate triangles. `review.3mf` is a metre-scale review export of the same triangles.
- Relleu Obert loaded the actual GLB through its catalogue loader and produced closed building meshes at 1:1,800 with rotations of 0° and 26°, and at 1:3,000 with −19°. The mapped building was replaced while an independent neighbouring polygon survived. The absolute anchor, height limit and hidden-building mode passed. A partial crop shifted 80 m east at 1:2,400 and −19° also remained closed. These local controls used a flat terrain at the documented anchor elevation.
- The production gallery build passed. The local gallery loaded the r2 preview and download, returned only this model for a Guggenheim search, displayed its credits and sources, and responded to orbit and zoom controls. The 320 × 200 WebP thumbnail is rendered from the default GLB.
- Slicing and physical printing remain to be checked. The model is intended for map and small-scale display, not fabrication documentation or a dimensionally exact survey.

Run `node scripts/generate-guggenheim-bilbao-r2.mjs` from the repository root after installing the pinned dependencies. An optional output path writes the catalogue feature. Generate the thumbnail with `python scripts/render-thumbnail.py models/guggenheim-bilbao/r2/print.glb --camera 1 .75 1.4`. SHA-256 of the regenerated GLB is `f63fcc0285c817f4df40032ced2fb6accab7ace84398ca1a5fa68c0efcae9f6b`.
