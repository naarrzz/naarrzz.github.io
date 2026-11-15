# materials by region, eyes, preview render, GLB export. Runs inside build.py (bm_, rig, eyes, OUT are defined).
def mat(name, col, rough, metal=0.0):
    mt = bpy.data.materials.new(name); mt.use_nodes = True; b = mt.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; return mt
bm_.data.materials.clear(); bm_.data.materials.append(mat('body', (1, 1, 1), 0.48))
B = {b.name: (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}
hipz = B['thigh_l'][0].z; headz = B['head'][0].z; heady = B['head'][0].y; top = max((bm_.matrix_world @ v.co).z for v in bm_.data.vertices)
mw = bm_.matrix_world
SKIN, TRUNK, HAIR = (0.36, 0.17, 0.085, 1), (0.012, 0.012, 0.016, 1), (0.014, 0.01, 0.008, 1)
col = bm_.data.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
for p in bm_.data.polygons: p.use_smooth = True
for v in bm_.data.vertices:
    c = mw @ v.co; k = SKIN
    if c.z > headz and abs(c.x) < 0.12:
        back = c.y - heady
        line = headz + 0.118 - max(0.0, back + 0.02) * 0.95
        pass
    col.data[v.index].color = k
# muscle definition: darken the grooves between muscles a little, like stage tan under hard light
bmx = bmesh.new(); bmx.from_mesh(bm_.data); bmx.verts.ensure_lookup_table(); bmx.normal_update()
cav = [0.0] * len(bmx.verts)
for v in bmx.verts:
    nb = [e.other_vert(v) for e in v.link_edges]
    if not nb: continue
    mean = sum((n.co for n in nb), Vector()) / len(nb); el = sum((n.co - v.co).length for n in nb) / len(nb)
    cav[v.index] = (mean - v.co).dot(v.normal) / max(el, 1e-6)
for it in range(2):
    cav = [0.5 * cav[v.index] + 0.5 * (sum(cav[e.other_vert(v).index] for e in v.link_edges) / max(1, len(v.link_edges))) for v in bmx.verts]
sc_ = sorted(cav); print("CAV pct", [round(sc_[int(len(sc_) * q)], 3) for q in (0.02, 0.1, 0.5, 0.9, 0.98)])
# profile of the face, to place the moustache
prof = sorted([(round((mw @ v.co).z, 3), round((mw @ v.co).y, 3)) for v in bmx.verts if abs((mw @ v.co).x) < 0.004 and 1.42 < (mw @ v.co).z < 1.53 and (mw @ v.co).y < -0.08])
print("PROFILE", prof)
# hair: lift a cap off the top of the head, higher at the front
def top(c):
    back = c.y - heady; return c.z > headz + 0.097 - max(0.0, back) * 0.42 and abs(c.x) < 0.085
faces = [fc for fc in bmx.faces if all(top(mw @ v.co) for v in fc.verts)]
dup = bmesh.ops.duplicate(bmx, geom=faces); dverts = [g for g in dup['geom'] if isinstance(g, bmesh.types.BMVert)]
edge_v = set(v for v in dverts if any(len(e.link_faces) < 2 for e in v.link_edges))
hair_idx = []
for v in dverts:
    c = mw @ v.co; ff = max(0.0, min(1.0, (-(c.y - heady) + 0.03) / 0.11))
    dist = 0.002 if v in edge_v else 0.010 + 0.024 * ff * ff
    v.co += v.normal * dist / 0.1 * 0.1 / max(bm_.scale.x, 1e-6) * bm_.scale.x if False else v.normal * (dist / bm_.scale.x)
bmx.verts.index_update(); hair_set = set(v.index for v in dverts); ncav = len(cav)
bmx.to_mesh(bm_.data); bmx.free(); bm_.data.update()
col = bm_.data.color_attributes['Col']
for v in bm_.data.vertices:
    if v.index in hair_set: col.data[v.index].color = HAIR; continue
    cv = cav[v.index] if v.index < ncav else 0.0
    f_ = 1.0 - max(0.0, min(0.5, cv * 3.2)) + max(0.0, min(0.1, -cv * 1.2))
    col.data[v.index].color = (SKIN[0] * f_, SKIN[1] * f_ * f_, SKIN[2] * f_ * f_, 1)
for p in bm_.data.polygons: p.use_smooth = True
bm_.data.color_attributes.active_color = col
print("TOP", top, "HIPZ", hipz, "HEAD", headz, heady)
# eyes: white ball with a dark iris, weighted to the head
if len(eyes) < 2:
    eyes = {'l': Vector((0.031, heady - 0.068, headz + 0.073)), 'r': Vector((-0.031, heady - 0.068, headz + 0.073))}
body = bm_.data.materials[0]
parts = []
for k, pos in eyes.items():
    for r, off, cc in ((0.0125, 0, (0.8, 0.8, 0.76, 1)), (0.0068, -0.0068, (0.03, 0.018, 0.01, 1))):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=10, location=(pos.x, pos.y + off, pos.z)); o = bpy.context.active_object
        bpy.ops.object.shade_smooth(); o.data.materials.append(body); ca = o.data.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
        for d in ca.data: d.color = cc
        g = o.vertex_groups.new(name='head'); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE'); parts.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bm_.select_set(True); bpy.context.view_layer.objects.active = bm_; bpy.ops.object.join()
print("FINAL VERTS", len(bm_.data.vertices), "MATS", [m.name for m in bm_.data.materials], "GROUPS", len(bm_.vertex_groups))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'human.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'human.glb'), export_format='GLB', export_animations=False, export_skins=True, export_yup=True, export_apply=False, export_tangents=False, export_morph=False, export_vertex_color='ACTIVE', export_all_vertex_colors=False)
nt = body.node_tree; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; nt.links.new(vc.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
# preview
sc = bpy.context.scene
for i, (loc, rot, nm) in enumerate([((0, -4.2, 0.95), (math.radians(88), 0, 0), 'front'), ((0, 4.2, 0.95), (math.radians(88), 0, math.radians(180)), 'back'), ((0, -1.1, 1.55), (math.radians(88), 0, 0), 'face')]):
    cam = bpy.data.objects.new('cam' + nm, bpy.data.cameras.new('cam' + nm)); sc.collection.objects.link(cam); cam.location = loc; cam.rotation_euler = rot; cam.data.lens = 60
    if i == 0:
        for lloc, e in (((2, -3, 4), 4), ((-3, -2, 2), 2), ((0, 3, 3), 3)):
            L = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); L.data.energy = e; sc.collection.objects.link(L); L.location = lloc; L.rotation_euler = Vector((0, 0, -1)).rotation_difference(-Vector(lloc).normalized()).to_euler()
    sc.camera = cam; sc.render.resolution_x = 520; sc.render.resolution_y = 760; sc.render.filepath = os.path.join(OUT, nm + '.png')
    try: sc.render.engine = 'BLENDER_EEVEE'
    except Exception: sc.render.engine = 'BLENDER_EEVEE_NEXT'
    bpy.ops.render.render(write_still=True)
