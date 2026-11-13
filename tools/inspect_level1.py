"""Read-only spot audit of the first scene's gameplay transforms (not a general importer)."""

import pathlib
import struct

data = pathlib.Path('Blobby_Data/level1').read_bytes()
offset = data.index(0, 48) + 1 + 4
assert data[offset] == 0, 'Expected stripped type trees'
offset += 1
count = struct.unpack_from('<i', data, offset)[0]
offset += 4
types = []
for _ in range(count):
    class_id = struct.unpack_from('<i', data, offset)[0]
    offset += 7 + (16 if class_id == 114 else 0) + 16
    types.append(class_id)
count = struct.unpack_from('<i', data, offset)[0]
offset += 4
data_start = struct.unpack_from('>q', data, 32)[0]
objects = {}
for _ in range(count):
    offset = (offset + 3) // 4 * 4
    path_id, start, length, type_index = struct.unpack_from('<qqIi', data, offset)
    offset += 24
    objects[path_id] = (types[type_index], data[data_start + start:data_start + start + length])


def pointer(blob, pos):
    return struct.unpack_from('<iq', blob, pos)[1]


games = {}
transforms = {}
for path_id, (class_id, blob) in objects.items():
    if class_id == 1:
        components = struct.unpack_from('<i', blob)[0]
        pos = 4 + components * 12 + 4
        length = struct.unpack_from('<i', blob, pos)[0]
        name = blob[pos + 4:pos + 4 + length].decode()
        pos = (pos + 4 + length + 3) // 4 * 4
        tag, active = struct.unpack_from('<HB', blob, pos)
        games[path_id] = (name, active, tag)
    elif class_id == 4:
        game = pointer(blob, 0)
        quaternion = struct.unpack_from('<4f', blob, 12)
        position = struct.unpack_from('<3f', blob, 28)
        scale = struct.unpack_from('<3f', blob, 40)
        children = struct.unpack_from('<i', blob, 52)[0]
        parent = pointer(blob, 56 + children * 12)
        transforms[path_id] = (game, quaternion, position, scale, parent)


def path(tid):
    if tid not in transforms:
        return ''
    game, _, _, _, parent = transforms[tid]
    return path(parent) + '/' + games[game][0]


for tid, (game, rotation, position, scale, parent) in transforms.items():
    hierarchy = path(tid)
    if hierarchy in ('/Level', '/Level/Tilemap', '/Level/Tilemap/level1', '/Level/Blobby') or (
            hierarchy.startswith('/Level/Tilemap/level1/') and hierarchy.count('/') == 4):
        print(game, hierarchy, 'pos=', position, 'rotation=', rotation,
              'scale=', scale, 'active/tag=', games[game][1:])
