"""Simplify Natural Earth's public-domain 1:110m land for the gallery globe.

Usage: python scripts/prepare-world-outline.py source.geojson
Source: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
"""

import json
import math
import pathlib
import sys


def simplify(points, tolerance=0.18):
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    length = dx * dx + dy * dy
    distances = []
    for x, y in points[1:-1]:
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / length)) if length else 0
        distances.append(math.hypot(x - ax - t * dx, y - ay - t * dy))
    if not distances or max(distances) <= tolerance:
        return [points[0], points[-1]]
    split = distances.index(max(distances)) + 1
    return simplify(points[:split + 1], tolerance)[:-1] + simplify(points[split:], tolerance)


source = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
polygons = []
for feature in source["features"]:
    geometry = feature["geometry"]
    parts = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    for polygon in parts:
        rings = []
        for ring in polygon:
            reduced = simplify(ring)
            if len(reduced) >= 4:
                rings.append([[round(x, 2), round(y, 2)] for x, y in reduced])
        if rings:
            polygons.append(rings)

destination = pathlib.Path(__file__).resolve().parent.parent / "site/atlas/land.json"
destination.write_text(json.dumps(polygons, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(polygons)} polygons, {destination.stat().st_size} bytes")
