// Simple icon generator without canvas dependency
const fs = require('fs');
const path = require('path');

// Create a simple red square PNG (minimal valid PNG)
function createSimplePNG(size) {
  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // chunk length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8); // width
  ihdr.writeUInt32BE(size, 12); // height
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type (RGB)
  ihdr.writeUInt8(0, 18); // compression
  ihdr.writeUInt8(0, 19); // filter
  ihdr.writeUInt8(0, 20); // interlace
  
  // Calculate CRC for IHDR
  const crc = require('zlib').crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(crc, 21);
  
  // Create image data (red square)
  const rowSize = size * 3 + 1; // 3 bytes per pixel (RGB) + 1 filter byte
  const imageData = Buffer.alloc(rowSize * size);
  
  for (let y = 0; y < size; y++) {
    imageData[y * rowSize] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const offset = y * rowSize + 1 + x * 3;
      imageData[offset] = 239; // R (red)
      imageData[offset + 1] = 68; // G
      imageData[offset + 2] = 68; // B
    }
  }
  
  // Compress image data
  const compressed = require('zlib').deflateSync(imageData);
  
  // IDAT chunk (image data)
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = require('zlib').crc32(idat.slice(4, idat.length - 4));
  idat.writeUInt32BE(idatCrc, idat.length - 4);
  
  // IEND chunk (image end)
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  
  // Combine all chunks
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const png = createSimplePNG(size);
  const filename = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`✅ Created icon${size}.png`);
});

console.log('\n🎉 All icons generated successfully!');
console.log('You can now load the extension in Chrome.');

// Made with Bob
