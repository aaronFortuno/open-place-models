# Santa Maria del Mar — r1

Reconstrucció exterior sintètica de la basílica de Barcelona i la Capella del Santíssim adossada al darrere. Conserva les tres franges de coberta, els contraforts, l’absis poligonal, la façana amb rosassa i portalada sortint, i els dos campanars octogonals amb tres cossos superiors oberts. La franja nord addicional de 111,67 m², encara sense identificació completa de les mitgeres, queda fora del model.

El GLB pesa **111.868 bytes**, amb **4.567 vèrtexs i 9.374 triangles** en un únic component tancat. No inclou textures, interiors, escultures ni traceries diminutes.

## Forma i dades de referència

Les 46 peces principals procedeixen del model urbà municipal del barri 04. Es van convertir i extreure prèviament amb LibreDWG, llegint els objectes de manera seqüencial. El generador només necessita el petit `survey.json`; no torna a descarregar ni carregar el document de barri de 396 MB. La procedència i les sumes SHA-256 del ZIP, DWG i subconjunt es conserven a `sourceProvenance`.

El model combina els plans i les cotes municipals amb 116 consultes ICGC inicials i 62 mostres DSM addicionals. Les fotografies de Qestudi, responsables de la direcció d’execució de la restauració, aporten evidència directa de la façana i de les cobertes per trams. Les fotografies oficials de TMB i del Departament de Cultura ajuden a contrastar la portalada, els campanars i els contraforts laterals. S’ha creat geometria pròpia; no s’ha importat cap malla de tercers.

| Element | Restricció mesurada o cartogràfica | Interpretació geomètrica |
| --- | --- | --- |
| Nau central | Cap municipal a 37,818 m ASL; perfils DSM variables per tram | Vessants baixos amb carena i pendents laterals separats; no una llosa plana a ZMAX ni una gran teulada uniforme |
| Terrasses laterals | Pla municipal a 31,826 m; sis cel·les DSM interiors entre 31,744 i 32,009 m | Es conserva aquest pla entre els contraforts |
| Capelles exteriors | Caps municipals a 20,272 m | Franja baixa contínua amb canvis radials a l’absis |
| Contraforts | Projeccions i caps principals a 32,973 m | Masses repetides que sobresurten de les capelles baixes |
| Pantalla frontal | DSM central de 34,628 m al pla dels campanars; coberta de 37,638 m un metre endins | Cornisa central horitzontal més baixa que la coberta posterior i espatlles laterals descendents |
| Remats dels dos contraforts frontals | DSM de 35,990 i 35,688 m; caps CAD de 33,847/33,853 m | Petits remats simplificats, sense reproduir escultures |
| Campanars | Plans octogonals; caps CAD a 44,253 i 48,769 m; corones DSM aproximades a 50,76 i 50,10 m | Cos inferior massís, tres cossos superiors buidats i terrasses esglaonades |
| Remat metàl·lic oriental | Petit màxim DSM de 52,823 m | Quatre nervis sintètics engruixits i un remat local; no es puja tota la torre a aquesta cota |
| Capella posterior | Petjada OSM identificada; cap municipal principal de 23,024 m | Cos baix amb detalls CAD retallats a la petjada verificada |

Les mostres axials només fixen la carena. Els pendents laterals utilitzen seccions amb observacions a ±3 m; els punts extrems de parapet no es converteixen en vessants de tota la nau. S’ometen les petites peces hemisfèriques de la coberta. Les superfícies entre les mostres són una aproximació de pocs plans, no un escaneig complet.

La rosassa és un rebaix circular amb fons massís i un marc sortint. La portalada conserva la fondària, uns pocs arcs amples i el gablet apuntat. Les dimensions dels finestrals, les fondàries, els perfils dels arcs i els pisos intermedis dels campanars s’han estimat a partir de fotografies. Els grans buits dels campanars són passants; la part inferior no s’ha buidat. Els nervis del petit remat s’han reduït i engruixit fins a 0,30 m de diàmetre com a interpretació de silueta, no com a mesura de la forja.

El cap CAD inferior del campanar oriental és un anell interromput. El cos octogonal complet es reconstrueix amb les vuit orientacions del seu octàgon superior i les línies de suport del cap inferior mesurat. Això evita extrudir una secció en C com si fos el cos massís de la torre.

## Implantació i substitució

Marc en metres: X est, Y amunt, Z sud. Ancoratge WGS84 `[2.18200335,41.38380355]`; Y=0 a **2 m ASL**, amb cotes ortomètriques ICGC EGM08D595. El terreny mostrejat de la basílica és de 4,092–5,308 m. Els fonaments queden enterrats dins de la petjada; no s’afegeix plataforma ni terreny artificial, ni s’utilitza `terrainBaseElevation` per aplanar el carrer.

La petjada de la capella limita estrictament les peces posteriors: els fragments de CAD fora de l’àmbit identificat es retallen. L’entrada de catàleg utilitza `replacement.mode: "footprint"` amb els dos identificadors OSM verificats, `osm-way-51260215` i `osm-way-217516630`. No declara l’RTT agregat `icgc-1518365` com a edifici substituïble sencer, perquè inclou també la franja nord exclosa. La comprovació regional ha de conservar aquesta part general i els veïns.

La malla està pensada per a maquetes aproximades, especialment entorn d’1:1.000–1:2.000. A escales més petites el remat metàl·lic i els buits més estrets poden perdre’s en la impressió. No s’ha certificat la resistència física d’una impressió concreta.

## Controls i limitacions

`audit.json` comprova els arrays Float32/índexs realment exportats: coordenades finites, volum positiu, un únic component connex, cap triangle d’àrea zero i absència d’arestes obertes, no manifold o orientades en conflicte. L’enllaç de cada vèrtex és un únic cicle; els controls de superfície i façana també utilitzen raigs directes sobre aquests triangles, sense reconstruir-los en un altre sòlid Manifold. Tota la projecció dels vèrtexs queda dins la petjada amb marge numèric inferior a 0,002 m. Els quaranta entrants de façana comprovats conserven la seva fondària real; dos entrants previstos a l’absis s’ometen perquè la capella adossada cobreix aquella cara.

`controls.json` conté sis contactes, quaranta-nou columnes de superfície, deu raigs de façana i set comprovacions de buit. Els valors `expectedElevation` proven el transport del GLB a Relleu Obert. `sourceComparisons` manté separades les cotes de la font i les diferències; no es confon la coherència del consumidor amb la fidelitat de la reconstrucció.

Hi ha també vuit controls de conservació del pla CAD: sis punts de terrassa corroborats pel DSM i dos controls addicionals propers al front. Aquests dos darrers **no estan corroborats** pel DSM: a ±10 m/b=3 m les cel·les donen 34,11–34,30 m, mentre el pla lateral CAD és de 31,826 m. Es registren com a discrepància del tram frontal i control de regeneració del CAD, no com a precisió física certificada. Altres cel·les de cantell poden barrejar contraforts, murs i cobertes; es conserven les diferències sense elevar automàticament un prisma sencer a un valor aïllat. Un control de cornisa es desplaça 0,2 m endins de la mateixa cel·la per evitar que el raig coincideixi exactament amb la cara vertical.

La neteja final de Float32 és reproduïble amb `scripts/clean-print-mesh.mjs`. Quantitza les coordenades a 0,0001 m (0,1 mm real), fusiona disset arestes coincidents només quan compleixen la condició topològica d’enllaç, retira trenta-quatre cares amb índexs repetits i resol un triangle col·linear subdividint la cara veïna sobre el mateix pla. No elimina una cara degenerada deixant un forat. El desplaçament màxim és de **0,0847 mm real** i el canvi relatiu de volum és de −1,92×10⁻⁷. Es conserven separats deu parells de nodes espacialment coincidents que pertanyen a ventalls topològics diferents; un weld espacial global crearia un pinçament amb quatre cares a la mateixa aresta. La malla final té zero cares d’àrea nul·la i zero enllaços irregulars.

En aquesta construcció es va observar que la unió booleana abans de `simplify(0.015)` no tenia els ventalls diagonals del primer esborrany, però la simplificació global els introduïa entre el terrat lateral i la nau. Aquesta operació s’ha retirat d’aquest generador. La reducció es fa als perfils abans dels booleans, i els controls del pla CAD impedeixen reintroduir el defecte. No és una afirmació general sobre tots els usos del motor.

Els dibuixos de l’article sísmic són una idealització estructural de les voltes i els contraforts; no s’han utilitzat com a aixecament exterior de teulades. La planimetria arqueològica confirma l’absis i la capella adossada, però no resol totes les mitgeres actuals del tram nord. Els detalls no mesurats continuen identificats com a estimacions a `survey.json`. El candidat net ha superat els tres casos locals amb Relleu Obert 0.24.14: complet i girat amb 6 contactes, 49 superfícies, 10 façanes i 7 buits; parcial amb 4 contactes, 37 superfícies i 4 façanes. La franja nord es conserva als quatre punts de control i no s’eliminen veïns. La regeneració final és binàriament idèntica al candidat validat (SHA-256 `3d8b96164d0d9f4e9843d778f7c508609362e615f0e8ce9436ba5a6a83f5d9b8`); els informes autoritatius s’incorporen a la integració.

## Fonts i atribució

Geometria pròpia Open Place Models sota CC BY 4.0; dades espacials municipals/ICGC amb atribució i petjades OSM sota ODbL 1.0. Les fotografies i els plànols són referències de treball amb els seus drets propis i no es redistribueixen dins d’aquests actius.

- [Model urbà municipal](https://portaldades.ajuntament.barcelona.cat/mapes/146) i [descàrrega del barri 04](https://w20.bcn.cat/CartoBCN/getFile.ashx?prod=146.04.47).
- [Elevacions ICGC](https://geoserveis.icgc.cat/servei/catalunya/elevacions-territorial/wms), LiDAR 2021–2023.
- [Basílica a OSM](https://www.openstreetmap.org/way/51260215) i [Capella del Santíssim](https://www.openstreetmap.org/way/217516630).
- [Qestudi: restauració de façanes i cobertes](https://www.qestudi.com/es/node/119), fotografies directes de la intervenció.
- [TMB: basílica i fotografies oficials](https://www.barcelonabusturistic.cat/es/basilica-de-santa-maria-del-mar).
- [Departament de Cultura: Santa Maria del Mar](https://patrimoni.gencat.cat/es/coleccion/santa-maria-del-mar), fotografia lateral des del Fossar de les Moreres.
- [Gestor de la basílica](https://www.santamariadelmar.barcelona/es/el-edificio/) i [Urcotex, restauració de l’absis](https://urcotex.com/ca/projects/restauracio-de-labsis-i-les-cantories-de-lesglesia-de-santa-maria-del-mar-barcelona/).
- [ICC/Irizarry, Podestà i Resemini, article de 2003](https://icgc-web-pro.s3.eu-central-1.amazonaws.com/produccio/s3fs-public/08_2003_irizarry_etal_curvas_71177.pdf), planta i model estructural.
- [Memòria arqueològica de Júlia Miquel i López, 2010](https://calaix.gencat.cat/bitstream/handle/10687/422909/qmem9536.pdf?isAllowed=y&sequence=2), pàgina 8 de PDF.

## Regeneració

```sh
node --max-old-space-size=512 scripts/generate-santa-maria-del-mar.mjs /ruta/temporal/feature.json
python scripts/render-thumbnail.py models/santa-maria-del-mar/r1/print.glb --camera .3 .65 1.2
```

El generador llegeix `survey.json`, escriu la malla i els controls/auditoria, i exporta opcionalment la proposta de Feature. No necessita fonts remotes ni modifica el catàleg. Les dates d’inclusió s’assignen a la integració.

## Validació local a Relleu Obert

Requereix **Relleu Obert 0.24.14 o posterior**: la versió incorpora la substitució per petjada i conserva les cares originals quan el model travessa la vora de la maqueta. Els tres casos del 18 de novembre de 2026 utilitzen MET5 i edificis RTT, amb heap de 256 MiB i operacions seqüencials.

| Cas | Mida | Escala | Gir | Contactes / coberta / façana / buit | Informe |
| --- | --- | --- | --- | --- | --- |
| Complet | 140 × 140 mm | 1:1.000 | +10° | 6 / 49 / 10 / 7 | [Controls](complet-validation.json) |
| Context | 160 × 140 mm | 1:2.500 | −23° | 6 / 49 / 10 / 7 | [Controls](girat-validation.json) |
| Parcial | 65 × 80 mm | 1:1.000 | −19° | 4 / 37 / 4 / 0 | [Controls](parcial-validation.json) |

Les columnes i els raigs llegeixen els triangles exportats directament. Les superfícies integrades coincideixen amb el GLB original; totes les malles de material queden tancades. També passen el límit d'altura de 5 m i l'ocultació dels edificis. Els controls de buit dels campanars són fora del retall parcial.

Els casos complets retiren només icgc-1200303 i icgc-1518367, identificats com les contraparts dels dos campanars i completament coberts pels seus octàgons. Es conserven 17 identificadors generals al cas complet, 74 al context i sis al parcial; en aquest darrer no es retira cap identificador sencer. [Verificació dels campanars](tower-rtt-confirmation.json)

La franja nord de **111,67 m²** es conserva com a volum general fora del model: quatre columnes interiors ho comproven en tots els retalls. La seva coberta general baixa aproximadament 0,63–0,75 m quan la base es recalcula sobre la petjada restant, d'acord amb el criteri de màxim terreny de la font. Aquesta cota general no és un nou aixecament de les cobertes de l'annex. La diagnosi 2D comprova l'extensió conservada i l'absència de cartografia general als punts de control del model. [Complet](footprint-diagnosis-complet.json) · [Context](footprint-diagnosis-girat.json) · [Parcial](partial-footprint-diagnosis.json)

[Maqueta 3MF de revisió](complet-review.3mf) · [Façana](front-review.webp) · [Lateral](side-review.webp) · [Vista obliqua](oblique-review.webp)

La comparació de les tres vistes amb les referències precedeix la publicació. La miniatura i aquestes vistes provenen del GLB net final. La revisió interactiva de la galeria, l'aprovació de semblança de l'usuari, el laminat i la impressió física continuen pendents. La web publicada i CI els comprova l'usuari manualment.
