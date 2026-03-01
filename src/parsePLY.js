// PLY解析函数拆分
export function parsePLY(contents) {
  const lines = contents.split('\n');
  let vertexCount = 0;
  let headerEnded = false;
  let vertexStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(' ')[2]);
    }
    if (line === 'end_header') {
      headerEnded = true;
      vertexStart = i + 1;
      break;
    }
  }
  const vertices = [];
  for (let i = vertexStart; i < vertexStart + vertexCount; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length >= 3) {
      vertices.push({ x: parseFloat(parts[0]), y: parseFloat(parts[1]), z: parseFloat(parts[2]) });
    }
  }
  return vertices;
}
