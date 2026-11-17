# Pont del Diable de Martorell · r1

The model retains the steep Gothic deck, the large pointed arch, the smaller western pointed arch, the eastern round opening and the small drainage opening. The summit shelter and the Roman gateway have open passages. The 36.80 m and 16.60 m pointed spans, 5.40 m round span and 1.20 m drainage span follow the dimensions reported by Guillem Pérez Tuldrà in his 2025 structural study, p. 71. Arch stations and rises are estimated from the published elevation and constrained by the measured deck. [UPC structural study](https://upcommons.upc.edu/server/api/core/bitstreams/383e88d2-cdcb-4e66-997e-0f8d09c062fb/content#page=71) · [Municipal museum](https://museus.martorell.cat/pont-del-diable-sant-bartomeu/)

## Registration and approximations

The longitudinal axis follows three connected OpenStreetMap paths. The width changes, summit shelter position and eastern gateway follow bridge relation 18301150 and the current ICGC orthophoto. The model extends 128.43 m from the Martorell approach through the gateway landing. Its origin is `[1.936803, 41.4749082]`, with Y=0 at 39.9 m EGM08D595. X points east, Y up and Z south. [OSM bridge outline](https://www.openstreetmap.org/relation/18301150) · [ICGC orthophoto](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Imatge/Ortofoto-Territorial)

Twenty-two paired surface and terrain samples from the ICGC 2021–2023 LiDAR layers constrain the deck and abutments. The shelter roof reaches 71.9 m above sea level. The deck beneath it is interpolated between visible pavement samples. The Roman gateway height and shape are estimated from the reference elevation and local surface returns. The lower foundations extend beneath the lowest of the detailed terrain and the generated MET5 terrain at the two full review scales, with 1.8 m of additional embedment. Raw samples and foundation controls are recorded in `survey.json`. [ICGC elevation service and layers](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-Elevacions/WMS-Elevacions-territorial)

Individual stones, inscriptions, surface weathering, railings and stair treads are omitted. The deck is continuous. The cutwater, Roman gate cornices and summit shelter are simplified. Parapets are widened to 0.54 m, which becomes 0.54 mm at 1:1,000 and 0.27 mm at 1:2,000. The latter is below a standard 0.4 mm nozzle width. Large arch crowns may need support during printing.

## Catalogue integration

The GLB uses one indexed mesh and primitive, with a closed masonry shell followed by a closed pavement shell. Relleu Obert uses the masonry prefix and reconstructs the walking surface from the recorded deck rows. The verified replacement paths are OSM ways `1335097110`, `1335097109` and `92878792`. The two mapped shelter walls, ways `1335097115` and `1335097116`, are supplied as supporting feature identities. Nearby roads and buildings retain their own identities.

## Local validation

- The GLB is **25,924 bytes**, with 1,049 vertices and 2,098 triangles. The two shells have positive signed volume, closed topology, consistent face orientation and no non-manifold edges. SHA-256 is `8cdf852519e31a56284de6bc790308dccce1f2cd70f65931701550629fc23d89`.
- Full Relleu Obert crops at 1:1,000 (+8°, 200 × 150 mm) and 1:2,000 (−14°, 160 × 120 mm) used ICGC MET5 and ICGC buildings. Both retained the two main arches, the eastern round opening, summit passage and Roman gateway passage. Rays through all five openings were clear. Five ground-contact controls passed in each crop. The bridge was one connected component, with no duplicated deck among the three verified replacement paths.
- A partial crop at 1:750 (+19°, 100 × 100 mm) used ICGC MET5 and OSM buildings because the selected strip had no ICGC buildings. It retained the main opening, eastern arch, summit passage and Roman gateway passage. Three ground-contact controls passed and the clipped bridge remained one connected solid.
- All exported material meshes passed Relleu Obert's local mesh audit. `validation.json` records the controls. `review.3mf` is the 1:1,000 full regional crop for review. Slicer and physical-print checks remain with the user.
- The gallery builds with 45 entries. The local viewer loaded the mesh, thumbnail, size, dates and attribution; search, orbit and zoom were checked.

## Reproduction and reuse

Run `node scripts/generate-pont-del-diable.mjs` from the repository root to regenerate the GLB from `survey.json`. An optional output filename writes its catalogue feature. Run `python scripts/render-thumbnail.py models/pont-del-diable-martorell/r1/print.glb --camera -0.20 0.38 1` for the thumbnail.

The geometry is an original simplified reconstruction from reported dimensions and measured elevations. The modelling code uses the repository's MIT licence. Original model geometry and the ICGC-derived elevation data use CC BY 4.0. OpenStreetMap-derived alignment, widths and feature identities retain ODbL 1.0 attribution. [ICGC reuse conditions](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
