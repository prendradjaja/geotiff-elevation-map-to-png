# https://sinestesia.co/blog/tutorials/python-2d-grid/

from dataclasses import dataclass
import math
import json

# red
xmin = 0
xmax = 1200
# green
ymin = 0
ymax = xmax

def main():
    elevations = json.load(open('/Users/pandu/programming/geotiff-elevation-map-to-png/temp-output.txt'))

    vertices = {}
    i = 0
    for y in range(ymin, ymax+1):
        for x in range(xmin, xmax+1):
            # z = 0.2 * xmax * math.sin(y / ymax * 7 + x / xmax * 2)
            z = 0.05 * elevations[y][x]
            vertices[x, y] = Vertex(
                i,
                x,
                -y,
                z
            )
            i += 1

    vid = lambda x, y: vertices[x, y].id

    faces = []
    for y in range(ymin, ymax):
        for x in range(xmin, xmax):
            # A B
            # D C
            a = vid(x, y)
            b = vid(x, y + 1)
            c = vid(x + 1, y + 1)
            d = vid(x + 1, y)
            faces.extend([
                (a, b, d),
                (b, c, d),
            ])

    import bpy
    # Clear the scene
    for scene in bpy.data.scenes:
        for obj in scene.objects:
            for collection in obj.users_collection:
                collection.objects.unlink(obj)

    # Create Mesh Datablock
    mesh = bpy.data.meshes.new('MyMesh')  # can these names have spaces?
    mesh.from_pydata(
        vertices = scale_vertices(
            translate_vertices(
                [v.as_tuple() for v in vertices.values()],
                -xmax / 2,
                ymax / 2,
                0
            ),
            1 / xmax * 10
        ),
        edges = [],  # i.e. infer from polygons
        faces = faces
    )
    obj = bpy.data.objects.new('MyObject', mesh)
    bpy.context.scene.collection.objects.link(obj)

def translate_vertices(vertices, dx, dy, dz):
    return [
        (x + dx, y + dy, z + dz)
        for x, y, z in vertices
    ]

def scale_vertices(vertices, s):
    return [
        (x * s, y * s, z * s)
        for x, y, z in vertices
    ]

@dataclass
class Vertex:
    id: ...
    x: ...
    y: ...
    z: ...

    def as_tuple(self):
        return (self.x, self.y, self.z)

if __name__ == '__main__':
    main()
