const fs = require("fs");
const path = require("path");

function insertScript() {
  const filePath = path.resolve(process.cwd(), "site", "public", "index.html");
  const htmlContent = fs.readFileSync(filePath, "utf8");
  const lines = htmlContent.split("\n");
  lines.splice(-3, 0, '<script src="/append.js"></script>');
  fs.writeFileSync(filePath, lines.join("\n"));
  console.log('完成脚本插入');
}

module.exports = insertScript;
