import json
import re

# 读取更新后的报告
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\fillblank_report.txt', 'r', encoding='utf-8') as f:
    report_content = f.read()

# 解析报告中的答案
answer_updates = {}

# 正则表达式匹配每个题目块
pattern = r'【序号 (\d+)】.*?题目: (.*?)\n类型: (单答案|多答案.*?)\n(.*?)(?=【序号|=====|$)'
matches = re.finditer(pattern, report_content, re.DOTALL)

for match in matches:
    seq_num = int(match.group(1))
    question_type = match.group(3)
    answer_block = match.group(4)
    
    if '单答案' in question_type:
        # 提取单答案
        ans_match = re.search(r'答案: (.+)', answer_block)
        if ans_match:
            answer_updates[seq_num] = ans_match.group(1).strip()
    else:
        # 提取多答案
        answers = []
        for ans_match in re.finditer(r'第\d+空: (.+)', answer_block):
            answers.append(ans_match.group(1).strip())
        if answers:
            answer_updates[seq_num] = answers

print(f"解析到 {len(answer_updates)} 个答案更新")

# 读取原始JSON
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\public\\questions_database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 更新答案
updated_count = 0
for question in data['questions']:
    seq = question['序号']
    if seq in answer_updates:
        old_answer = question.get('答案', '无')
        new_answer = answer_updates[seq]
        question['答案'] = new_answer
        updated_count += 1
        print(f"✓ 序号{seq}: 已更新答案")

print(f"\n总共更新了 {updated_count} 道题目的答案")

# 保存更新后的JSON
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\public\\questions_database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n✅ questions_database.json 已成功更新！")
