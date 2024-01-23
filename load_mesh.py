import json
import bpy

data = json.load(open('/Users/pandu/programming/geotiff-elevation-map-to-png/temp-output.txt'))

# Clear the scene
for scene in bpy.data.scenes:
    for obj in scene.objects:
        for collection in obj.users_collection:
            collection.objects.unlink(obj)

# Create object
mesh = bpy.data.meshes.new('MyMesh')
mesh.from_pydata(
    vertices = data['vertices'],
    edges = [],  # i.e. infer from polygons
    faces = data['faces']
)
obj = bpy.data.objects.new('MyObject', mesh)
bpy.context.scene.collection.objects.link(obj)
