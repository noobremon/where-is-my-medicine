import struct, zlib

def create_png(filename, width=256, height=256):
    # Create a simple teal colored PNG icon
    r, g, b = 13, 148, 136  # #0D9488 teal
    
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            raw_data += struct.pack('BBB', r, g, b)
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    
    with open(filename, 'wb') as f:
        # PNG signature
        f.write(b'\x89PNG\r\n\x1a\n')
        # IHDR
        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        f.write(chunk(b'IHDR', ihdr_data))
        # IDAT
        compressed = zlib.compress(raw_data)
        f.write(chunk(b'IDAT', compressed))
        # IEND
        f.write(chunk(b'IEND', b''))

create_png('assets/icon.png')
print('Created assets/icon.png')
