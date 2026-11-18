# Recinte Modernista de Sant Pau — r1

Reconstrucció sintètica del recinte històric de Barcelona: una vista de conjunt i tretze peces físiques amb ancoratges independents. Inclou Administració, els dos pavellons de porteria, els vuit pavellons de malalts, Operacions i el conjunt nord de Convent/Farmàcia/Cuines. El nou hospital inaugurat el 2009, la Casa de Convalescència i altres edificis externs no formen part d’aquesta revisió.

## Forma i implantació

Les cobertes es reconstrueixen amb vessants, carenes, cúpules de sala de dia i caputxons; els polígons municipals de ZMAX no s’extrudeixen indiscriminadament com a terrats plans. Administració conserva les ales diagonals, el cos central amb frontó, el cos de la torre i el campanar obert. Els entrants principals de façana tenen profunditat real de 0,8–1,1 m; els arcs i els marcs simplificats donen relleu sense reproduir traceries, ceràmica, escultures o baranes fines.

El conjunt nord és una sola peça amb ales diferenciades. La superfície baixa del pati queda a 69,3 m sobre el nivell del mar, d’acord amb CAD, ortofoto i cinc cel·les DSM de 69,260–69,309 m. El volum superior queda obert. La seva petjada inclou aquesta superfície ocupada; no s’ha convertit en un pati obert fins al terreny ni s’ha tapat a l’alçada de les cobertes altes.

El terreny mostrejat varia entre 53,406 i 68,612 m: més de quinze metres de pendent. Cada pavelló té un `anchorElevation` propi, amb Y=0 uns tres metres per sota del mínim DTM mostrejat. La connexió inferior ocupa només la petjada d’aquella peça. El terreny de Relleu Obert amaga aquests fonaments; no hi ha plataforma comuna, sòcol entre pavellons ni terreny sintètic. El GLB de conjunt conserva posicions i cotes absolutes, inclosos els espais entre edificis.

Marc: metres, X est, Y amunt, Z sud; horitzontal WGS84 / EPSG:25831 per a la cartografia d’origen; cotes ortomètriques ICGC EGM08D595. Ancoratge de conjunt: `[2.1743219,41.4127923]`, Y=0 a 50 m ASL. No s’utilitza `terrainBaseElevation`, perquè aplanaria el pendent.

| Peça | Identificador | Y=0 ASL (m) | GLB (bytes) |
| --- | --- | ---: | ---: |
| Edifici d’Administració | `sant-pau-administracio` | 50 | 92708 |
| Sant Jordi | `sant-pau-sant-jordi` | 50 | 2988 |
| Santa Apol·lònia | `sant-pau-santa-apollonia` | 54 | 3132 |
| Puríssima | `sant-pau-purissima` | 53 | 38560 |
| Sant Salvador | `sant-pau-sant-salvador` | 51 | 38036 |
| Mare de Déu del Carme | `sant-pau-carme` | 55 | 38732 |
| Sant Leopold | `sant-pau-sant-leopold` | 54 | 36952 |
| Pavelló d’Operacions | `sant-pau-operacions` | 58 | 16720 |
| Mare de Déu de la Mercè | `sant-pau-merce` | 57 | 34292 |
| Sant Rafael | `sant-pau-sant-rafael` | 56 | 38108 |
| Sant Manuel | `sant-pau-sant-manuel` | 58 | 41996 |
| Mare de Déu de Montserrat | `sant-pau-montserrat` | 59 | 44084 |
| Convent, Farmàcia i Cuines | `sant-pau-convent-farmacia-cuines` | 60 | 14364 |

## Mesurat i interpretat

- **Cartografia municipal:** 187 peces de coberta seleccionades a partir de 327 MESH dins del retall del barri 35, el Guinardó. El DWG es va convertir amb LibreDWG i es van llegir els objectes de manera seqüencial; no es carrega el barri sencer per regenerar el model. `survey.json` conserva les petjades, identificadors CAD, bases i cotes de cada peça. El fitxer municipal indica EPSG:25831, metres, Z_MIN/Z_MAX i data 12/11/2026. Les sumes SHA-256 del ZIP i del DWG són a `sourceProvenance`.
- **ICGC:** 355 consultes DSM de coberta, seccions i agulla, més mostres DTM per sector. Les seccions transversals permeten distingir ràfec i carena. Les carenes provenen de ZMAX; el ràfec s’extrapola 0,30 m per sota de la mediana de les mostres exteriors DSM. Les peces de coberta petites poden donar valors més alts que la carena per caputxons o altres remats.
- **Torre d’Administració:** la cartografia fixa la situació, l’espatlla a 90,615 m i l’antic cap superior a 109,841 m. La graella DSM registra el màxim a 112,473 m, emprat per a l’agulla. Les alçades intermèdies i el dibuix de la gàbia oberta són una interpretació de la fotografia de restauració, no una nova mesura topogràfica.
- **Petjades OSM:** defineixen l’abast físic i ajuden a deduplicar els edificis. La relació institucional 7422814 només delimita el recinte: no és una petjada d’edifici. Els tres ways generals del conjunt nord i el way general de Sant Manuel se substitueixen amb la seva peça detallada corresponent, sense duplicar components.
- **Fotografies i plànols:** s’utilitzen per contrastar les formes construïdes. Els radis/perfils de cúpula, arcs, fondària de finestra, marcs i pisos intermedis de la torre són simplificacions declarades. Les plantes de les ales, posicions i cotes principals provenen de la cartografia i del DSM. Els papers d’obra de Montserrat de 250 MB no s’han utilitzat: no s’han descarregat ni mesurat.

Aquesta és una aproximació exterior per a maquetes, no un aixecament d’arquitectura. No inclou els túnels, interiors, recorreguts d’accés o totes les obertures de planta baixa. Les façanes nord i els pavellons de porteria tenen menys detall que les parts representatives. Les fotografies històriques poden contenir elements modificats posteriorment; l’ortofoto actual fixa l’abast de les cobertes. Les cel·les DSM d’un metre i els polígons de ZMAX poden diferir fins a aproximadament dos metres en punts de remats o superfícies molt corbes; aquestes diferències són visibles a `controls.json`, separades dels controls de transport a Relleu Obert.

## Substitució i comprovacions

Cada fulla té identificadors de substitució propis. Es comproven catorze peces RTT del mateix conjunt, inclosa la peça petita 883115 de la torre dins d’Administració. El registre 883112 del conjunt nord s’assigna una sola vegada. No s’hi inclouen blocs d’edificació amb veïns ni el nou hospital.

`audit.json` comprova índexs, coordenades finites, volum positiu, arestes tancades i tretze components connexos al GLB de conjunt. Cada fulla té un únic component connex i la seva auditoria. La projecció de tots els vèrtexs queda dins la petjada amb una tolerància d’1 mm. S’eliminen cavitats interiors completament segellades, que no aporten forma exterior i no són interiors arquitectònics modelats.

`controls.json` conté cinquanta contactes de fonament, vuitanta-vuit columnes de coberta, trenta-set raigs horitzontals i tres comprovacions de buit; tots tenen `modelId`. Els raigs també comproven que els entrants de façana són oberts a l’exterior i conserven la fondària prevista. Els controls de superfície amb `expectedElevation` descriuen el GLB per comparar-lo amb la seva incorporació a Relleu Obert; `sourceComparisons` conserva per separat les cotes CAD/DSM i les diferències.

La integració local amb Relleu Obert **0.24.13**, ICGC MET5 i edificis RTT passa els tres casos següents el 18 de novembre de 2026. Aquesta versió de Relleu Obert és necessària per carregar les tretze fulles: les versions anteriors limitaven el retall a vuit models.

| Cas | Mida | Escala | Gir | Peces | Controls: contacte / coberta / façana / buit |
| --- | --- | --- | --- | ---: | --- |
| [Complet](complet-validation.json) | 240 × 260 mm | 1:2.000 | +10° | 13 | 50 / 88 / 37 / 3 |
| [Context](girat-validation.json) | 200 × 180 mm | 1:3.500 | −23° | 13 | 50 / 88 / 37 / 3 |
| [Parcial](parcial-validation.json) | 100 × 120 mm | 1:1.200 | −19° | 8 | 19 / 28 / 13 / 2 |

Les columnes de coberta i els raigs de façana coincideixen amb el GLB original després de projectar-lo a la maqueta. Totes les malles de material queden tancades i sense errors d'auditoria. També passen el límit d'altura de 5 m i l'ocultació dels edificis. Els casos complets retiren les catorze contraparts RTT verificades i conserven la resta d'identificadors generals.

També desapareix un fragment vectorial duplicat de Puríssima, de **3,911 m²**, sota l'identificador agrupat `89672950`. El model en cobreix el 96,67%; la franja exterior restant fa 0,130 m² i arriba a 0,072 m de desfasament. La petjada OSM independent i dues peces municipals en confirmen la correspondència. Aquest identificador agrupa centenars de polígons i **no s'afegeix als identificadors de substitució del catàleg**. La diagnosi utilitza la font combinada pròpia de cada retall. Al context ampli, altres polígons del mateix grup ja estan representats per `icgc-1518054`, que continua present després d'incorporar el conjunt. [Diagnosi geomètrica](replacement-diagnosis.json)

[Maqueta 3MF de revisió](complet-review.3mf) · [Conjunt](group-review.png) · [Administració](admin-oblique.png) · [Pavelló](ward-oblique.png) · [Conjunt nord](north-oblique.png)

Els renders locals permeten comparar distribució, cobertes, cúpules i siluetes amb les fonts. No apliquen oclusió ambiental ni ombres projectades: les recessions es comproven també geomètricament amb raigs. La revisió interactiva del visor, l'aprovació de semblança de l'usuari, el laminat i la impressió física continuen pendents. Les peces fines del campanar i alguns detalls de façana poden quedar per sota del gruix útil d'impressió a 1:3.500. No s'ha comprovat la web remota ni CI.

## Fonts i atribució

Geometria pròpia Open Place Models, CC BY 4.0. Dades espacials municipals/ICGC amb atribució i petjades OSM sota ODbL 1.0. No s’ha importat cap malla de tercers ni es redistribueixen fotografies o plànols de referència com si fossin part de la llicència del model.

- [Model urbà municipal, producte 146](https://portaldades.ajuntament.barcelona.cat/mapes/146) i [descàrrega del barri 35](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.35.47).
- [Servei d’elevacions ICGC](https://geoserveis.icgc.cat/servei/catalunya/elevacions-territorial/wms), DSM/DTM LiDAR 1 m 2021–2023.
- [Recorregut del gestor del recinte](https://santpaubarcelona.org/wp-content/uploads/2025/08/Proposta-recorregut-CAT.pdf) i [plànol oficial del campus](https://www.santpau.cat/documents/125011/687716/Pl%C3%A0nol%2BRecinte.pdf/28c61d19-25da-5572-d638-d42f53422d6d?t=1739351739847).
- [Administració: arxiu arquitectònic](https://www.arquitecturacatalana.cat/ca/obres/pavello-de-ladministracio-de-lhospital-de-la-santa-creu-i-sant-pau).
- [Restauració de la torre del rellotge](https://www.arquitecturacatalana.cat/ca/obres/restauracio-de-la-torre-del-rellotge-de-lhospital-de-la-santa-creu-i-sant-pau).
- [Sant Rafael: arxiu arquitectònic](https://www.arquitecturacatalana.cat/ca/obres/pavello-de-sant-rafael-de-lhospital-de-la-santa-creu-i-de-sant-pau) i [arquitectes de la restauració de la cúpula](https://www.bfa.cat/page-3/page-11/).
- [OpenStreetMap, recinte històric](https://www.openstreetmap.org/relation/7422814). Les identitats físiques de cada fulla són a `survey.json`.

## Regeneració

Des de l’arrel del repositori:

```sh
node --max-old-space-size=512 scripts/generate-recinte-modernista-sant-pau.mjs /ruta/temporal/features.json
python scripts/render-thumbnail.py models/recinte-modernista-sant-pau/r1/print.glb --camera .6 1 1.4
```

El generador només llegeix `survey.json`, produeix les catorze malles i les auditories, i pot exportar la FeatureCollection de lliurament. No consulta fonts remotes ni modifica el catàleg. La galeria mostra un únic conjunt; Relleu Obert utilitza les tretze fulles amb `galleryParent` per fer retalls i aplicar els ancoratges propis. Les dates d’inclusió s’assignen a la integració.
