// 用于Three.js小型坐标轴控件
import * as THREE from 'three';

export function createAxesWidget(width = 100, height = 100) {
  // 创建一个小场景和渲染器
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
  camera.position.set(0, 0, 200);
  camera.lookAt(0, 0, 0);

  // 坐标轴
  const axes = new THREE.AxesHelper(40);
  scene.add(axes);

  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0); // 透明背景

  // 渲染
  renderer.render(scene, camera);
  return renderer.domElement;
}
