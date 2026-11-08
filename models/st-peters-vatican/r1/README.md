# St. Peter's Basilica and Square · r1

The basilica retains the dome and lantern, four smaller cupolas, the roof volumes above the nave and transepts, and Maderno's façade. The Vatican gives an exterior dome diameter of 58.9 m and 133.3 m from the street to the cross. The façade is about 116 m wide and 45.5 m high below the statues. The model uses these dimensions with the mapped plan and Fontana's historic drawings as a reference for the massing. The roof, balustrade statues and façade ornament are simplified. [Dome and lantern](https://www.vatican.va/content/vatican/en/ra/cupolone-lanterna.html) · [Façade measurements](https://www.vatican.va/content/vatican/en/ra/facciata-basilica.html) · [Fontana, 1694](https://digi.ub.uni-heidelberg.de/diglit/fontana1694)

The square retains the two curved porticoes, the connecting arms and the obelisk. Two simplified rows of thicker supports keep the porticoes open under the roofs at model scale. The obelisk uses the published 25.36 m shaft and 8.25 m pedestal, with a small finial above. The gallery assembly includes both fountains. Relleu Obert uses the active map layers for their basins and for the plaza surface. [The square](https://www.basilicasanpietro.va/en/san-pietro/the-square) · [Colonnade](https://www.vatican.va/content/vatican/en/ra/colonnato-statue-santi.html) · [Obelisk](https://www.vatican.va/content/vatican/en/ra/obelisco.html) · [North fountain](https://www.vatican.va/content/vatican/en/ra/fontana-destra.html) · [South fountain](https://www.vatican.va/content/vatican/en/ra/fontana-sinistra.html)

| Part | Estimated base | Height above base | GLB bytes |
| --- | ---: | ---: | ---: |
| Basilica | 34.0 m | 133.3 m | 36,424 |
| North colonnade and connecting arm | 29.7 m | 16.0 m | 23,016 |
| South colonnade and connecting arm | 28.2 m | 16.0 m | 23,472 |
| Obelisk | 27.1 m | 35.1 m | 1,568 |

Each part has its own footprint, anchor and terrain contact. The elevations are approximate controls from the surrounding terrain, with a separate base for each colonnade. The gallery GLB is 86,404 bytes and preserves the parts' positions and relative elevations. Use Relleu Obert to print them together with the square terrain. The original geometry is CC BY 4.0. The mapped footprints and placement retain ODbL 1.0. [Basilica outline](https://www.openstreetmap.org/way/244159210) · [Square](https://www.openstreetmap.org/relation/10044166) · [Background elevations](https://registry.opendata.aws/terrain-tiles/) · [Map attribution](https://www.openstreetmap.org/copyright)

Each of the four Relleu Obert meshes is a connected closed solid. Local controls passed at 1:2,500 with OpenFreeMap and at 1:5,000 with a 17° rotation and OSM building parts. Both cases preserved neighbouring buildings and put the four tops at the recorded heights. A 1:2,500 crop around the obelisk at −11° loaded just the two colonnades and the obelisk. The clipped geometry stayed within the board and passed the solid audit. The 1:2,500 control also verified the height limit and hidden-buildings settings. Physical printing of the portico roofs and the obelisk tip remains to be checked.

```sh
node scripts/generate-st-peters-vatican.mjs
python scripts/render-thumbnail.py models/st-peters-vatican/r1/print.glb --camera .57 .61 1 --light .72 .84 .32
```
