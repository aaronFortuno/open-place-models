# Khafre and Menkaure

These are simplified solids of the two pyramids that join Khufu in the Giza revision. The modelled objects are the pyramid bodies. The surrounding courts, mortuary temples, subsidiary pyramids and interior passages are separate.

## Plan and vertical reference

The base centres and four original casing corners come from the Glen Dash Foundation's 2018 WGS84 release, which registers Petrie's measurements. Its published base elevations above mean sea level are 70.5 m at Khafre and 73.1 m at Menkaure. The dataset identifies the elevation reference as mean sea level. The model adopts these values as the local contact elevations. Both use a flat model base at Y=0, with X east and Z south. [Dash survey notes](https://www.dashfoundation.org/Surveys-at-Giza.htm) · [Survey coordinates and elevations](https://dashfoundation.com/downloads/archaeology/survey/Giza-Corner-Points-2v17.kmz)

| Pyramid | WGS84 centre | Mean base side | Surviving height | Summit platform |
| --- | --- | ---: | ---: | ---: |
| Khafre | 31.130740° E, 29.975980° N | 215.33 m | 136.398 m | Approx. 2.74 m wide |
| Menkaure | 31.128259° E, 29.972500° N | 105.50 m | 61.874 m | Approx. 4.88 m wide |

The summit dimensions follow Perring's measurements of the surviving monuments, 447 ft 6 in and 203 ft in height. The platforms were recorded as approximately 9 ft and 16 ft square. The recent ScIDEP field paper also reports 136.4 m for Khafre. The decimal places preserve the unit conversion. The survey's estimates of the casing baseline define the two model footprints. [Perring's measurements in Vyse, vol. II, pp. 117 and 120–121](https://upload.wikimedia.org/wikipedia/commons/4/4c/Operations_Carried_on_at_the_Pyramids_of_Gizeh_in_1837-_with_an_Account_of_a_Voyage_into_Upper_Egypt_in_3_Vols.Vol._II_%28IA_dli.granth.37586%29.pdf) · [ScIDEP field report](https://doi.org/10.1063/5.0273135)

## Exterior reconstruction

- **Khafre.** The model keeps the limestone casing at the top, a shallow irregular edge underneath it, and broad masonry steps on the exposed core. Perring reported that the lower boundary of the surviving upper casing lies 130–160 ft below the summit. The selected boundary runs from 88.0 to 96.6 m above the base. The band below it uses Petrie's observed face slope and measured lower courses. The exact casing edge, grouped upper courses and continuous lowest ledge are approximations. The difference between Perring's former and surviving base widths sets the nominal inset of the exposed core. [Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/en/monuments/pyramid-complex-of-khafre-khefren) · [Petrie, 1883, §§65–69](https://petrieproject.com/book/the-pyramids-and-temples-of-gizeh) · [Exterior photograph](https://smarthistory.org/pyramid-of-khafre-and-the-great-sphinx/)
- **Menkaure.** The lower grouped bands follow the measured rhythm of the granite courses, using Petrie's 16th-course elevation of 16.39 m as a boundary. Individual surviving granite blocks and their surface finish are simplified into this lower profile. The north scar follows field descriptions and Vincent Brown's 2018 photograph, with an approximate mouth between 16.4 and 43.4 m above the base and a maximum inset of 8 m. The profile is a stylised exterior depression. Perring's excavation widths refer to particular cuts and Hawass's excavation report confirms the scar above the entrance. [Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/en/monuments/pyramid-complex-of-menkaure/) · [Petrie, 1883, §§79–84](https://petrieproject.com/book/the-pyramids-and-temples-of-gizeh) · [Hawass, 1997](https://gizamedia.rc.fas.harvard.edu/images/MFA-images/Giza/GizaImage/full/library/hawass_mdaik53_1997.pdf) · [Section and reported depth, fig. 10](https://archiv.ub.uni-heidelberg.de/propylaeumdok/2560/1/Vortragsfassung%2520%2520Florenz%2520Englisch%252028.8-1.pdf) · [Vincent Brown, 2018, CC BY 2.0](https://commons.wikimedia.org/wiki/File:Pyramid_of_Menkaure_(50035374516).jpg)

The survey-based footprints overlap the corresponding OpenStreetMap references by 95.05% for Khafre and 84.32% for Menkaure, measured by intersection over union. The mapped polygons are narrower than the surveyed casing baseline. Only ways `4420396` version 66 and `4420398` version 53 are designated as explicit replacement targets for the two pieces. [OpenStreetMap Khafre](https://www.openstreetmap.org/way/4420396) · [OpenStreetMap Menkaure](https://www.openstreetmap.org/way/4420398)

## Regeneration and checks

Run `node scripts/generate-giza-companions.mjs` from the repository root. It reads `companion-measurements.json`, writes `khafre.glb` and `menkaure.glb`, and takes an optional directory in which to write the individual catalogue features. Both geometry assets are CC BY 4.0 with credit to Open Place Models contributors and the documented sources. The OpenStreetMap reference outlines in the fixture are © OpenStreetMap contributors, ODbL 1.0. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright)

| GLB | Bytes | Vertices | Triangles | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Khafre | 18,204 | 698 | 1,392 | `ef1d4dd799a063388bc4c050761ab3f234390079fcdfe9fdac5ab1ccdc102b4a` |
| Menkaure | 10,152 | 354 | 704 | `0848c6e890e42d7f373d2edc805d6f2dd47303815b33b1e683a7a329b00c4d95` |

An independent mesh audit found one watertight, consistently oriented shell for each asset, with positive volumes of 2,154,423.94 m³ and 254,089.32 m³. Both match the declared height and their surveyed base polygons within 6 mm in the local WGS84 tangent plane. The audits found no coincident vertices, degenerate triangles or non-manifold edges.

At 1:5,000, Khafre spans approximately 43 × 43 × 27 mm and Menkaure 21 × 21 × 12 mm. At 1:10,000 those dimensions halve. Menkaure's scar mouth is up to 1.0 mm across at 1:5,000 and 0.5 mm at 1:10,000. Fine treads and Khafre's casing edge are softer at 1:10,000 with a 0.4 mm nozzle. Physical printing remains to be checked.
