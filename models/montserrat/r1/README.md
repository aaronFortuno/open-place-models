# Montserrat · r1

A terrain pilot covering a 9.6 × 6.4 km rectangle from Can Maçana and Les Agulles to the eastern slopes above the Llobregat. The source is the ICGC terrain model derived from 2021–2023 LiDAR. The generator requests a window from the 8 m overview of the 50 cm source for the whole massif, then another window from the 2 m overview for two adjoining detail tiles on the northern cliffs. The source is CC BY 4.0 with attribution to the Institut Cartogràfic i Geològic de Catalunya. [ICGC metadata](https://catalegs.ide.cat/geonetwork/geonetwork/api/records/model-elevacions-terreny-lidar-catalunya-50cm-2021-2023?language=cat) · [Natural park](https://muntanyamontserrat.gencat.cat/ca/el_parc/senderisme/Del_Monestir_SantJeroni)

| Asset | Ground coverage | Sampling | Bytes |
| --- | --- | --- | ---: |
| `print.glb` | 9.6 × 6.4 km | 32 m grid with 4,034 additional measured points at 8 m offsets | 1,573,672 |
| `tiles/foradada-nord.glb` | 384 × 384 m | 2 m | 913,236 |
| `tiles/agulles-nord.glb` | 384 × 384 m | 2 m | 913,240 |
| Each `.tif` | Same extent as its detail mesh | 2 m Float32 elevations | 149,996 |

The overview has 131,068 triangles. Compared with the same 8 m samples, the 95th-percentile height difference falls from 7.27 m on the regular 32 m mesh to 5.24 m with refinement. The largest difference is 97.06 m on a steep face. At the two detail sites the 95th-percentile difference between the overview and the 2 m tiles is 10.31 m and 18.61 m. Use detail tiles for cliff profiles. All three GLBs are closed, have positive volume and use one indexed primitive. All 193 top vertices along the tile seam have identical X, Y and Z. [Measurements](survey.json)

The GLBs share the WGS84 anchor `[1.8144779704293488, 41.599631733588296]` and use X east, Y up and Z south, in metres. The vertical datum is EGM08D595. The overview base is at 7 m and both detail meshes use a base at 610 m. Those floors close the standalone solids for display and printing. The `.tif` files retain absolute elevations in EPSG:25831 and store point samples, including the shared edge. A 200 mm-wide print of the overview is about 1:48,000 before any rescaling in the slicer.

## Combining the tiles with a terrain model

Use the GLB overview as the gallery preview. For an application cutout, select the GeoTIFF tiles that intersect it and resample their absolute elevations. The neighbouring tiles meet at UTM easting 398945 m. Blend only along the outer boundary of a group of tiles. Keep one height datum for the selected region, independent of the standalone GLB bases. A regular 2 m Float32 grid for the entire rectangle would occupy about 61.5 MB before compression, compared with about 150 kB per prototype tile. More tiles can be added for target sectors without increasing the initial gallery download.

An elevation grid records one surface per horizontal position. Cavities such as the Foradada need a separate georeferenced 3D volume and checks of both mouths, the roof and the sliced result. Apply the cavity after blending the terrain. The catalogue exposes the two GeoTIFFs in `terrainTiles` with their EPSG code, datum, sample bounds, spacing and byte lengths. The gallery uses the overview GLB and thumbnail for display. A terrain client can request only the rasters that intersect its cutout.

## Regeneration

Run the generator with the path to a Node project that has `geotiff@3.0.5` and `proj4@2.22.0`, such as Relleu Obert. The script verifies mesh topology, seam equality, the GeoTIFF round trip and the overview refinement against the 8 m samples.

```sh
node --max-old-space-size=512 scripts/generate-montserrat.mjs ../relleu-obert
python scripts/render-thumbnail.py models/montserrat/r1/print.glb --camera -0.60 0.49 -1
```
