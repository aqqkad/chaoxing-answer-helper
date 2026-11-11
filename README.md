# 超星作业答案辅助

超星作业页面答案辅助填题脚本，支持单选、多选、判断、填空、异步答案更新和按 data 顺序重排选项。

## 用法

油猴脚本：

1. 安装 Tampermonkey。
2. 点击[安装 / 更新脚本](https://raw.githubusercontent.com/aqqkad/chaoxing-answer-helper/main/chaoxing-answer-helper.user.js)，在 Tampermonkey 中确认安装。也可新建脚本并粘贴 `chaoxing-answer-helper.user.js` 的完整内容（包含头部元数据）。
3. 进入 `mooc1.chaoxing.com` 的作业页面，面板默认收起，点击右下角“答案助手”按钮手动展开。
4. 点击面板内的“收起”或右下角“收起答案助手”按钮可再次收起，已输入的答案会保留。

## 自动更新

已配置 `@updateURL` 和 `@downloadURL`，Tampermonkey 会按其更新检查设置检测版本并下载新版。

从旧版或手动粘贴的 `1.1.0` 升级时，请先通过上方链接安装一次 `1.1.1`，以写入自动更新地址；已安装版本若未显示更新地址，可在 Tampermonkey 的脚本设置中检查更新设置。

发布新版时，保持脚本名称和 `@namespace` 不变，并同步提高 `chaoxing-answer-helper.user.js` 与 `chaoxing-answer-helper.meta.js` 中的 `@version`。两个文件的元数据头应保持一致。

## 答案格式

- 按顺序一行一个：`A`、`ABC`、`T`、`F`。
- 单行分隔：`A/ABC/T/F/BD`，也支持空格、逗号、分号、竖线。
- 带题号：`1.A`、`2.ABC`、`41.T`。
- 判断题支持 `T/F`，也支持 `A/B`、`对/错`。
- 填空题支持文本，多空用 `*/*` 或逗号分隔，例如 `25.False*/*不确定*/*True*/*False`。

快捷键：`Alt+Shift+A` 展开 / 收起面板，输入框内 `Ctrl+Enter`（macOS 为 `Cmd+Enter`）应用答案。
