# Santuari de Núria · r1

The model covers the basilica and the connected sanctuary-hotel. It keeps the open forecourt between the two return wings, the long gabled roofs, the basilica's rear nave, the lower northern and western service roofs, and the central bell tower with its clock and open frame. The railway station, Sant Gil chapel, pedestrian bridge and lake remain separate places in a regional model. [Ajuntament de Queralbs](https://ajqueralbs.cat/coneix/llocs-dinteres/el-santuari-de-nuria/) · [FGC site plan and buildings](https://contractaciopublica.cat/portal-api/descarrega-document/1329761/3012731EB8F1723B79458A0AB5903822) · [FGC photograph](https://turistren.cat/es/trenes/cremallera-de-nuria/)

## Measurements and registration

The plan is registered to ICGC RTT footprint `988176` and the current orthophoto. The source frame in `survey.json` uses UTM 31N coordinates `[430339.5, 4694211.5]` and the local axes of the wings. The WGS84 anchor is `[2.153589010382, 42.397075141236]`. The GLB uses X east, Y up and Z south in metres. Its foundation datum is 1,957.55 m EGM08D595, with separate foundation heights under the major bodies to seat them on the slope.

The ICGC 1 m surface model puts the nave ridge near 1,979.6 m and the two side wing ridges near 1,976 and 1,977 m. The highest return within the footprint is 1,992.85 m at the top of the bell tower frame. The model fits simple roof planes to those samples. The lower roofs, façade openings and carillon frame are simplified. The main outlines, slopes and roof intersections are retained. The model spans 155.30 × 117.85 m in geographic axes and 35.30 m from the embedded foundation to the top. [ICGC elevations](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Elevacions/Elevacions-territorial/Models-delevacions) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-Territorial)

The associated footprint replaces OpenStreetMap way `33115436` and the equivalent ICGC volume. The OpenStreetMap buffet outline `1063349248` lies within the model and is replaced through geographic overlap. The station, chapel and the separate eastern building remain in the map layer. [OSM sanctuary](https://www.openstreetmap.org/way/33115436) · [ICGC RTT](https://maps.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10)

## Validation

- The GLB has 772 vertices and 1,580 triangles and weighs 19,496 bytes. It passed the closed-solid and orientation audit. SHA-256 is `0a57a997a85f73314edae87183da5d473c113848bbe39c27469a9ce8ed1826cc`.
- Local Relleu Obert tests at 1:1,500 (+8°) with OpenStreetMap buildings and 1:3,000 (−13°) with ICGC used the ICGC MET5 terrain. Both held the absolute height of the tower at 1,992.85 m and confirmed terrain contact at the tower, the two side wings and the nave. The three roof controls differed from the nearest 1 m surface samples by less than 0.75 m. The tests replaced the matching source outlines and retained the railway station. The larger crop also retained the Sant Gil chapel and the eastern building.
- A crop at 1:1,100 (+18°) cut through the sanctuary and produced a closed result. The height-limited and hidden-building modes passed. The smallest openings and the carillon frame are sensitive to nozzle width at smaller scales. Slicing and physical printing remain to be checked.

## Reproduction and attribution

Run `node scripts/generate-santuari-de-nuria.mjs` from the repository root. Pass an output path to write the matching catalogue feature. Render the card image with `python scripts/render-thumbnail.py models/santuari-de-nuria/r1/print.glb --camera .84 .29 1`.

The original cartographic geometry and the ICGC elevation data are credited under CC BY 4.0. OpenStreetMap data retain ODbL 1.0 attribution. The basilica design is credited to Calixte Freixa and the sanctuary-hotel project and later transformation to Josep Danés. Any third-party rights in the built designs, drawings and photographs remain with their holders. [Generalitat heritage history](https://agenda.cultura.gencat.cat/ca/activitat.html/20200525004/santuari-de-la-mare-de-deu-de-nuria-el-ripolles) · [Arxiu Comarcal de la Garrotxa](https://xac.gencat.cat/ca/detalls/ActivitatAgenda/exposicio_Nuria1923) · [ICGC reuse](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright)
