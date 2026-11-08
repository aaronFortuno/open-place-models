# Hagia Sophia · r1

This reconstruction of Ayasofya keeps the broad central dome, the two axial half-domes, the lower domed exedrae, the apse, the narthex and the stepped outer buttresses. The dome follows the published span of approximately 31–32 m and the reported 55.6 m crown height above the interior floor, with an allowance for the outer shell and finial. The four minarets have separate profiles. The two matching western minarets reach 66.55 m. The slender and brick minarets reach approximately 63.2 m and 45 m. The geometry omits interior spaces, windows, ornament and temporary restoration equipment. [Ministry dimensions](https://www.ktb.gov.tr/EN-113776/ayasofya-hagia-sophia.html) · [Architectural sections](https://projects.mcah.columbia.edu/medieval-architecture/htm/or/ma_or_discuss_hs_plan.htm) · [Architectural scan](https://repository.edition-topoi.org/collection/HASO/overview) · [Measured minaret profiles](https://doi.org/10.1002/eqe.1115)

The WGS84 anchor is at the dome centre. The apse axis is approximately 123.2° true. The floor plan, minaret locations and plinth follow OpenStreetMap way 109862851 v114 and its mapped parts. A thin layer within that outline connects the structures for printing. The terrain contact at 40.5 m is an estimate from the regional elevation samples around the building. Relleu Obert uses this height to remove the surface bulge beneath the footprint. Adjacent mapped buildings retain their own geometry. [Mapped footprint](https://www.openstreetmap.org/way/109862851) · [Background elevations](https://registry.opendata.aws/terrain-tiles/)

The original geometry is CC BY 4.0 and the mapped footprint and positions retain ODbL 1.0. The model is one connected closed solid with 2,750 triangles and a GLB size of 33,780 bytes. The short minaret and the fine tips are intentionally simplified for printing. The tips are about 0.45 mm across at 1:2,500 and should be checked at the slicer. [Geometry licence](https://creativecommons.org/licenses/by/4.0/) · [Map licence and attribution](https://www.openstreetmap.org/copyright)

Local Relleu Obert controls passed at 1:1,250 with OpenFreeMap, at 1:2,500 with OSM building parts and a 27° rotation, and in a partial 1:1,250 crop at −12°. Both complete cases replaced the mapped volumes, retained the neighbouring footprints and honoured the height limit and hidden-buildings modes. The clipped mesh passed the closed-solid audit. Physical printing remains to be checked.

```sh
node scripts/generate-hagia-sophia.mjs
python scripts/render-thumbnail.py models/hagia-sophia/r1/print.glb --camera 1 .4 1.1 --light -.28 .74 .84
```
