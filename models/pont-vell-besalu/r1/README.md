# Pont Vell de Besalú · r1

This reconstruction retains the seven visible bridge bays, the bent alignment, the fortified town gate, the hexagonal central tower, the two widened landings and the parapets. Both tower passages are open. The larger sixth arch spans 26.4 m. The fifth has a higher pointed outer face and a lower rounded barrel. The two relief openings between the western bays are included. The fragment of the first arch lies behind buildings at the town end and is treated as a solid abutment. [Ángel López Sánchez, UPC survey, plan P16-1/14 and pp. 141–161](https://upcommons.upc.edu/server/api/core/bitstreams/3d48908e-a783-43f4-a18a-64f7691f4c64/content#page=7) · [Municipal description](https://besalu.cat/historia-de-la-vila/patrimoni/patrimoni-arquitectonic/)

## Registration

The published survey includes 151.8 m from the historical western end to the extended eastern approach. The model follows about 145 m of the mapped route from the town approach through the main bays to the eastern footway. Its curved approach and tower positions follow the mapped centreline. The 1 m ICGC surface samples put the western deck near 146.3 m, the eastern deck near 143.6 m and the tower crowns at approximately 156.6 and 160.9 m EGM08D595. The underside follows the profile drawing and 0.5 m ICGC terrain. The local water level in the terrain raster is near 132.3 m. [ICGC elevation products](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions) · [Mapped bridge alignment](https://www.openstreetmap.org/way/457496474)

The model simplifies the cutwaters, corner landings and crenels. The parapets are 0.54 m wide, slightly wider than the surveyed 0.4 m. The east landing stops before the tourist office. The geometry is an original reconstruction from measurements. [UPC drawings and measurements](https://upcommons.upc.edu/server/api/core/bitstreams/3d48908e-a783-43f4-a18a-64f7691f4c64/content#page=7)

## Catalogue integration and reuse

The gallery GLB contains the connected masonry and a separate strip for the walking surface. Relleu Obert uses the masonry prefix, which includes both gates and the parapets. It reconstructs and joins the walking surface from the registered deck rows. The bridge profile identifies the matching mapped paths and the two ICGC RTT tower footprints. Relleu Obert 0.23.45 uses those official building IDs to remove matching footprints within the bridge outline. The origin is `[2.701485147621, 42.199319942203]` at 130.5 m.

Run `node scripts/generate-pont-vell-besalu.mjs` from the repository root. An optional filename writes the matching catalogue feature. The independent geometry and ICGC elevations use CC BY 4.0. OpenStreetMap-derived alignment and identities use ODbL. [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Validation

- The GLB is 30,300 bytes with 1,228 vertices and 2,464 triangles. The two indexed shells passed the closed, oriented mesh audit. SHA-256 is `7842668abb35c70d0a887c252ad0d6493c37100df27066ef9d43bfdf8e9b8142`.
- Full crops at 1:850 (+8°) and 1:1,600 (−14°) used ICGC MET5 and retained the seven arches, both passages and the seven checked ground contacts in one connected bridge. In the 1:850 control, the model replaced one procedural deck and the duplicate ICGC town gate while keeping nearby buildings. Both full crops generated a smooth path connection at one end.
- A cut at 1:1,100 (+19°) retained four complete openings and the central tower passage. The clipped masonry and deck remained one closed solid. At 1:850 the largest arch opening spans about 31 mm, so its crown is a candidate for slicer support. Physical printing remains to be checked.
