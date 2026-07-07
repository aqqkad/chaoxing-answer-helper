# 超星作业答案辅助

超星作业页面答案辅助填题脚本。

## 用法

油猴脚本：

1. 安装 Tampermonkey。
2. 新建脚本并粘贴 `chaoxing-answer-helper.user.js`。
3. 进入 `mooc1.chaoxing.com` 的作业页面，右下角会出现“答案助手”按钮。

## 答案格式

- 按顺序一行一个：`A`、`ABC`、`T`、`F`。
- 单行分隔：`A/ABC/T/F/BD`，也支持空格、逗号、分号、竖线。
- 带题号：`1.A`、`2.ABC`、`41.T`。
- 判断题支持 `T/F`，也支持 `A/B`、`对/错`。

油猴版快捷键：`Alt+Shift+A`。
