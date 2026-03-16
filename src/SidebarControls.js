// 控件组件拆分
import React from 'react';

export function SidebarControls({
  gridSize,
  setGridSize,
  showGrid,
  setShowGrid,
  pointSize,
  setPointSize,
  pointColor,
  setPointColor,
  showCubes,
  setShowCubes,
  showWireframe,
  setShowWireframe,
  rotationX,
  setRotationX,
  rotationY,
  setRotationY,
  rotationZ,
  setRotationZ,
  sliceBoxSize,
  setSliceBoxSize,
  boxSizes,
  sliceBoxAlignBottom,
  setSliceBoxAlignBottom,
  sampleModels,
  handleSampleModel,
  fileContent,
  handleFileChange,
  handlePreview
}) {
  return (
    <>
          <div className="vscode-sidebar-section">
        <label className="vscode-label">选择示例模型</label>
        <select className="vscode-input" onChange={handleSampleModel} defaultValue="">
          <option value="">请选择</option>
          {sampleModels.map(m => (
            <option key={m.file} value={m.file}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="vscode-sidebar-section">
        <label htmlFor="ply-upload" className="vscode-label">上传PLY点云文件</label>
        <input id="ply-upload" type="file" accept=".ply" onChange={handleFileChange} className="vscode-input" />
        <button className="vscode-btn" onClick={handlePreview} disabled={!fileContent}>预览</button>
      </div>
      
      <div className="vscode-sidebar-section">
        <label className="vscode-label">地面网格单位（自动适配）</label>
        <input type="number" min="0.01" step="0.01" value={gridSize} onChange={e => setGridSize(Number(e.target.value))} className="vscode-input" />
        <button className="vscode-btn" onClick={() => setShowGrid(v => !v)}>{showGrid ? '关闭地面网格' : '开启地面网格'}</button>
      </div>
      <div className="vscode-sidebar-section">
        <label className="vscode-label">点大小</label>
        <input type="range" min="0.1" max="5" step="0.1" value={pointSize} onChange={e => setPointSize(Number(e.target.value))} className="vscode-slider" />
        <span style={{ color: '#d4d4d4', fontSize: 14 }}>{pointSize}</span>
        <label className="vscode-label" style={{marginTop:8}}>点颜色</label>
        <input type="color" value={pointColor} onChange={e => setPointColor(e.target.value)} className="vscode-input" style={{width:40,height:40,padding:0,border:'none',background:'transparent'}} />
      </div>
      <div className="vscode-sidebar-section">
        <label className="vscode-label">渲染选项</label>
        <button className="vscode-btn" onClick={() => setShowCubes(v => !v)}>{showCubes ? '关闭正方体' : '开启正方体'}</button>
        <button className="vscode-btn" onClick={() => setShowWireframe(v => !v)}>{showWireframe ? '关闭线框' : '开启线框'}</button>
      </div>
      <div className="vscode-sidebar-section">
        <label className="vscode-label">模型旋转（度）</label>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'8px'}}>
          <div>
            X
            <input type="number" min="0" max="360" value={rotationX} onChange={e => setRotationX(Number(e.target.value))} className="vscode-input" style={{width:60,marginLeft:4}} />
          </div>
          <div>
            Y
            <input type="number" min="0" max="360" value={rotationY} onChange={e => setRotationY(Number(e.target.value))} className="vscode-input" style={{width:60,marginLeft:4}} />
          </div>
          <div>
            Z
            <input type="number" min="0" max="360" value={rotationZ} onChange={e => setRotationZ(Number(e.target.value))} className="vscode-input" style={{width:60,marginLeft:4}} />
          </div>
        </div>
      </div>
      <div className="vscode-sidebar-section">
        <label className="vscode-label">切片框体大小</label>
        <select className="vscode-input" value={sliceBoxSize} onChange={e => setSliceBoxSize(Number(e.target.value))}>
          {boxSizes.map(size => (
            <option key={size} value={size}>{size} x {size} x {size} 贴图分别对应4x4,32x32,256x256,2048x2048</option>
          ))}
        </select>
        <div style={{marginTop:8}}>
          <input
            type="checkbox"
            id="sliceBoxAlignBottom"
            checked={sliceBoxAlignBottom}
            onChange={e => setSliceBoxAlignBottom(e.target.checked)}
            style={{marginRight:4}}
          />
          <label htmlFor="sliceBoxAlignBottom" style={{userSelect:'none',color:'#d4d4d4',fontSize:14}}>
            切片框体底部对齐地面
          </label>
        </div>
      </div>

    </>
  );
}
