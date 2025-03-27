// 简单的构建脚本，用于优化和打包扫雷游戏的资源

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// 压缩JS
async function minifyJS() {
  console.log('正在压缩 JavaScript...');
  const jsFile = path.join(__dirname, 'js', 'game.js');
  const js = fs.readFileSync(jsFile, 'utf8');
  
  const result = await minify(js, { 
    compress: true,
    mangle: true 
  });
  
  fs.writeFileSync(path.join(distDir, 'game.min.js'), result.code);
  console.log('JavaScript 压缩完成！');
}

// 压缩CSS
function minifyCSS() {
  console.log('正在压缩 CSS...');
  const cssFile = path.join(__dirname, 'css', 'style.css');
  const css = fs.readFileSync(cssFile, 'utf8');
  
  const result = new CleanCSS({ level: 2 }).minify(css);
  fs.writeFileSync(path.join(distDir, 'style.min.css'), result.styles);
  console.log('CSS 压缩完成！');
}

// 压缩HTML并更新引用
function minifyHTML() {
  console.log('正在处理 HTML...');
  const htmlFile = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  
  // 更新引用为压缩后的文件
  html = html.replace('css/style.css', 'style.min.css');
  html = html.replace('js/game.js', 'game.min.js');
  
  // 压缩HTML
  const minifiedHtml = htmlMinifier.minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true
  });
  
  fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHtml);
  console.log('HTML 处理完成！');
}

// 复制资源
function copyAssets() {
  console.log('正在复制资源文件...');
  // 如果有图片或其他资源，可以在这里复制
  console.log('资源文件复制完成！');
}

// 执行构建流程
async function build() {
  console.log('开始构建项目...');
  
  try {
    await minifyJS();
    minifyCSS();
    minifyHTML();
    copyAssets();
    
    console.log('项目构建完成！可以在 dist 目录中找到优化后的文件。');
  } catch (error) {
    console.error('构建过程中出现错误:', error);
  }
}

build(); 