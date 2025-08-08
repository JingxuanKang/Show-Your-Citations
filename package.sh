#!/bin/bash

# 打包Chrome扩展为zip文件（用于发布）

echo "📦 开始打包 Show Your Citations 扩展..."

# 创建临时目录
TEMP_DIR="show-your-citations"
rm -rf $TEMP_DIR
mkdir $TEMP_DIR

# 复制必要文件
cp manifest.json $TEMP_DIR/
cp popup.html $TEMP_DIR/
cp popup.js $TEMP_DIR/
cp styles.css $TEMP_DIR/
cp background.js $TEMP_DIR/
cp options.html $TEMP_DIR/
cp options.js $TEMP_DIR/
cp options.css $TEMP_DIR/
cp -r icons $TEMP_DIR/
cp README.md $TEMP_DIR/
cp LICENSE $TEMP_DIR/

# 创建zip文件
VERSION=$(grep '"version"' manifest.json | cut -d '"' -f 4)
ZIP_NAME="show-your-citations-v${VERSION}.zip"

zip -r $ZIP_NAME $TEMP_DIR

# 清理临时目录
rm -rf $TEMP_DIR

echo "✅ 打包完成！"
echo "📁 文件名: $ZIP_NAME"
echo "📊 文件大小: $(du -h $ZIP_NAME | cut -f1)"
echo ""
echo "🚀 发布步骤："
echo "1. 在 GitHub 创建新的 Release"
echo "2. 上传 $ZIP_NAME 文件"
echo "3. 用户可以下载并解压使用"