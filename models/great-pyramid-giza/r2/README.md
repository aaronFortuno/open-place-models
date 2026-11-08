# Pyramids of Giza · r2

Khufu, Khafre and Menkaure form one catalogue entry. The reconstruction keeps the three pyramids in their surveyed plan positions and at their respective pavement elevations. Nearby queens’ pyramids, temples, causeways and the plateau terrain come from the active map layers. [Egyptian Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/archaeological-sites/giza-plateau/) · [Glen Dash Foundation survey](https://www.dashfoundation.com/archaeology/survey.html)

| Pyramid | Model base, m above sea level | Height above its base | Summit, m above sea level | Exterior retained |
| --- | ---: | ---: | ---: | --- |
| Khufu | 59.90 | 138.497 m | 198.397 | Stepped masonry and the truncated summit of r1 |
| Khafre | 70.50 | 136.398 m | 206.898 | Upper limestone casing and small summit terrace |
| Menkaure | 73.10 | 61.874 m | 134.974 | Lower granite casing and the north-face recess |

Khufu uses the r1 mesh and pavement datum. The other pavement elevations come from the Glen Dash Foundation’s reconstruction of the surveyed corners. The foundation gives 60.40 m for Khufu’s base. The 0.50 m difference from r1 is within the precision needed for this assembly. Individual stones, openings and irregularities in the casing are simplified. [Khufu reconstruction and sources](../r1/README.md) · [Khafre and Menkaure measurements, sources and approximations](COMPANIONS.md)

## Files and placement

The 45,280-byte [combined GLB](print.glb) contains three closed solids in one indexed mesh. It uses metres with X east, Y up and Z south, an origin above Khafre’s plan position at `[31.13074, 29.97598]`, and Khufu’s pavement as the vertical datum. Its geographic extent is approximately 742 × 912 m. The GLB preserves the spacing and elevation offsets. For printing with the plateau, use the regional model in Relleu Obert. The three individual GLBs are available for separate printing. [Khufu](../r1/print.glb) · [Khafre](khafre.glb) · [Menkaure](menkaure.glb)

The gallery uses the existing `great-pyramid-giza` link for r2. In Relleu Obert the three entries load independently. Each corrects its own footprint in the surface elevation data and replaces the corresponding mapped pyramid. The mesh licence is CC BY 4.0. The OSM comparison and identifiers retain ODbL 1.0 attribution. From the repository root, `node scripts/generate-giza-group.mjs` regenerates the combined GLB from the three indexed components. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [OpenStreetMap copyright and ODbL](https://www.openstreetmap.org/copyright)

## Local validation

- The combined GLB has 3,582 triangles and three closed, consistently oriented components. Each individual mesh passed its own solid audit.
- Relleu Obert generated complete crops at 1:5,000 and 0° on a 194 × 215 mm board using OpenFreeMap buildings, and at 1:10,000 and 23° on a 112 × 135 mm board using OSM3D buildings. All three summits reached the recorded elevations. The mapped bodies were replaced and neighbouring pyramids remained visible. The Mapzen elevation tiles supplied the terrain in both cases.
- A partial 1:2,000 crop rotated by 13° downloaded Khafre alone. The cropped geometry was closed. The local gallery passed the Menkaure search, Egypt filter, orbit, zoom and GLB link checks. The footer counted one Giza entry and 12 places in total.
