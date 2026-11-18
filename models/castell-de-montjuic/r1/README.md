# Castell de Montjuïc — r1

Reconstrucció sintètica de la maçoneria del conjunt fortificat de Barcelona: cos central amb pati i torre de guaita, quatre garites de coberta, projeccions circulars del coronament amb corbels, casamates i cossos de guàrdia, murs dels baluards, revellí, hornabec i llunetes, i pont d'accés amb quatre arcs fixos i un tram final diferenciat. Els terraplens, els glacis i el fons dels fossats els aporta el terreny de Relleu Obert.

**93.940 bytes · 3.898 vèrtexs · 7.728 triangles · 23 components tancats positius.** Un únic mesh indexat i una única primitiva GLB, sense textures ni transformacions de node. Les estructures separades o sustentades pel terreny no s'han unit amb un sòcol artificial.

## Formes i fonts

Les 40 peces de coberta i volum de referència provenen del model urbà municipal del barri 11, el Poble-sec, de 12 de novembre de 2026. `survey.json` conserva el subconjunt necessari i la procedència: ZIP de 28.476.029 bytes, SHA-256 `9a5bb19681d2203329bd5211fe3cf301d9131db277c5ac1ff0a0c0cb05635155`; DWG SHA-256 `4296455bdd41020864d489ea14ec1ebedb64cb756f4c835fedc2a0ac36fe3ca0`. S'ha reutilitzat la conversió LibreDWG 0.14 existent i l'extracció seqüencial dels objectes, sense carregar el document complet de barri.

Els murs sense coberta utilitzen **29 petjades RTT identificades com a murs**, contrastades amb l'ortofoto vigent de l'ICGC i el plànol oficial de visita. Un traçat preliminar sobre vores de camí/jardineres es va descartar: no forma part de la malla final. Es retenen 678 consultes puntuals DSM/DTM dels murs, a més de les observacions inicials del cos central.

| Element | Dada cartogràfica o observada | Reconstrucció |
| --- | --- | --- |
| Cos central | Cap municipal a **191,280 m ASL** | Franges de coberta planes amb el pati principal obert i un pou de llum/escala separat |
| Sis forats del cap CAD | Pati de 1.869,88 m², buit de 60,37 m² i quatre forats d'uns 4 m² | Els quatre petits estan ocupats per les garites més altes; no es deixen perforacions artificials sota aquestes peces |
| Torre de guaita | Anell a **202,376 m** i petit cap a **204,805 m**; DSM del cap a 204,862 m | Cos quadrat amb terrassa, merlets simplificats i el petit volum superior; no s'eleva tota la torre al màxim DSM aïllat de 212,838 m, associat a elements esvelts/antenes |
| Garites cantoneres | Projeccions municipals i màxim a **194,952 m** | Petits cossos amb remat simplificat, sense reproduir forja o detalls diminuts |
| Cossos de guàrdia | Caps principals a **185,362 / 185,504 m** | Plans i contorns mesurats, amb pas d'entrada obert |
| Pavelló occidental | Cap a **194,664 m**, corroborat pel DSM a 194,681 m | Volum municipal conservat, separat del cos central |
| Murs i llunetes | Petjades i alçades relatives RTT; bases DTM locals | Cada mur conserva una cota nominal pròpia i un fons variable; no es tracta tot el fort com un únic prisma a l'altura màxima |
| Pont d'accés | La guia oficial, pàgina 7 de PDF, descriu quatre arcs fixos i l'últim tram llevadís | Quatre arcs de pedra, una llosa final curta amb buit inferior i una portalada amb dues columnes i timpà; proporcions sintètiques |

En els murs sense cap municipal, la cota nominal combina el mínim DTM del peu amb l'alçada relativa RTT. Quan el percentil 75 de les cel·les DSM difereix menys de 2 m d'aquesta estimació, s'utilitza com a cota de cap; les discrepàncies més grans es conserven com a ambigüitat de vegetació/cel·la de cantell. El mètode, els valors i les mostres originals queden explícits a cada `rttWalls` del fixture. **No són alçats de precisió**: la cota i la forma dels murs sense coberta continuen aproximades, especialment als canvis de pendent.

La validació amb terreny va descobrir dues mancances de suport que es corregeixen en aquest lliurament. En tres panys (`194840`, `194851`, `194868`), part del DTM mostrejat sobre la pròpia vora interpolava la cara vertical en lloc del peu exterior. Els perfils transversals de 0,5 m, amb punts a 1/2/3/6/10 m, situen el costat baix real; les noves bases utilitzen les estacions del peu a 3 m i, només on el perfil ja és estable, a 6 m, amb els mateixos 0,8 m d'encastament. No s'adopten automàticament mínims llunyans del talús, ni es canvien els caps originals. A `194840`, el terreny fi és gairebé pla a 169–169,7 m; l'encaix continua enterrat, encara que MET5 pugui diferir localment. Les dades, localitzacions i decisions són a [wall-support-survey.json](wall-support-survey.json).

També s'havien omès dos panys estrets de la maçoneria que mira al mar. S'incorporen **només els polígons 1206 i 1222 del diagnòstic del membre agregat vectorial 1554220**, de 398,15 i 599,75 m², contrastats amb l'ortofoto i el plànol del gestor. Són bandes de mur, no la superfície del terraplè. El primer inclou la cortina i retorns propers als baluards, i el segon altres sectors del perímetre: no s'afirma que tota la seva longitud equivalgui als 155 m d'un únic pany descrit al plànol. El perfil varia entre trams: la zona oriental és a l'entorn de 184–186 m, el pany occidental passa aproximadament a 177–179 m i l'extrem sud-oest baixa a 169–172 m. Les cel·les d'arbres o cares verticals incompatibles amb la terrassa contigua es descarten. On el DSM no resol el coronament, s'estima la terrassa alta més 0,9 m de coronament, deixant-ho explícit al fixture. Els trams de 20 m conserven aquest canvi de nivell, sense elevar tot el perímetre a 185 m.

L'inventari complet de les petjades petites identifica **nou projeccions circulars de coronament**, contrastades amb l'axonometria del gestor, l'ortofoto i la maçoneria adjacent. Es reconstrueixen com cossos curts amb un corbel inferior aproximat i una connexió curta cap al pany: **no són pilars fins al fossat**. La disposició general com a garites o ressalts de cantonada és recognoscible, però la forma circular per si sola no acredita la funció exacta de cadascuna. No s'afegeixen nou cobertes còniques iguals: la guia només identifica una garita de Sant Carles que conserva la forma cònica primitiva. Les cotes de cap següents es conserven, sense canviar els peus o les corones dels panys que les sostenen.

| Projecció RTT | Cap ASL, m | Suport verificat | Solapament de volum, m³ |
| --- | ---: | --- | ---: |
| icgc-194800 | 186.724 | 17888B | 6.272 |
| icgc-194859 | 184.462 | marine-1206 | 1.949 |
| icgc-194860 | 184.408 | 18100A | 0.385 |
| icgc-194861 | 184.377 | 176FFE | 0.545 |
| icgc-194863 | 182.809 | icgc-194836 | 0.367 |
| icgc-194864 | 179.782 | icgc-194837 | 0.537 |
| icgc-194865 | 179.689 | icgc-194838 | 0.647 |
| icgc-194866 | 178.685 | icgc-194840 | 0.413 |
| icgc-194867 | 185.063 | marine-1206 | 1.875 |

`194800` és la cantonada arrodonida d'un cos cobert de l'hornabec: el 80,8% de la seva petjada ja coincideix amb el CAD `17888B`. `194863` i `194864` rematen els angles del front occidental; `194865` i `194866`, els extrems de les llunetes. En aquests darrers casos els polígons font només arribaven a tocar-se per una punta; la connexió curta s'endinsa entre 0,23 i 0,30 m dins el pany real. El perfil del corbel, la fondària de 3 m i l'encastament lateral continuen essent interpretacions sintètiques documentades, no detalls aixecats amb un alçat de precisió.

Els nou controls centrals de contacte amb terra s'han substituït per comprovacions del suport físic adequat. Cada cos té volum positiu solapat amb el seu pany, comparteix component de la malla Float32 amb aquell suport i conserva un recorregut lateral interior sense creuar aire. Els contactes amb terra es prenen als panys sustentants. A `194866`, els vuit punts DTM de 0,5 m situats a 3 m del centre són entre 168,774 i 169,404 m; el cap és a 178,685 m. Aquesta diferència no justifica un cilindre de nou metres: el cos es recolza al coronament de la lluneta. La classificació, les petjades, els candidats de suport i les mostres queden a `projectionClassification` i [wall-support-survey.json](wall-support-survey.json).

El tauler segueix la petjada directa RTT `icgc-173781`, classificada com a `tauler de pont` per la font primària. L'amplada varia de 4,664 a 4,912 m. Cinc cel·les DSM exposades fixen un pendent longitudinal de 3,077%: la cota baixa de 176,478 m a l'entrada fins a 175,659 m a l'extrem exterior. La desviació màxima de l'ajust respecte d'aquelles cel·les és de 0,019 m; no és una certificació d'exactitud del LiDAR. Quatre punts addicionals als centres reals dels arcs coincideixen amb el pla amb diferències menors de 0,011 m. El control del tram curt també conserva aquest pla després de buidar la porta.

El pont i la portalada es registren contra la façana municipal `17A461`. L'eix estimat inicialment sobre l'ortofoto es va substituir pel del tauler RTT abans de validar la revisió. Els perfils dels arcs, la seva distribució, les baranes i els 3,8 m reservats al tram final llevadís són interpretacions visuals dins la petjada i el pendent mesurats; no s'eleva el pont per compensar el terreny d'una altra resolució.

La torre de guaita es recolza al pati d'armes: el seu cos conserva la base municipal de 182 m, mentre la petita peça superior comença a 201 m. La seva petjada de 71,09 m² no se superposa a les franges de coberta del cos central. El control de contacte comprova el cos sencer al terra; el cap de 204,805 m continua essent una peça superior.

El [perfil i les mostres del pont](bridge-source-profile.json) conserven la petjada original, l'ajust, els punts de validació i els raigs sobre el GLB final. Els DTM de 0,5 m als quatre centres són 170,284 / 170,225 / 170,209 / 170,138 m ASL; al tram curt, 170,453 m. Els buits d'aquest model es comproven separadament dels que conserva cada terreny regional. Els diagnòstics de l'eix anterior s'han retirat de la revisió final.

S'ometen antenes, banderes, canons, mobiliari, vegetació, interiors i decoració petita. No s'han reutilitzat malles artístiques ni textures; els volums es reconstrueixen amb el generador a partir de les dades espacials i les interpretacions documentades.

## Terreny, ancoratge i substitució

Marc en metres: **X est, Y amunt, Z sud**. Ancoratge WGS84 `[2.16505,41.36270]`. La conversió del CAD és EPSG:25831 → WGS84 → metres est/nord respecte de l'ancoratge, sense confondre una resta UTM amb aquest marc geogràfic.

El `anchorElevation` final és **165,429999798 m ASL**, datum ortomètric ICGC EGM08D595. És la referència comuna de col·locació al mínim de la malla; les altres bases continuen a les seves cotes locals. El generador normalitza el mínim Float32 a Y=0 i modifica el datum exactament en el mateix valor, conservant totes les cotes absolutes. No s'ha afegit volum per aconseguir-ho.

Els peus dels murs segueixen el costat baix del DTM amb aproximadament 0,8 m d'encastament; la geometria de cobertes conserva les bases municipals. **No s'utilitza `terrainBaseElevation`, ni una plataforma horitzontal, ni un nou fons comú de fossat.** La terra entre els murs, les terrasses i el pati continuen essent el terreny de la font regional. Per això la previsualització aïllada del GLB mostra fonaments i components que, a la maqueta amb terreny, queden parcialment enterrats. El model no és una base autoportant de tot el turó.

La proposta utilitza `replacement.mode: "footprint"`. Declara el cos central `icgc-1493516`, el pavelló `icgc-1493506` els 29 murs RTT representats i el tauler `icgc-173781`. El primer identificador **no representa tota la fortalesa**: abans d'assemblar les garites, la coincidència amb el cos central CAD era de 97,27% de la font / 97,55% del CAD. Les altres construccions generals fora de la maçoneria modelada s'han de conservar.

Consumidor requerit: **Relleu Obert 0.24.15 o posterior**, amb substitució de transport acotada geogràficament, substitució per petjada i preservació de cares en els retalls de malla.

L'identificador vectorial de transport `618920730` agrupa tres ponts diferents. `replacement.transport` limita la retirada de la seva contrapart al bbox del tauler RTT `[2.1668039261963434,41.36368196921434,2.1671083278829575,41.36384277331382]`; els altres membres es conserven. Aquest ID no s'afegeix a la llista global de substitució d'edificis.

La petjada és la projecció conjunta de la maçoneria, amb els seus patis i espais intermedis oberts. No és un polígon de recinte que elimini indiscriminadament totes les dades interiors del castell. No s'ha repetit una descàrrega de l'API d'edició OSM després dels errors previs 429/406. Els dos panys afegits reutilitzen exclusivament el cache vectorial local ja disponible d'OpenFreeMap; la resta de la identificació es basa en les fonts municipals i RTT verificades.

L'extensió completa és d'uns 471 × 471 m. A 1:2.000 ocupa aproximadament 235 mm de costat; a 1:3.000, uns 157 mm. Les arcades i els murs principals es prioritzen per a aquestes escales. Les finestres, els merlets i les baranes més estretes poden perdre's a escales més petites; la resistència i el resultat del laminat no s'han certificat amb una impressió física.

## Auditoria i comparació

`audit.json` verifica els arrays Float32 i índexs del GLB exportat: zero cares d'àrea nul·la, cap aresta oberta, no manifold o amb orientació conflictiva, i enllaç de cada vèrtex regular. Els 23 components es netegen i auditen individualment abans de concatenar-los a la primitiva. No es fa un weld espacial global ni una simplificació 3D global que pugui alterar els plans de coberta.

La quantització és de 0,0001 m, **0,1 mm real**. La projecció dels vèrtexs supera la màscara com a màxim en 0,0000649 m per arrodoniment numèric. El llindar de comprovació de 0,002 m és numèric, no una afirmació de precisió de les fonts.

`controls.json` prepara **27 contactes, 38 superfícies, 17 raigs de façana, 9 suports laterals i 8 buits**: pati, pou de llum, quatre arcs, tram final del pont i porta. Les mesures llegeixen directament els triangles exportats. Els cinc controls de conservació de caps municipals i els dos controls del pla del tauler es contrasten amb les cotes del fixture i, on escau, amb el DSM independent. La localització original d'aquesta cel·la DSM es conserva separada del punt posterior de control del GLB; els controls de transport `expectedElevation` no certifiquen per si sols la semblança amb el món real.

Les [vistes frontal](front-review.webp), [lateral](side-review.webp) i [obliqua](oblique-review.webp) comparen el conjunt amb el plànol oficial i l'ortofoto. La [vista propera de l'entrada](entrance-review.webp), la [vista dels quatre arcs](bridge-review.webp) i la [vista del cos central](core-oblique-review.webp) mostren un retall visual del cos central i dels seus suports; aquest enquadrament no modifica el GLB ni presenta les cares tallades com un sòlid exportable. Aquesta revisió comprova la disposició i les formes principals; no substitueix l'aprovació visual de l'usuari.

Els quatre arcs i el buit sota el tram llevadís són oberts a la malla. El DTM de 0,5 m i el perfil del GLB es comparen a bridge-source-profile.json; l’intradós dels arcs és una reconstrucció sintètica, no una mesura arquitectònica. El MET5 i la triangulació regional ocupen gairebé tot el centre de l’arc exterior i del tram curt. La validació registra aquestes dues limitacions separadament dels buits clars; no s’ha elevat el pont ni inventat un fons de fossat.

### Controls locals amb Relleu Obert 0.24.15

Les tres generacions utilitzen MET5 i edificis RTT, sense modificar les dades originals. La malla regenerada des del fixture és idèntica byte per byte al SHA publicat. Els informes contrasten els triangles exportats, els materials finals i els canvis entre model de font, altura limitada de 5 m i ocultació.

| Cas | Peça / escala / gir | Peus | Suports laterals | Superfícies | Façanes | Buits clars / límits de terreny |
| --- | --- | --- | --- | --- | --- | --- |
| [Complet](relleu-obert-complet.json) | 220 × 220 mm / 1:3.000 / +10° | 27 | 9 | 38 | 17 | 6 / 2 |
| [Girat](relleu-obert-girat.json) | 220 × 200 mm / 1:4.000 / −23° | 27 | 9 | 38 | 17 | 6 / 2 |
| [Parcial](relleu-obert-parcial.json) | 100 × 110 mm / 1:1.500 / −19° | 4 | 2 | 8 | 11 | 5 / 2 |

El cas complet conté tots els vèrtexs del model. Les malles finals de materials són tancades i positives. Els nou camins de suport queden dins de la maçoneria, sense travessar aire; cada projecció comparteix component amb el seu suport al GLB. El parcial comprova només els dos suports que entren al retall.

Només es retiren les contraparts RTT icgc-1493506 i icgc-1493516 al cas complet; les altres 21 identitats generals romanen. Tres columnes de construccions no modelades de l’agregat vectorial 1554220 es mantenen, amb variacions de cota de −0,038 a +0,193 m pel mostreig de terreny. La substitució de transport queda limitada al tram verificat de 618920730. Els altres dos ponts del mateix agregat es conserven en les regressions específiques del consumidor.

| Separació màxima sota el model damunt del terreny/revestiment, en mm impresos | Arc exterior | Tram llevadís |
| --- | --- | --- |
| Complet | 0,045 | 0,142 |
| Girat | 0,024 | 0,035 |
| Parcial | 0 | 0,124 |

Aquests dos centres no es donen per nets o imprimibles amb el terreny gruixut. Per registrar la limitació, el control comprova que el buit de maçoneria continua obert i que qualsevol material que l’ocupa correspon al terreny o al seu revestiment, sense un tauler o volum independent superposat. Una font de terreny més fina pot canviar-ne la visibilitat.

[Auditoria del carregador RO](relleu-obert-mesh-audit.json) · [3MF complet per revisar](relleu-obert-review.3mf) · [Vista del retall amb terreny](context-review.webp). La vista de context i el 3MF incorporen també dades ICGC i cartografia © OpenStreetMap contributors / OpenMapTiles / OpenFreeMap; El terreny i els altres objectes de context no estan inclosos en el GLB de maçoneria.

La revisió interactiva del visor, l’aprovació de semblança, el laminat i la impressió física continuen pendents. La web publicada i CI els comprova l’usuari manualment.

## Atribució i regeneració

Reconstrucció pròpia Open Place Models sota **CC BY 4.0**. Les fonts municipals i ICGC conserven les seves condicions **CC BY 4.0**. Els dos panys vectorials són dades espacials derivades d'**OpenStreetMap, sota ODbL 1.0**, distribuïdes amb crèdits a OpenStreetMap contributors, OpenMapTiles i OpenFreeMap. L'etiqueta espacial combinada `CC-BY-4.0; ODbL-1.0` identifica aquesta procedència mixta; la llicència del treball propi no elimina les obligacions de les dades de base. Els PDF i les fotografies de referència mantenen els seus drets propis i no es redistribueixen dins d'aquesta revisió.

`vectorMasonryProvenance` i `supportWalls` conserven els dos polígons literals, el catàleg d'origen `https://tiles.openfreemap.org/planet`, les tessel·les **14/8290/6120** i **14/8290/6121**, la data del cache **2026-11-18T17:51:39.324Z** i el SHA-256 del fitxer `complet.v8`: `eedad8a31f19813815fa600995d4b18e8b593dcd9c9560e3181b4e95486cd370`. Els índexs 1206/1222 corresponen al fitxer de diagnòstic després del preprocessament; les mateixes geometries són els polígons **1209/1227 de `vectorFeatures` al cache original**, verificats per igualtat literal dels arrays WGS84 i guardats també com `sourceGeometryWGS84`. La resposta TileJSON original amb el nom concret del snapshot no es va conservar; no s'atribueix a aquests polígons cap versió remota baixada posteriorment. La geometria exacta de l'entrada necessària per regenerar-los queda al fixture. **1554220 no s'afegeix a cap llista global d'identificadors substituïts**: el mode de petjada només retalla la maçoneria local representada, preservant els altres membres de l'agregat.

- [OpenFreeMap: procedència i crèdits](https://openfreemap.org/quick_start/) i [OpenStreetMap: copyright i ODbL](https://www.openstreetmap.org/copyright).
- [Model urbà municipal](https://portaldades.ajuntament.barcelona.cat/mapes/146) i [barri 11](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.11.47).
- [Plànol oficial actual del castell](https://ajuntament.barcelona.cat/castelldemontjuic/sites/default/files/fitxers/biblioteca/castell_de_montjuic_cat_v21.pdf).
- [Guia oficial catalana](https://ajuntament.barcelona.cat/castelldemontjuic/sites/default/files/fitxers/biblioteca/cmj_guia_20oct14_cat.pdf), pàgina 7 de PDF: fotografia de la façana, plànol històric i descripció del pont.
- [RTT ICGC](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Referencial-Topografic-Territorial), [servei de murs/edificis](https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10), [elevacions](https://geoserveis.icgc.cat/servei/catalunya/elevacions-territorial/wms) i [condicions de reutilització](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio).

```sh
node --max-old-space-size=256 scripts/generate-castell-de-montjuic.mjs /ruta/temporal/feature.json
python scripts/render-thumbnail.py models/castell-de-montjuic/r1/print.glb --camera .8 1.1 -1
```

El generador només necessita el fixture inclòs, escriu GLB, auditoria i controls, i exporta opcionalment la Feature temporal. No descarrega dades ni modifica l'índex. SHA-256 del candidat: `6a2833f76bf89f728188b33c7e9278d5a877ab06ad418e31e756611a35977524`.
