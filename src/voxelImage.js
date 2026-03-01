/**
 * 将 MagicaVoxel PLY 点云转换为 RGBA 体素 atlas
 * 每个 voxel = 一个像素
 * Z 被分成 4 本书：R,G,B,A
 * 每本书尺寸 = L × L × (N*N)
 * atlas 尺寸 = (N*L) × (N*L)
 *
 * @param {Array<{x:number,y:number,z:number}>} points 体素点
 * @param {number} L 每一页边长（例如 16 / 32 / 64）
 * @param {number} N 横纵切分数（必须相等，例如 1 / 2 / 4 / 6）
 * @returns {string} base64 PNG
 */

const VALID_CONFIGS = [
  { page: null,    tiles: null },
  { page: 4,    tiles: 1 },
  { page: 16,   tiles: 2 },
  { page: 36,   tiles: 3 },
  { page: 64,   tiles: 4 },
  { page: 100,  tiles: 5 },
  { page: 144,  tiles: 6 },
  { page: 196,  tiles: 7 },
  { page: 256,  tiles: 8 },
  { page: 324,  tiles: 9 },
  { page: 400,  tiles: 10 },
  { page: 484,  tiles: 11 },
  { page: 576,  tiles: 12 },
  { page: 676,  tiles: 13 },
  { page: 784,  tiles: 14 },
  { page: 900,  tiles: 15 },
  { page: 1024, tiles: 16 },
];

function validateConfig(pageSize, tilesPerRow) {
  const found = VALID_CONFIGS.find(
    c => c.page === pageSize && c.tiles === tilesPerRow
  );

  if (!found) {
    throw new Error(
      `非法规格：PageSize=${pageSize}, TilesPerRow=${tilesPerRow}\n` +
      `仅允许以下组合：\n` +
      VALID_CONFIGS.map(c => `${c.page} x ${c.page} x ${c.page}  -> N=${c.tiles}`).join("\n")
    );
  }

  return found;
}

export function generateVoxelImage(points, PageSize, TilesPerRow = null) {
  const L = PageSize;
  const N = TilesPerRow || Math.round(Math.sqrt(L) / 2);
  const W = L * N;
  const pagesPerBook = N * N; // 每一本书能容纳的切片数（例如16）

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = W;
  const ctx = canvas.getContext("2d");
  
  // 核心：禁用平滑，显示锐利像素
  ctx.imageSmoothingEnabled = false;

  const imgData = ctx.createImageData(W, W);
  const data = imgData.data;

  // === 1. 初始化所有像素的 Alpha 为 30 (解决非Alpha层透明度问题) ===
  for (let i = 0; i < data.length; i += 4) {
    data[i + 0] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 30; // 统一设为 30
  }

  for (const p of points) {
    const vx = Math.floor(p.x + L / 2);
    const vy = Math.floor(p.y + L / 2); 
    const vz = Math.floor(p.z);         

    if (vx < 0 || vx >= L || vy < 0 || vy >= L || vz < 0 || vz >= L) continue;

    // 2. 确定 Book (R, G, B, A)
    // 假设 PageSize=64, 0~15层是R，16~31层是G...
    const book = Math.floor(vy / (L / 4)); 
    
    // 3. 确定 PageIndex (Book内切片索引)
    // 这里必须取模，保证 pageIndex 永远在 [0, pagesPerBook - 1] 之间
    const pageIndex = vy % pagesPerBook; 

    // 4. 计算 Tile 坐标
    const tileX = pageIndex % N;
    const tileY = Math.floor(pageIndex / N); 

    // 5. 计算像素位置 (U, V)
    const u = tileX * L + vx;
    const v = tileY * L + (L - 1 - vz); // Z轴反转使头朝上

    if (u >= 0 && u < W && v >= 0 && v < W) {
      const i = (v * W + u) * 4;
      const safeBook = Math.min(3, Math.max(0, book));

      // 6. 【核心修正】写入体素数据
      // 写入对应的分量 (R, G, B 或 A)
      data[i + safeBook] = 255;
      
      // 注意：这里不再设置 data[i+3] = 255！
      // 这样当前像素的 Alpha 将保持初始化的 30。
      // 只有当 safeBook === 3 时（即 Alpha 书对应的深度），它才会真正写入 Alpha 255。
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}