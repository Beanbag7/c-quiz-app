# 🔑 获取题库数据 - 操作说明

## 方法一：浏览器控制台脚本（推荐，最简单）✅

### 步骤：

1. **登录系统**
   - 访问：http://keepctf.com:32716/#/class/exam?id=3922&classroomId=349&isView=true&submitId=109163
   - 输入账号：`2535210217`
   - 输入密码：`520hzsxy@#`

2. **打开开发者工具**
   - 按 `F12` 或 `Ctrl + Shift + I` (Windows)
   - 或 `Cmd + Option + I` (Mac)

3. **执行脚本**
   - 切换到 `Console` (控制台) 标签
   - 复制 `browser-fetch.js` 文件中的全部代码
   - 粘贴到控制台
   - 按 `Enter` 执行

4. **下载数据**
   - 脚本执行后会自动下载 JSON 文件
   - 文件名：`C语言期末客观复习题-计科ABC_完整答案版_新.json`

5. **替换文件**
   - 将下载的文件重命名为 `C语言期末客观复习题-计科ABC_完整答案版.json`
   - 替换项目目录中的原文件

---

## 方法二：Node.js 脚本

### 步骤：

1. **安装 Node.js** (如果未安装)

2. **运行脚本**
   ```bash
   cd C:\Users\Administrator\Desktop\fetchquestions
   node fetch-questions.js
   ```

3. **查看输出**
   - 脚本会生成 `C语言期末客观复习题-计科ABC_完整答案版_新.json`

---

## API 接口说明

### 1. 获取题目列表
```
GET https://ptougeapi.keepctf.cn/api/classroom/exam/show?examId=3922&classroomId=349
```

### 2. 获取正确答案
```
GET https://ptougeapi.keepctf.cn/api/classroom/exam/getTmp?examId=3922&classroomId=349&submitId=109163
```

### 3. 认证页面
```
http://keepctf.com:32716/#/class/exam?id=3922&classroomId=349&isView=true&submitId=109163
```

---

## 数据格式

输出 JSON 格式：
```json
{
  "exam_info": {
    "paperName": "C语言期末客观复习题-计科ABC",
    "examId": "3922",
    "classroomId": "349",
    "questionCount": 165
  },
  "questions": [
    {
      "序号": 1,
      "题目ID": 96708,
      "题目类型": "单选题",
      "题目内容": "...",
      "选项": {
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      },
      "分值": 1,
      "正确答案": "D",
      "答案文本": "D",
      "是否正确": null
    }
  ]
}
```

---

## 验证数据

获取新题库后，可以检查：

1. **题目总数**是否正确
2. **正确答案**字段是否有值
3. **题目内容**是否完整
4. **选项**是否齐全

---

## 故障排除

### 问题1：跨域错误
- **解决**：使用浏览器控制台脚本（方法一）

### 问题2：登录失败
- **检查**：账号密码是否正确
- **检查**：URL 参数是否完整

### 问题3：答案为空
- **原因**：submitId 可能不正确
- **解决**：检查考试链接中的 submitId 参数

---

## 联系信息

如有问题，请检查：
- 账号：2535210217
- 密码：520hzsxy@#
- Exam ID: 3922
- Classroom ID: 349
- Submit ID: 109163
