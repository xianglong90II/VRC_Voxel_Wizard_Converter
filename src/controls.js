// 用于Three.js交互控制 (MagicaVoxel Z-Up + 垂直反转)
import * as THREE from 'three';

export function setupControls(camera, renderer) {
  let isDragging = false;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;
  let target = new THREE.Vector3(0, 0, 0);

  camera.up.set(0, 0, 1);

  renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button === 0) isDragging = true;
    else if (e.button === 1) isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
  });

  renderer.domElement.addEventListener('mousemove', (e) => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    if (isDragging) {
      const azimuth = dx * 0.005; 
      // --- 垂直操作反转：将原来的 dy * 0.005 改为 -dy ---
      const elevation = -dy * 0.005; 

      const offset = camera.position.clone().sub(target);
      
      // 1. 绕世界 Z 轴水平旋转
      const quaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -azimuth);
      offset.applyQuaternion(quaternionZ);

      // 2. 绕相机本地右向量垂直旋转
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), offset).normalize();
      if (right.lengthSq() > 0) {
        const quaternionRight = new THREE.Quaternion().setFromAxisAngle(right, elevation);
        const newOffset = offset.clone().applyQuaternion(quaternionRight);
        
        // 极点保护：防止相机与 Z 轴重合导致观察方向丢失
        const cosTheta = newOffset.clone().normalize().dot(new THREE.Vector3(0, 0, 1));
        if (Math.abs(cosTheta) < 0.98) { 
          offset.copy(newOffset);
        }
      }

      camera.position.copy(target.clone().add(offset));
      camera.lookAt(target);

    } else if (isPanning) {
      const panSpeed = camera.position.distanceTo(target) * 0.001;
      const vRight = new THREE.Vector3();
      const vUp = new THREE.Vector3();
      
      // 从相机矩阵中提取当前的右方向和上方向
      camera.matrix.extractBasis(vRight, vUp, new THREE.Vector3());

      const pan = vRight.multiplyScalar(-dx * panSpeed).add(vUp.multiplyScalar(dy * panSpeed));
      
      camera.position.add(pan);
      target.add(pan);
      camera.lookAt(target);
    }
    
    lastX = e.clientX;
    lastY = e.clientY;
  });

  renderer.domElement.addEventListener('wheel', (e) => {
    const zoomFactor = 1 + (e.deltaY > 0 ? 0.1 : -0.1);
    const offset = camera.position.clone().sub(target);
    if (offset.length() < 0.5 && zoomFactor < 1) return;

    offset.multiplyScalar(zoomFactor);
    camera.position.copy(target.clone().add(offset));
    camera.lookAt(target);
  }, { passive: true });
}