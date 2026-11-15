import bpy, sys, os, glob, math, bmesh
from mathutils import Vector
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.exportservice import ExportService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService
OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
m = TargetService.get_default_macro_info_dict()
m.update(gender=1.0, age=0.42, muscle=1.0, weight=float(os.environ.get('W', '0.28')), proportions=1.0, height=0.5)
m['race'] = {'asian': 1.0, 'caucasian': 0.0, 'african': 0.0}
print("MACRO", m)
bm_ = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=m)
T = LocationService.get_mpfb_data("targets")
extra = {}
for f in glob.glob(os.path.join(T, '*', '*muscle*incr.target.gz')): extra[f] = 1.0
for name, wgt in [('torso/measure-shoulder-dist-incr', .8), ('torso/measure-waist-circ-decr', 1.0), ('torso/measure-bust-circ-incr', .5), ('arms/measure-upperarm-circ-incr', .8), ('torso/torso-scale-horiz-incr', .25)]:
    extra[os.path.join(T, name + '.target.gz')] = wgt
for f, wgt in extra.items():
    if os.path.exists(f):
        try: TargetService.load_target(bm_, f, weight=wgt, name=os.path.basename(f).replace('.target.gz', ''))
        except Exception as e: print("TARGET FAIL", f, e)
    else: print("MISSING", f)
for kb in bm_.data.shape_keys.key_blocks:
    n = kb.name.lower()
    if 'muscle-incr' in n or 'muscle_incr' in n:
        kb.slider_max = 2.0; kb.value = 1.4 if ('upperarm' in n or 'pectoral' in n or 'dorsi' in n or 'shoulder' in n) else 1.15
print("KEYS", [(kb.name, round(kb.value, 2)) for kb in bm_.data.shape_keys.key_blocks if 'muscle' in kb.name.lower() and 'univ' not in kb.name.lower()][:20])
print("TARGETS", sorted(os.path.basename(f) for f in extra))
rig = HumanService.add_builtin_rig(bm_, "game_engine")
TargetService.bake_targets(bm_)
eyes = {}
for k in ('joint-l-eye', 'joint-r-eye'):
    gi = bm_.vertex_groups[k].index; pts = [bm_.matrix_world @ v.co for v in bm_.data.vertices if any(g.group == gi and g.weight > 0 for g in v.groups)]
    eyes[k] = sum(pts, Vector()) / len(pts)
print("EYES", eyes)
ExportService.bake_modifiers_remove_helpers(bm_, bake_masks=True, bake_subdiv=False, remove_helpers=True)
print("VERTS", len(bm_.data.vertices), "BONES", [b.name for b in rig.data.bones])
bb = [bm_.matrix_world @ Vector(c) for c in bm_.bound_box]; print("BBOX", min(v.z for v in bb), max(v.z for v in bb), min(v.x for v in bb), max(v.x for v in bb))
for b in rig.data.bones:
    if b.name in ('pelvis', 'thigh_l', 'calf_l', 'foot_l', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l'): print("BONE", b.name, [round(x, 3) for x in (rig.matrix_world @ b.head_local)], [round(x, 3) for x in (rig.matrix_world @ b.tail_local)])
exec(open(os.path.join(OUT, 'finish.py')).read())
