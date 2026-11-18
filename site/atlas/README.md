# Globe land outline

`land.json` is a simplified derivative of Natural Earth's **1:110 million land** polygons. Natural Earth data are in the public domain. The outline is illustrative and is not used to locate model geometry or determine borders.

- [Natural Earth source GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson)
- [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/)
- Retrieved 18 November 2026. Reduced with a 0.18° Douglas–Peucker tolerance and coordinates rounded to 0.01°.

Regenerate with `python scripts/prepare-world-outline.py <downloaded-source.geojson>`. No network requests are made by the globe; Vite bundles the local outline with the optional viewer module.
