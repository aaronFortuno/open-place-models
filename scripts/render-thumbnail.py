"""Render a generated, indexed GLB to a gallery thumbnail with NumPy and Pillow."""

import argparse
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image


def read_mesh(path):
    data = path.read_bytes()
    if data[:8] != b"glTF\x02\x00\x00\x00":
        raise ValueError("Expected a glTF 2.0 binary file")
    json_size = struct.unpack_from("<I", data, 12)[0]
    document = json.loads(data[20:20 + json_size])
    if len(document["meshes"]) != 1 or len(document["meshes"][0]["primitives"]) != 1:
        raise ValueError("Expected a single generated mesh primitive")
    primitive = document["meshes"][0]["primitives"][0]
    node, = document["nodes"]
    if node != {"mesh": 0} or primitive.get("mode", 4) != 4:
        raise ValueError("Expected an untransformed triangle mesh")

    def values(index, dimensions):
        accessor = document["accessors"][index]
        view = document["bufferViews"][accessor["bufferView"]]
        dtype = np.dtype({5121: "u1", 5123: "<u2", 5125: "<u4", 5126: "<f4"}[accessor["componentType"]])
        stride = dimensions * dtype.itemsize
        offset = 28 + json_size + view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        return np.ndarray((accessor["count"], dimensions), dtype, buffer=data, offset=offset,
                          strides=(view.get("byteStride", stride), dtype.itemsize))

    return values(primitive["attributes"]["POSITION"], 3), values(primitive["indices"], 1).reshape(-1, 3)


def unit(vector):
    length = np.linalg.norm(vector)
    if not length:
        raise ValueError("Expected a nonzero direction")
    return vector / length


def render(positions, triangles, camera, light=(-.42, .80, .45)):
    width, height = 640, 400
    direction = unit(np.asarray(camera))
    right = unit(np.cross([0, 1, 0], direction))
    up = np.cross(direction, right)
    projected = positions @ np.array([right, -up, direction]).T
    flat = projected[:, :2]
    lower, upper = flat.min(axis=0), flat.max(axis=0)
    scale = min((np.array([width, height]) * .9) / (upper - lower))
    flat[:] = (flat - (upper + lower) / 2) * scale + [width / 2, height / 2]

    pixels = np.empty((height, width, 3), dtype=np.uint8)
    pixels[:] = [235, 241, 233]
    depth = np.full((height, width), -np.inf)
    light = unit(np.asarray(light))
    normal = np.cross(positions[triangles[:, 1]] - positions[triangles[:, 0]],
                      positions[triangles[:, 2]] - positions[triangles[:, 0]])
    brightness = .67 + .39 * np.maximum((normal @ light) / np.maximum(np.linalg.norm(normal, axis=1), 1e-12), 0)
    colours = (brightness[:, None] * [179, 153, 114]).astype(np.uint8)

    for vertices, colour in zip(projected[triangles], colours):
        a, b, c = vertices
        u, v = b - a, c - a
        area = u[0] * v[1] - u[1] * v[0]
        if abs(area) < 1e-8:
            continue
        x0, y0 = np.floor(vertices[:, :2].min(axis=0)).astype(int)
        x1, y1 = np.ceil(vertices[:, :2].max(axis=0)).astype(int)
        y, x = np.ogrid[y0:y1, x0:x1]
        dx, dy = x + .5 - a[0], y + .5 - a[1]
        s = (dx * v[1] - dy * v[0]) / area
        t = (u[0] * dy - u[1] * dx) / area
        z = a[2] + s * u[2] + t * v[2]
        region = depth[y0:y1, x0:x1]
        visible = (s >= 0) & (t >= 0) & (s + t <= 1) & (z > region)
        region[visible] = z[visible]
        pixels[y0:y1, x0:x1][visible] = colour

    return Image.fromarray(pixels).resize((320, 200), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mesh", type=Path)
    parser.add_argument("--camera", type=float, nargs=3, default=(1, .62, 1.35), metavar=("EAST", "UP", "SOUTH"))
    parser.add_argument("--light", type=float, nargs=3, default=(-.42, .80, .45), metavar=("EAST", "UP", "SOUTH"))
    args = parser.parse_args()
    render(*read_mesh(args.mesh), args.camera, args.light).save(args.mesh.with_name("thumbnail.webp"), quality=87)
