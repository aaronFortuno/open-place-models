# Museu de les Ciències Príncep Felip · r1

This original exterior reconstruction represents Santiago Calatrava’s museum in València as one solid. The asymmetrical cross section climbs from the inclined north curtain wall to a high longitudinal ridge and descends across the main roof to the serrated south edge. Twenty-one bays repeat at 10 m intervals, with raised roof folds and recessed façade panels. The model includes inclined end supports, the attached north terrace and the south balcony with its two approach ramps. [Museum description](https://cac.es/museu-de-les-ciencies/) · [Architect’s project](https://prod.calatrava.com/projects/ciudad-de-las-artes-y-de-las-ciencias-valencia.html) · [Construction account, pp. 9–14](https://informesdelaconstruccion.revistas.csic.es/index.php/informesdelaconstruccion/article/view/688) · [UPV roof geometry analysis, pp. 251–259](https://riunet.upv.es/bitstream/10251/31662/1/TESIS%20FJ%20SANCHIS.pdf)

## Survey and placement

The WGS84 anchor is `[-0.35159668864, 39.45585641836]`, at ETRS89 / UTM 30N `[727866.85567, 4370713.462227]`. The long axis lies 38.88° south of UTM grid east. The GLB uses metres, with X east, Y up and Z south. Its flat underside uses a 2 m EGM08 working elevation based on PNOA terrain at about 2–3 m around the forecourt. A Terrarium sample at the centre returned 14.72 m because the broad roof is present in the general elevation surface. The candidate's `terrainBaseElevation` of 2 m replaces that surface beneath the footprint and blends into the surrounding terrain over 30 m. [PNOA elevation services](https://pnoa.ign.es/pnoa-lidar/visualizadores-y-servicios-web)

The 5 m surface raster records a ridge maximum of 57 m at `[727857.5, 4370737.5]`. The model uses the same 57 m summit, north terrace levels near 10 m and a south balcony at 21 m. The 25 cm orthophoto and 2.5 m normalised building surface helped establish the roof folds, terraces and approach ramps. The shapes of individual supports and the façade recesses are approximations. [PNOA orthophoto services](https://pnoa.ign.es/pnoa-imagen/visualizadores-y-servicios-web)

The candidate footprint follows the orthophoto and uses a 0.65 m clearance from the three adjoining OpenFreeMap water polygons. The registration preserves the large roof and avoids the neighbouring basins when Relleu Obert checks whether the model has a land base. The explicit source references identify the museum relation and its two member ways, plus the northern terrace as a separately mapped roof attached to the museum. OpenFreeMap groups the two halves of the museum and terrace under IDs shared with other structures. The feature leaves those IDs to Relleu Obert’s per-fragment overlap rule. [Museum relation](https://www.openstreetmap.org/relation/14693200) · [Attached north terrace](https://www.openstreetmap.org/way/1103800106) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright)

## Local validation and reproduction

The 27,104-byte GLB contains 1,094 vertices and 2,188 triangles. The solid audit found one connected component, positive signed volume, zero boundary edges and zero inconsistent edges. Its Y bounds are 0–55 m. The 21 roof bays have 10 m spacing, equivalent to 10 mm at 1:1,000 and 4 mm at 1:2,500. The ribs and recesses are part of the same closed shell, and the side supports and ramps connect to that shell. The ramp and balcony overhangs are subject to physical print and support review.

Three local Relleu Obert selections passed with the corrected terrain base and a vertical exaggeration of 1.

- At 1:2,500 with original OSM, the museum and its north terrace were replaced. L’Hemisfèric and l’Umbracle remained visible. The height limit and hidden-building modes passed. The underside embeds 1.25 m below the corrected terrain at the anchor.
- At 1:4,000 rotated 26° with OpenFreeMap, the two grouped features retained four and five independent fragments respectively, and building `234337842` remained visible. The underside embeds 0.80 m below the corrected terrain at the anchor.
- At 1:2,400 rotated −19° and shifted 115 m east with original OSM, the selection cut through the museum and the resulting mesh stayed closed.

The roof reached 57 m orthometric in all three cases. The catalogue footprint has zero intersection with the captured OpenFreeMap water polygons.

```sh
node scripts/generate-museu-ciencies-valencia.mjs /path/to/candidate-feature.json
python scripts/render-thumbnail.py models/museu-ciencies-valencia/r1/print.glb --camera -1.2 .30 .42 --light -.55 .78 .30
```

The optional output path writes the catalogue feature. `survey-layout.json` records the elevation requests and checksums, fit controls, identifiers and the water clip. The mesh and thumbnail are generated directly from the model source. The GLB SHA-256 is `deadebde7ec8c3177c4d3c56bcaacd3fabaeb9fe0dee6d47a2d0c11bfdbc97eb`.

## Rights and licence

Following maintainer review, Open Place Models contributors release their independently reconstructed mesh under CC BY 4.0. That licence applies solely to the contributed geometry. Separate third-party rights may apply to the building’s image and design. Ciudad de las Artes y de las Ciencias S.A.U. states that it holds rights over those elements, including reproduction and transformation across media. Article 35.2 of Spanish intellectual property law lists specific media for works in public spaces. Its application to redistribution of a printable mesh remains unresolved here. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [CAC rights notice](https://servicios.cac.es/portalocupacio/ofertas/139/Manuales_Temario/IV.2.pdf) · [Spanish intellectual property law](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930#a35)

PNOA elevation data are credited to PNOA / Instituto Geográfico Nacional under CC BY 4.0. The map-derived clearance and source identifiers are credited to OpenStreetMap contributors via OpenFreeMap under ODbL 1.0. [PNOA product licences](https://sistemacartograficonacional.gob.es/tablaProductos.php) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright)
