// Three.js场景渲染逻辑拆分
import * as THREE from 'three';

/**
 * 渲染场景，返回scene对象
 * @param {Object} options - 配置项
 * @param {Array} points - 点云数据
 * @param {number} gridSize - 网格单位
 * @param {boolean} showGrid - 是否显示网格
 * @param {number} pointSize - 点大小
 * @param {string} pointColor - 点颜色
 * @param {boolean} showCubes - 是否显示正方体
 * @param {boolean} showWireframe - 是否显示线框
 * @param {number} sliceBoxSize - 切片框体大小
 * @param {boolean} sliceBoxAlignBottom - 框体底部对齐地面
 * @param {number} rotationX - X轴旋转
 * @param {number} rotationY - Y轴旋转
 * @param {number} rotationZ - Z轴旋转
 * @returns {Object} {scene, camera, renderer, target}
 */


export function renderScene({
  points,
  gridSize,
  showGrid,
  pointSize,
  pointColor,
  showCubes,
  showWireframe,
  sliceBoxSize,
  sliceBoxAlignBottom,
  rotationX,
  rotationY,
  rotationZ,
  width = 800,
  height = 600
}) {
  const scene = new THREE.Scene();

  // --- 1. 坐标系对齐 MagicaVoxel ---
  // MagicaVoxel 是 Z 轴向上
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.up.set(0, 0, 1); 

  if (showGrid) {
    // GridHelper 默认是在 XZ 平面上，我们要让它平铺在 XY 平面 (地面)
    const grid = new THREE.GridHelper(gridSize * 32, 32, 0x888888, 0x444444);
    grid.rotation.x = Math.PI / 2; // 旋转 90 度，使其在 XY 平面上
    scene.add(grid);
  }

  const axes = new THREE.AxesHelper(gridSize * 8);
  scene.add(axes);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(width, height);
  renderer.setClearColor('#222');

  let target = new THREE.Vector3(0, 0, 0);
  let usedPoints = points;

  if (points.length > 0) {
    if (rotationX !== 0 || rotationY !== 0 || rotationZ !== 0) {
      usedPoints = rotatePoints(points, rotationX, rotationY, rotationZ);
    }

    const bbox = getBoundingBox(usedPoints);
    target.set(
      (bbox.min.x + bbox.max.x) / 2,
      (bbox.min.y + bbox.max.y) / 2,
      (bbox.min.z + bbox.max.z) / 2
    );

    const size = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
    const distance = size / (2 * Math.tan((camera.fov * Math.PI) / 360)) * 1.5;
    
    // 相机默认看向中心，Z轴向上
    camera.position.set(target.x + distance, target.y - distance, target.z + distance);
    camera.lookAt(target);

    // --- 2. 切片框体永远置于世界中心 (0, 0, 0) ---
    // --- 切片框体永远置于世界中心 (0, 0, 0) ---
    if (sliceBoxSize > 0) {
      const boxGeom = new THREE.BoxGeometry(sliceBoxSize, sliceBoxSize, sliceBoxSize);
      const boxMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      
      let baseZ = 0; 
      if (sliceBoxAlignBottom) {
        // Z 轴向上，底部对齐地面 (z=0)
        baseZ = sliceBoxSize / 2;
      }

      boxMesh.position.set(0, 0, baseZ);
      scene.add(boxMesh);

      const blockSize = sliceBoxSize / 4;
      
      // 【关键修改】：分割块中心点沿着 Y 轴（深度）分布
      const blockCenters = [0, 1, 2, 3].map(i => {
        return {
          x: 0,
          y: (-sliceBoxSize / 2) + (blockSize / 2) + (i * blockSize), // 沿 Y 轴分布
          z: baseZ
        };
      });

      const blockLabels = ['R', 'G', 'B', 'A'];
      blockCenters.forEach((center, i) => {
        // 绘制垂直分割面线框（在 XZ 平面上，垂直于 Y 轴）
        if (i < 3) {
          const splitY = center.y + blockSize / 2;
          const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-sliceBoxSize/2, splitY, baseZ - sliceBoxSize/2),
            new THREE.Vector3(sliceBoxSize/2, splitY, baseZ - sliceBoxSize/2),
            new THREE.Vector3(sliceBoxSize/2, splitY, baseZ + sliceBoxSize/2),
            new THREE.Vector3(-sliceBoxSize/2, splitY, baseZ + sliceBoxSize/2),
            new THREE.Vector3(-sliceBoxSize/2, splitY, baseZ - sliceBoxSize/2),
          ]);
          const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x00ffff }));
          scene.add(line);
        }

        // 标注字母
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(blockLabels[i], 64, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(blockSize * 0.8, blockSize * 0.4, 1);
        
        // 字母放在每一层顶部的中心位置
        sprite.position.set(0, center.y, baseZ + sliceBoxSize/2 + 2);
        scene.add(sprite);
      });
    }

    // --- 3. 渲染体素点 (坐标映射) ---
    if (!showCubes) {
      const geometry = new THREE.BufferGeometry();
      const posArray = new Float32Array(usedPoints.length * 3);
      usedPoints.forEach((p, i) => {
        posArray[i * 3] = p.x;
        posArray[i * 3 + 1] = p.y;
        posArray[i * 3 + 2] = p.z;
      });
      geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: pointColor, size: pointSize })));
    }

    if (showCubes || showWireframe) {
      const geom = new THREE.BoxGeometry(pointSize, pointSize, pointSize);
      usedPoints.forEach(p => {
        // 关键：将 p.x 映射到格子的中心。
        // 如果 pointSize 为 1，则偏移 0.5。
        const offset = pointSize / 2;
        
        // 修改渲染逻辑

if (showCubes && points.length > 0) {
  const geometry = new THREE.BoxGeometry(pointSize, pointSize, pointSize);
  const material = new THREE.MeshBasicMaterial({ color: pointColor });
  const iMesh = new THREE.InstancedMesh(geometry, material, points.length);

  const matrix = new THREE.Matrix4();
  const offset = pointSize / 2;

  // 性能关键：手动设置矩阵，不创建多余对象
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    matrix.makeTranslation(p.x + offset, p.y + offset, p.z + offset);
    iMesh.setMatrixAt(i, matrix);
  }

  iMesh.instanceMatrix.needsUpdate = true;
  scene.add(iMesh);
}

        if (showWireframe) {
          const w = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
          w.position.set(p.x + offset, p.y + offset, p.z + offset); // 增加偏移
          scene.add(w);
        }
      });
    }
  }

  return { scene, camera, renderer, target };
}

function getBoundingBox(points) {
  if (!points.length) return null;
  let min = { x: Infinity, y: Infinity, z: Infinity };
  let max = { x: -Infinity, y: -Infinity, z: -Infinity };
  points.forEach(p => {
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  });
  return { min, max };
}

function rotatePoints(points, xDeg, yDeg, zDeg) {
  const xRad = xDeg * Math.PI / 180;
  const yRad = yDeg * Math.PI / 180;
  const zRad = zDeg * Math.PI / 180;
  return points.map(p => {
    let { x, y, z } = p;
    let y1 = y * Math.cos(xRad) - z * Math.sin(xRad);
    let z1 = y * Math.sin(xRad) + z * Math.cos(xRad);
    y = y1; z = z1;
    let x2 = x * Math.cos(yRad) + z * Math.sin(yRad);
    let z2 = -x * Math.sin(yRad) + z * Math.cos(yRad);
    x = x2; z = z2;
    let x3 = x * Math.cos(zRad) - y * Math.sin(zRad);
    let y3 = x * Math.sin(zRad) + y * Math.cos(zRad);
    x = x3; y = y3;
    return { x, y, z };
  });
}
