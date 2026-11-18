# Monestir de Montserrat — r1

Reconstrucció exterior sintètica del nucli connectat de l’abadia: basílica i absis, galeries i contraforts, campanar de Santa Caterina, ales monàstiques i claustres, façana amb la torre de Folguera, Escolania i Torre del Clericat. Inclou els fronts construïts visibles del Museu sota les places. Els hotels independents, les estacions, el transport i el massís queden fora.

El GLB pesa **73.256 bytes**, amb **2.993 vèrtexs i 6.094 triangles**. Té tres components tancats: el cos principal i dos trams separats de façana sota les places. El terreny del consumidor aporta les places, els patis a cel obert i el pendent; no s’ha creat cap plataforma comuna, cingle artificial ni llosa que cobreixi les places.

## Forma exterior i fonts

La petjada RTT `icgc-1271519` és un agregat de 11.380,18 m² en la font nativa. El seu atribut d’altura, 56,24 m, no s’aplica a tots els membres. El mapa `scope-review.webp`, contrastat amb el plànol oficial de 2025 i l’article tècnic de restauració, identifica totes les parts: ales de ponent, basílica i absis, Escolania, Museu sota places i un connector de terrassa/escala obert. Els hotels i les estacions són altres petjades independents.

L’article tècnic de CAATEEB de 2010, pàgines impreses 60–65, documenta la retirada de la gran coberta de 1874 i dels pisos afegits a l’absis. La secció de 1994 i les fotografies de l’obra mostren la coberta central baixa, les galeries laterals planes amb contraforts exposats i el remat octogonal baix. No es trasllada una cúpula interior a l’exterior. Les dimensions de 58 × 15 × 23 m publicades per l’abadia són interiors i no s’han convertit en dimensions exteriors de teulada.

| Part | Dada observada | Reconstrucció |
| --- | --- | --- |
| Torre principal de Folguera | Diverses cel·les DSM properes a 763,1 m ASL | Cos rectangular alt, coberta a 763,1 m i quatre obertures arquejades per cara al coronament; fondàries i arcs estimats |
| Nau de la basílica | Carena DSM de 745,345 m; secció tècnica baixa | Perfil facetat de 742,65 a 745,45 m; absis superior semicircular i vuit contraforts per banda |
| Galeries i absis baixos | Galeries entorn de 738 m; absis central DSM de 738,341 m | Terrats laterals a 738,35 m i tres absis baixos amb corbes poligonals; no l’antic tercer pis |
| Remat octogonal exterior | DSM de 747,969 m i forma baixa a la secció | Tambor i coberta octogonal truncada fins a 748 m; perfil simplificat |
| Campanar de Santa Caterina | Petjada octogonal; màxim DSM proper a 763,97 m; l’arquitecte descriu un coronament modern obert de 18 m | Cos de pedra fins a 746 m i estructura oberta de vuit nervis fins a 764 m, amb gruixos reforçats; no una agulla massissa |
| Escolania i Clericat | Plantes, alçats i seccions parcials COAC; DSM | Ales amb cobertes de quatre vessants, pati elevat obert a 735,8 m i torre amb carena a 745,85 m |
| Ales monàstiques occidentals | Ortofoto i graella DSM | Tretze trams principals de coberta, amb ràfecs i carenes diferenciats entre 737,8 i 750 m |
| Museu sota les places | Plànol oficial, secció de restauració i petjada RTT | Només façanes de retenció exposades, d’1,5 m de gruix aproximat; la superfície de plaça segueix sent terreny |

Els dibuixos COAC de l’Escolania són un projecte parcial, no un aixecament complet actual. Les formes es contrasten amb l’ortofoto i les elevacions ICGC. Les cornises, petits nervis, finestres menors, xemeneies, baranes i ornamentació no es reprodueixen. L’espaiat dels contraforts, els arcs, els gruixos del coronament metàl·lic i les fondàries de façana són aproximacions. Les imatges i els plànols de tercers són referències de treball; no es redistribueixen com a textures ni actius del model.

## Terreny, coordenades i substitució

Les coordenades de l’ortofoto passen d’ETRS89/UTM31 a WGS84 i després al marc de metres geogràfics del consumidor. El GLB utilitza X est, Y amunt i Z sud. Les cotes són ortomètriques ICGC EGM08D595. El generador normalitza el mínim Y a zero i fixa `anchorElevation` a **705,192000389 m**; els decimals identifiquen exactament el datum de la malla, no una precisió topogràfica equivalent. Les cotes absolutes es conserven.

La fixture reté 452 mostres DSM de cobertes, 122 punts de deu perfils amb DSM i DTM, i 505 consultes DTM en 172 estacions del perímetre. Cinc estacions sense peu exterior resolt s’exclouen. Es fan servir 167 estacions verificables, amb mostres a 3 m del cantell i comprovacions a 6 m; no es tracta una interpolació sobre una paret com si fos el peu real. El fonament enterrat de 0,8 m i la interpolació entre estacions són estimacions. Un únic datum no obliga a posar tots els peus a la mateixa cota: les bases varien amb el pendent i els patis conserven les cotes arquitectòniques conegudes.

Les particions cobreixen l’agregat original amb una diferència numèrica inferior a 0,001 m². La seva àrea en el marc de metres geogràfics és 11.395,98 m², diferent de l’àrea UTM nativa per la convenció de projecció local. El Museu és una part física documentada d’aquest mateix conjunt encara que la seva coberta sigui plaça. Per això es declara `icgc-1271519` com a contrapart completa verificada. `replacement.mode: "footprint"` preserva altres fonts fora de l’envolupant i requereix Relleu Obert 0.24.13 o posterior. No es declaren IDs d’hotels ni de transport.

Els panys adjacents dels pisos superiors tenen un solapament de construcció de **2 cm**, inferior a la precisió de les dades, per evitar unions booleanes coincidents. L’envolupant inclou aquest marge. No s’ha aplicat una simplificació global que pugui deformar plans de coberta. Les superfícies de plaça i els dos patis cartogràfics no s’emplenen amb aquest solapament.

## Validació i regeneració

`audit.json` comprova el Float32 exportat: cap triangle d’àrea nul·la, cap aresta de longitud zero, cap aresta oberta o amb orientació inconsistent i un únic cicle d’enllaç per vèrtex. Els tres components tenen volum positiu. La neteja local quantitza a 0,1 mm real, amb desplaçament màxim de 0,080 mm; només fusiona arestes coincidents amb condició topològica vàlida i repara cares col·lineals sense obrir forats. La projecció de tots els vèrtexs queda dins de l’envolupant amb tolerància numèrica de 2 mm (màxim observat: 0,068 mm).

`controls.json` conté 11 peus exteriors, 34 columnes de superfície, cinc raigs de façana, cinc controls de buit, la comprovació de solapament del coronament sobre el campanar real i una connexió lateral de l’ala posterior de l’Escolania. Els cinc controls DSM independents s’asserten en regenerar: diferències de −0,035 m a Folguera, +0,018 m a la nau, +0,031 m al remat baix, −0,129 m a l’absis i −0,643 m al Clericat. Les toleràncies de 0,25–1,5 m reflecteixen la simplificació i la posició de les cel·les, no una precisió certificada. Les cotes `expectedElevation` dels altres controls comproven que el consumidor transporta correctament el GLB; no són mesures independents del món real.

La integració va descobrir quatre controls inicials exactament sobre arestes de petjada o ràfec: després d’un gir, alguns raigs ometien el cos baix i només trobaven la teulada. S’han situat els probes dels panys 30 i 66-50 a 0,5 m endins, i el de l’absis 48 a 1 m endins, dins de la mateixa maçoneria. El GLB no ha canviat. L’antic probe 66-17 correspon al ràfec de l’ala posterior sobre una lleixa alta, no a una columna fins al cingle. Ara es prova la connexió sòlida a 736,8 m amb el pany de càrrega 66-50: el camí no travessa aire, tres mostres són interiors i pertanyen al mateix component tancat. No s’utilitza un punt llunyà del pati com a substitut d’aquest suport.

Una consulta addicional del DTM de 0,5 m al punt interior exacte de la lleixa dóna **733,93903 m**, mentre la base exportada és **733,50746 m**: queda enterrada aproximadament 0,432 m en la font fina. En canvi, el MET5 al mateix punt dóna **731,78395 m**, 2,155 m més baix. Aquesta resolució gruixuda pot deixar un petit buit aparent sota el cantell nord en el context regional; és una limitació de representació de la lleixa, no una obertura real ni un canvi del model per fer passar una prova. El fixture conserva les coordenades de consulta, la resposta, l’URL i els perfils originals. No s’ha estirat el pany fins al cingle, modificat el terreny ni emplenat cap pati. La comprovació de contacte del pany de càrrega i la connexió lateral continuen sent obligatòries.

Les vistes frontal, lateral i obliqua s’han comparat amb el plànol oficial, la secció de restauració i les fotografies primàries. La regeneració sense xarxa produeix exactament els mateixos bytes del GLB.

El motor local de **Relleu Obert 0.24.16** ha comprovat tres contextos reals amb terreny MET5, edificis ICGC i altres materials construïts:

| Cas | Maqueta i escala | Gir | Peus / superfícies / façanes / buits | Resultat |
| --- | --- | --- | --- | --- |
| Complet | 220 × 220 mm, 1:2.000 | +8° | 11 / 34 / 5 / 5 | Passa, amb la limitació MET5 de la lleixa |
| Girat | 200 × 200 mm, 1:3.000 | −24° | 11 / 34 / 5 / 5 | Passa, amb la mateixa limitació |
| Parcial | 110 × 100 mm, 1:1.000 | −17° | 4 / 12 / 4 / 3 | Passa; la lleixa queda fora del retall |

Els dos casos complets comproven també la connexió lateral sòlida de l’Escolania. El petit buit sota la lleixa que introdueix el terreny gruixut mesura **0,850 mm** i **0,569 mm** a les escales respectives; es registra explícitament, sense certificar-ne la imprimibilitat. El suport del model queda verificat amb la font DTM fina i el pany de càrrega connectat. No es confon aquesta comprovació regional amb els vuit peus metàl·lics del campanar, verificats en la geometria original.

Només es retira la contrapart `icgc-1271519`; els 27 i 29 IDs restants dels dos casos complets es conserven. Quatre columnes de control confirmen que continuen existint els edificis independents `icgc-954390`, `icgc-404121`, `icgc-404125` i `icgc-1271523`. Les seves cotes superiors poden variar fins a 2,82 m entre la generació general i la integrada, perquè l’extrusió general depèn del mostreig del terreny; no s’afirma que les alçades d’aquests veïns siguin invariants. Totes les malles resultants de materials són tancades. També passen els modes ocult i d’altura limitada.

Els informes `relleu-obert-{complet,girat,parcial}.json` i `relleu-obert-mesh-audit.json` conserven els controls i el SHA del GLB comprovat. `relleu-obert-review.3mf` és l’exportació completa; `context-review.webp` mostra el retall parcial real, sense reparar-ne les malles. El context incorpora dades ICGC i © OpenStreetMap contributors, amb les atribucions i llicències de Relleu Obert. La revisió interactiva del visor, l’aprovació de semblança de l’usuari, la comprovació amb laminador i una impressió física continuen pendents. La web publicada i CI les comprovarà l’usuari.

Regeneració sense xarxa, amb dependències instal·lades:

```sh
node --max-old-space-size=256 scripts/generate-monestir-de-montserrat.mjs /ruta/feature-temporal.json
python scripts/render-thumbnail.py models/monestir-de-montserrat/r1/print.glb --camera .7 .65 1.3
```

SHA-256 del GLB: `8d73706984ef37e2f05ed98eb6773f39c74b25c904617500125a41e837959051`.

## Llicències i referències

Geometria pròpia Open Place Models sota **CC BY 4.0**, amb dades espacials **ICGC CC BY 4.0**. Atribució: Open Place Models contributors; Institut Cartogràfic i Geològic de Catalunya. No s’ha incorporat geometria OSM ni una malla de tercers en aquest actiu. Les fonts del terreny i dels edificis generals de Relleu Obert es mantenen separades.

- [Petjades RTT ICGC, capa 10](https://geoserveis.icgc.cat/vector01/rest/services/topografia_territorial/MapServer/10), consulta local conservada del 18 de novembre de 2026.
- [Elevacions ICGC](https://geoserveis.icgc.cat/servei/catalunya/elevacions-territorial/wms), DSM d’1 m i DTM de 0,5 m LiDAR 2021–2023.
- [Ortofoto territorial vigent](https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms) i [condicions de reutilització ICGC](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio).
- [Plànol del gestor i materials de visita](https://www.montserratvisita.com/ca/oficines-de-turisme), versió 2025.
- [Article tècnic CAATEEB, restauració, pàgines 60–65](https://www.tracrehabilitacio.es/sites/default/files/article_montserrat.pdf), L’Informatiu 319 de març de 2010, còpia pública del contractista TRAC; [edició completa](https://documents.cateb.cat/Comunicacio/informatiu/pdf/319.pdf).
- [COAC, Escolania de Montserrat](https://www.arquitecturacatalana.cat/ca/obres/escolania-de-montserrat), dibuixos d’Espinet/Ubach i fotografies de Lluís Casals.
- [Abadia, basílica i llocs de culte](https://abadiamontserrat.cat/santuari/basilica-i-altres-llocs-de-culte).
- [Arcadi Pla, intervencions i campanar obert de Montserrat](https://radioteca.cat/p/perspectiva_reportatges-projectes/2026/02/05/32-anys-dintervencions-darcadi-pla-a-montserrat-ara-a-larxiu-AIrlyVvAcixcwz719YJWQg).
