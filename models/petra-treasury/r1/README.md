# Al-Khazneh · r1

An original reconstruction of the Treasury as a relief in the sandstone cliff at the end of the Siq. It keeps the lower portico, six columns, the entrance behind the central pair, both pediments, the upper tholos and the urn. The main frontage is about 25.3 m wide and the urn reaches 39.1 m above the modelled plaza. The plan, elevation and section come from Dalman and Newton's 1912 survey (plates XV–XVII). The standing inner column follows the present arrangement. The friezes, statues, fluting and fine ornament are simplified and the interior stops behind the doorway. [Measured plates](https://archive.org/details/excavationsatain00mackrich) · [Historical photograph](https://www.loc.gov/item/2019698216/) · [Modern survey reference](https://gdh.org/model/al-khazneh-the-treasury/)

The façade faces 65° true. Its approximate centre follows the front edge of OSM way 488848937. The 96 m terrain patch blends the section of the rock shown in the historical survey into coarse Mapzen elevations. The reconstructed plaza is placed at about 1011 m, using the nearby surveyed Wadi Hremiyyeh outlet at 1012 m as a check. The cliff crest and the transition to the surroundings are approximate. The grid spacing of 1 m describes the reconstruction, while the regional elevations are much coarser. [Field azimuth](https://doi.org/10.1007/s00004-013-0164-6) · [Wadi elevation survey](https://doi.org/10.1016/j.jhydrol.2021.126583) · [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) · [OpenStreetMap](https://www.openstreetmap.org/way/488848937)

The 50 m gallery model is one closed solid. In Relleu Obert, the sidecar shapes the cliff and excavates the space around the façade in the terrain solid. The matching generic building outline is suppressed when the cut succeeds. At 1:500 and 1:1,000, including a rotated crop through the façade, the engine kept the entrance clear, the rear wall closed, the front column and urn present, and the ground and cliff continuous at the checked sections. The 1:500 control retained the adjacent mapped building. The 1:1,000 control kept the rock-cut façade with buildings switched off. Physical printing of the portico remains to be checked.

CC BY 4.0 applies to the original model geometry. The placement derived from OSM is credited under ODbL 1.0. The modern scan was used as a visual reference. The release consists of newly constructed geometry and elevation samples. Jordan's Antiquities Law separately addresses manufacture and use of physical moulds and samples. [Geometry licence](https://creativecommons.org/licenses/by/4.0/) · [OSM attribution](https://www.openstreetmap.org/copyright) · [Antiquities Law, article 27](https://publication.doa.gov.jo/uploads/publications/203/Law%20of%20Antiquities-Jordan.pdf)

```sh
node scripts/generate-petra-treasury.mjs
python scripts/render-thumbnail.py models/petra-treasury/r1/print.glb --camera 1 .18 .04 --light .78 .58 -.66
```

`reference-ground.json` records the coarse terrain samples. Regeneration builds the gallery solid, the terrain sidecar and the index entry from this input and the measured façade dimensions.
