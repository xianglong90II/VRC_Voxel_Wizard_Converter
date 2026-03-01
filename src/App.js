import logo from './logo.svg';
import './App.css';
import React, { useRef, useEffect, useState } from 'react';
import { setupControls } from './controls';
import { createAxesWidget } from './axesWidget';
import { parsePLY } from './parsePLY';
import { SidebarControls } from './SidebarControls';
import { renderScene } from './sceneRender';
import { generateVoxelImage } from './voxelImage';



function App() {

  // 切片框相关（必须放在最前面，避免未初始化访问）
  const boxSizes = [4, 16, 64, 256];
  const [sliceBoxSize, setSliceBoxSize] = useState(64);
  // 切片框体底部对齐地面选项，默认勾选
  const [sliceBoxAlignBottom, setSliceBoxAlignBottom] = useState(true);

  const mountRef = useRef();
  const [points, setPoints] = useState([]);
  const [fileContent, setFileContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [pointSize, setPointSize] = useState(1); 
  const [pointColor, setPointColor] = useState('#ffffff'); // 默认白色
  const [showCubes, setShowCubes] = useState(true); // 默认开启正方体
  const [showWireframe, setShowWireframe] = useState(false);
  const [gridSize, setGridSize] = useState(1); // 自动适配
  const [rotationX, setRotationX] = useState(0); 
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);

  React.useEffect(() => {
    // 自动适配地面网格单位，统一为1格
    setGridSize(1);
  }, [points]);

  useEffect(() => {
    if (!preview || !mountRef.current) return;
    mountRef.current.innerHTML = '';
    const width = 800;
    const height = 600;
    // 使用renderScene模块
    const {scene, camera, renderer} = renderScene({
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
      width,
      height
    });
    mountRef.current.appendChild(renderer.domElement);
    setupControls(camera, renderer);
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      renderer.dispose();
    };
  }, [preview, points, gridSize, showGrid, pointSize, pointColor, showCubes, showWireframe, sliceBoxSize, rotationX, rotationY, rotationZ, sliceBoxAlignBottom]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      setFileContent(event.target.result);
      setPreview(false);
    };
    reader.readAsText(file);
  }


  /**
 * 获取对应的 TilesPerRow
 * @param {number} pageSize 
 */

// 1. 核心：切图逻辑包装在 useMemo 中
  const base64Image = React.useMemo(() => {
    if (points.length === 0) return null;
    const tilesPerRow = Math.sqrt(sliceBoxSize) / 2;
    // 调用之前修复的、带 Alpha 30 底色的 generateVoxelImage
    return generateVoxelImage(points, sliceBoxSize, tilesPerRow);
  }, [points, sliceBoxSize]);

  // 2. 增强的预览控制
  function handlePreview() {
    if (!fileContent) return;
    const verts = parsePLY(fileContent);
    setPoints(verts);
    
    // 如果超过 80 万点，不自动开启 3D 预览
    if (verts.length < 800000) {
      setPreview(true);
    } else {
      setPreview(false);
      alert("模型过大，已切换至“仅切图”模式。");
    }
  }

  // 坐标轴控件挂载
  const axesRef = useRef();

  useEffect(() => {
    if (axesRef.current) {
      axesRef.current.innerHTML = '';
      const axesDom = createAxesWidget(80, 80);
      axesRef.current.appendChild(axesDom);
    }
  }, [preview]);

  // 计算模型边界信息
  const [modelInfo, setModelInfo] = useState(null);
  useEffect(() => {
    if (points.length > 0) {
      // 体素边界计算：统计所有点的xyz最大最小值，体素数=最大-最小+1
      const xs = points.map(p => Math.round(p.x));
      const ys = points.map(p => Math.round(p.y));
      const zs = points.map(p => Math.round(p.z));
      const min = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        z: Math.min(...zs)
      };
      const max = {
        x: Math.max(...xs),
        y: Math.max(...ys),
        z: Math.max(...zs)
      };
      setModelInfo({
        count: points.length,
        min,
        max,
        size: {
          x: max.x - min.x + 1,
          y: max.y - min.y + 1,
          z: max.z - min.z + 1
        }
      });
    }
  } , [points]);

  //-----



//-----

  // 预置模型选择
  const [sampleModels] = useState([
    { name: '立方体', file: 'cube.ply' },
    { name: 'chr_knight_points', file: 'chr_knight_points.ply' }
  ]);
  function handleSampleModel(e) {
    const filename = e.target.value;
    if (!filename) return;
    fetch(process.env.PUBLIC_URL + '/samplemodel/' + filename)
      .then(res => res.text())
      .then(text => {
        setFileContent(text);
        setPreview(false);
      });
  }



  // 自动选择能框住模型的框体
  useEffect(() => {
    if (points.length > 0) {
      const xs = points.map(p => Math.round(p.x));
      const ys = points.map(p => Math.round(p.y));
      const zs = points.map(p => Math.round(p.z));
      const sizeX = Math.max(...xs) - Math.min(...xs) + 1;
      const sizeY = Math.max(...ys) - Math.min(...ys) + 1;
      const sizeZ = Math.max(...zs) - Math.min(...zs) + 1;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      // 选择第一个大于等于maxSize的boxSizes，否则用最大
      const autoSize = boxSizes.find(s => s >= maxSize) || boxSizes[boxSizes.length-1];
      setSliceBoxSize(autoSize);
    }
  }, [boxSizes, points]);



  return (
    <div className="vscode-app">
      <div className="vscode-header">
        <img src={logo} className="vscode-logo" alt="logo" />
        <span className="vscode-title">VRC Voxel Wizard Converter</span>
        <div ref={axesRef} className="axes-widget" />
      </div>
      <div className="vscode-main">
          <div className="vscode-sidebar">
            <SidebarControls
              gridSize={gridSize}
              setGridSize={setGridSize}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
              pointSize={pointSize}
              setPointSize={setPointSize}
              pointColor={pointColor}
              setPointColor={setPointColor}
              showCubes={showCubes}
              setShowCubes={setShowCubes}
              showWireframe={showWireframe}
              setShowWireframe={setShowWireframe}
              rotationX={rotationX}
              setRotationX={setRotationX}
              rotationY={rotationY}
              setRotationY={setRotationY}
              rotationZ={rotationZ}
              setRotationZ={setRotationZ}
              sliceBoxSize={sliceBoxSize}
              setSliceBoxSize={setSliceBoxSize}
              boxSizes={boxSizes}
              sliceBoxAlignBottom={sliceBoxAlignBottom}
              setSliceBoxAlignBottom={setSliceBoxAlignBottom}
              sampleModels={sampleModels}
              handleSampleModel={handleSampleModel}
              fileContent={fileContent}
              handleFileChange={handleFileChange}
              handlePreview={handlePreview}
            />
          </div>
        <div className="vscode-view" style={{display:'flex',flexDirection:'row',height:'100%'}}>
          <div style={{flex:1,position:'relative'}}>
            <div className="vscode-canvas">
              {points.length > 800000 ? (
                <div className="big-data-notice">
                  <h2>🚀 高性能模式已激活</h2>
                  <p>点云数量：{points.length.toLocaleString()}</p>
                  <p>为了保证稳定，已关闭实时 3D 预览。切图生成功能不受影响。</p>
                </div>
              ) : (
                <div ref={mountRef} className="vscode-canvas" />
              )}
            </div>


            {modelInfo && (
              <div className="model-info-panel">
                <h4>模型信息</h4>
                <div className="info-row">点数：{modelInfo.count}（体素数：{modelInfo.count}）</div>
                <div className="info-row">X: {modelInfo.min.x} ~ {modelInfo.max.x}（体素范围，宽: {modelInfo.size.x} 体素）</div>
                <div className="info-row">Y: {modelInfo.min.y} ~ {modelInfo.max.y}（体素范围，高: {modelInfo.size.y} 体素）</div>
                <div className="info-row">Z: {modelInfo.min.z} ~ {modelInfo.max.z}（体素范围，深: {modelInfo.size.z} 体素）</div>
                <div className="info-row">切片框体：{sliceBoxSize} × {sliceBoxSize} × {sliceBoxSize} 体素</div>
                {/* 操作指南 */}
                <div style={{marginTop:18,padding:'12px 14px',background:'#23272e',borderRadius:6,color:'#d4d4d4',fontSize:14,border:'1px solid #333'}}>
                  <h4 style={{margin:'0 0 8px 0',color:'#4ec9b0',fontSize:15}}>3D视图操作</h4>
                  <ul style={{paddingLeft:18,margin:0,lineHeight:1.7}}>
                    <li>鼠标左键：旋转视角</li>
                    <li>鼠标右键：平移视图</li>
                    <li>鼠标滚轮：缩放视图</li>
                  </ul>
                </div>
                  预览输出
                <div style={{marginTop:18,padding:'12px 14px',background:'#23272e',borderRadius:6,color:'#d4d4d4',fontSize:14,border:'1px solid #333'}}>
                  <h4 style={{margin:'0 0 8px 0',color:'#4ec9b0',fontSize:15}}>预览输出</h4>
                  <div classNamestyle={{display:'flex',flexDirection:'column',gap:8}}>
                    预览图片
                    <button className="vscode-btn" onClick={() => {
                      
                      // 创建下载链接
                      const link = document.createElement('a');
                      link.href = base64Image;
                      link.download = 'voxel_atlas.png';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}>下载 RGBA 体素 Atlas</button>
                    <img className="voxel-preview-container" src={base64Image} alt="Voxel Atlas Preview" style={{maxWidth:'100%',height:'auto'}} />
                    <span style={{color:'#d4d4d4',fontSize:14}}>按照“CT隧道扫描”逻辑生成，适用于 VRC Voxel Wizard 插件</span>
                  </div>
                </div>
                
                
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
