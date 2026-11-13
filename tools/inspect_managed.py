"""Static ECMA-335 metadata/IL inspection. Never imports or executes the assembly."""

import pathlib
import struct
import sys

data = pathlib.Path('Blobby_Data/Managed/Assembly-CSharp.dll').read_bytes()


def u16(offset):
    return struct.unpack_from('<H', data, offset)[0]


def u32(offset):
    return struct.unpack_from('<I', data, offset)[0]


pe = u32(60)
optional = pe + 24
section_start = optional + u16(pe + 20)
sections = [struct.unpack_from('<IIII', data, section_start + i * 40 + 8)
            for i in range(u16(pe + 6))]


def raw(rva):
    for virtual_size, address, size, offset in sections:
        if address <= rva < address + max(virtual_size, size):
            return offset + rva - address
    raise ValueError(f'Unmapped RVA: {rva}')


cli = raw(u32(optional + (208 if u16(optional) == 0x10B else 224)))
metadata = raw(u32(cli + 8))
offset = (metadata + 16 + u32(metadata + 12) + 3) // 4 * 4
stream_count = u16(offset + 2)
offset += 4
streams = {}
for _ in range(stream_count):
    relative, length = struct.unpack_from('<II', data, offset)
    offset += 8
    end = data.index(0, offset)
    streams[data[offset:end].decode()] = (metadata + relative, length)
    offset = (end + 4) // 4 * 4


def string(index):
    start = streams['#Strings'][0] + index
    return data[start:data.index(0, start)].decode()


table = streams['#~'][0]
heap = data[table + 6]
valid = struct.unpack_from('<Q', data, table + 8)[0]
offset = table + 24
rows = {}
for i in range(64):
    if valid >> i & 1:
        rows[i] = u32(offset)
        offset += 4

CODED = {
    'TDR': (2, [2, 1, 27]), 'RS': (2, [0, 26, 35, 1]),
    'MDR': (3, [2, 1, 26, 6, 27]), 'HC': (2, [4, 8, 23]),
    'HCA': (5, [6, 4, 1, 2, 8, 9, 10, 0, 14, 23, 20, 17, 26, 27, 32, 35, 38, 39, 40, 42, 44, 43]),
    'CAT': (3, [6, 10]), 'HFM': (1, [4, 8]), 'HDS': (2, [2, 6, 32]),
    'HS': (1, [20, 23]), 'MF': (1, [4, 6]), 'IO': (2, [38, 35, 39]),
    'TOM': (1, [2, 6]),
}
SCHEMAS = {
    0: ['u2', 'S', 'G', 'G', 'G'], 1: ['RS', 'S', 'S'],
    2: ['u4', 'S', 'S', 'TDR', 4, 6], 3: [4], 4: ['u2', 'S', 'B'],
    5: [6], 6: ['u4', 'u2', 'u2', 'S', 'B', 8], 7: [8], 8: ['u2', 'u2', 'S'],
    9: [2, 'TDR'], 10: ['MDR', 'S', 'B'], 11: ['u2', 'HC', 'B'],
    12: ['HCA', 'CAT', 'B'], 13: ['HFM', 'B'], 14: ['u2', 'HDS', 'B'],
    15: ['u2', 'u4', 2], 16: ['u4', 4], 17: ['B'], 18: [2, 20], 19: [20],
    20: ['u2', 'S', 'TDR'], 21: [2, 23], 22: [23], 23: ['u2', 'S', 'B'],
    24: ['u2', 6, 'HS'], 25: [2, 'MDR', 'MDR'], 26: ['S'], 27: ['B'],
    28: ['u2', 'MF', 'S', 26], 29: ['u4', 4], 30: ['u4', 'u4'], 31: ['u4'],
    32: ['u4', 'u2', 'u2', 'u2', 'u2', 'u4', 'B', 'S', 'S'], 33: ['u4'],
    34: ['u4', 'u4', 'u4'], 35: ['u2', 'u2', 'u2', 'u2', 'u4', 'B', 'S', 'S', 'B'],
    36: ['u4', 35], 37: ['u4', 'u4', 'u4', 35], 38: ['u4', 'S', 'B'],
    39: ['u4', 'u4', 'S', 'S', 'IO'], 40: ['u4', 'u4', 'S', 'IO'],
    41: [2, 2], 42: ['u2', 'u2', 'TOM', 'S'], 43: ['MDR', 'B'], 44: [42, 'TDR'],
}


def size(field):
    if isinstance(field, int):
        return 2 if rows.get(field, 0) < 65536 else 4
    if field in ('u2', 'u4'):
        return int(field[-1])
    if field in ('S', 'G', 'B'):
        return 4 if heap & (1 << ['S', 'G', 'B'].index(field)) else 2
    bits, tables = CODED[field]
    return 2 if max(rows.get(t, 0) for t in tables) < (1 << (16 - bits)) else 4


tables = {}
for table_id, count in rows.items():
    schema = SCHEMAS[table_id]
    entries = []
    for _ in range(count):
        values = []
        for field in schema:
            width = size(field)
            values.append(int.from_bytes(data[offset:offset + width], 'little'))
            offset += width
        entries.append(values)
    tables[table_id] = entries


def token(value):
    table_id, index = value >> 24, value & 0xFFFFFF
    if table_id == 0x70:
        pos = streams['#US'][0] + index
        first = data[pos]
        pos += 1
        if first & 0x80 == 0:
            length = first
        elif first & 0xC0 == 0x80:
            length = ((first & 0x3F) << 8) | data[pos]
            pos += 1
        else:
            length = ((first & 0x1F) << 24) | int.from_bytes(data[pos:pos + 3], 'big')
            pos += 3
        return repr(data[pos:pos + length - 1].decode('utf-16le'))
    column = {1: 1, 2: 1, 4: 1, 6: 3, 10: 1}.get(table_id)
    if column is not None:
        return string(tables[table_id][index - 1][column])
    return hex(value)


# Deliberately limited to the IL used by the inspected rule methods. Unknown opcodes
# fail instead of scanning operand bytes and reporting false references.
OPS = {
    0: 'nop', 2: 'ldarg.0', 3: 'ldarg.1', 4: 'ldarg.2', 5: 'ldarg.3',
    6: 'ldloc.0', 7: 'ldloc.1', 8: 'ldloc.2', 9: 'ldloc.3',
    10: 'stloc.0', 11: 'stloc.1', 12: 'stloc.2', 13: 'stloc.3',
    14: 'ldarg.s', 17: 'ldloc.s', 18: 'ldloca.s', 19: 'stloc.s',
    20: 'ldnull', 21: 'ldc.i4.m1', 22: 'ldc.i4.0', 23: 'ldc.i4.1',
    24: 'ldc.i4.2', 25: 'ldc.i4.3', 26: 'ldc.i4.4', 27: 'ldc.i4.5',
    28: 'ldc.i4.6', 29: 'ldc.i4.7', 30: 'ldc.i4.8', 31: 'ldc.i4.s',
    32: 'ldc.i4', 34: 'ldc.r4', 37: 'dup', 38: 'pop', 40: 'call', 42: 'ret',
    43: 'br.s', 44: 'brfalse.s', 45: 'brtrue.s', 46: 'beq.s', 47: 'bge.s',
    48: 'bgt.s', 49: 'ble.s', 50: 'blt.s', 51: 'bne.un.s', 52: 'bge.un.s',
    53: 'bgt.un.s', 54: 'ble.un.s', 55: 'blt.un.s', 56: 'br', 57: 'brfalse',
    58: 'brtrue', 61: 'bgt', 62: 'ble', 63: 'blt', 88: 'add', 89: 'sub',
    90: 'mul', 91: 'div', 95: 'and', 96: 'or', 97: 'xor', 111: 'callvirt',
    114: 'ldstr', 115: 'newobj', 123: 'ldfld', 124: 'ldflda', 125: 'stfld',
    126: 'ldsfld', 128: 'stsfld', 140: 'box', 141: 'newarr', 142: 'ldlen',
    143: 'ldelema', 154: 'ldelem.ref', 162: 'stelem.ref', 208: 'ldtoken',
    220: 'endfinally', 221: 'leave', 222: 'leave.s',
}
TOKEN_OPS = {40, 111, 114, 115, 123, 124, 125, 126, 128, 140, 141, 143, 208}


def disassemble(method):
    pos = raw(method[0])
    first = data[pos]
    if first & 3 == 2:
        length = first >> 2
        pos += 1
    else:
        length = u32(pos + 4)
        pos += (u16(pos) >> 12) * 4
    code = data[pos:pos + length]
    i = 0
    while i < len(code):
        at, opcode = i, code[i]
        i += 1
        operand = ''
        if opcode == 254:
            extended = code[i]
            i += 1
            if extended == 22:
                operand = token(int.from_bytes(code[i:i + 4], 'little'))
                i += 4
                name = 'constrained.'
            elif extended in (1, 2, 3, 4, 5):
                name = {1: 'ceq', 2: 'cgt', 3: 'cgt.un', 4: 'clt', 5: 'clt.un'}[extended]
            else:
                raise ValueError(f'Unknown extended opcode {extended} at {at}')
        else:
            name = OPS[opcode]
            if opcode in TOKEN_OPS:
                operand = token(int.from_bytes(code[i:i + 4], 'little'))
                i += 4
            elif opcode in (14, 17, 18, 19, 31) or 43 <= opcode <= 55 or opcode == 222:
                operand = int.from_bytes(code[i:i + 1], 'little', signed=True)
                i += 1
                if opcode >= 43:
                    operand += i
            elif opcode == 34:
                operand = struct.unpack_from('<f', code, i)[0]
                i += 4
            elif opcode == 32 or 56 <= opcode <= 68 or opcode == 221:
                operand = int.from_bytes(code[i:i + 4], 'little', signed=True)
                i += 4
                if opcode != 32:
                    operand += i
        print(f'{at:04d} {name:16} {operand}')


selected = sys.argv[1:] or ['ButtonManager', 'DualButton', 'SingleButton', 'RulesManager']
for i, definition in enumerate(tables[2]):
    name = string(definition[1])
    if name not in selected:
        continue
    following = tables[2][i + 1]
    print('\nTYPE', name)
    for index in range(definition[5], following[5]):
        method = tables[6][index - 1]
        method_name = string(method[3])
        if method_name not in ('switchBtnOn', 'updateButtons', 'pressBtn', 'Interact', 'dualButton'):
            continue
        print('\nMETHOD', method_name, hex(0x06000000 + index))
        disassemble(method)
