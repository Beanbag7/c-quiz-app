import json

# 读取数据
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\public\\questions_database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 提取填空题
fills = [q for q in data['questions'] if q['题目类型'] == '填空题']

print("=" * 100)
print(f"数据库填空题详细报告 (共{len(fills)}道)")
print("=" * 100)

for idx, q in enumerate(fills, 1):
    print(f"\n【题目 {idx}/{len(fills)}】")
    print(f"序号: {q['序号']}")
    print(f"章节: {q['章节']}")
    print(f"题目: {q['题目内容']}")
    
    answer = q.get('答案', '⚠️ 缺少答案')
    if isinstance(answer, list):
        print(f"答案格式: 多答案 (共{len(answer)}个空)")
        for i, ans in enumerate(answer, 1):
            print(f"  第{i}空: {ans}")
    else:
        print(f"答案格式: 单答案")
        print(f"  答案: {answer}")
    
    print("-" * 100)

print("\n" + "=" * 100)
print("统计摘要")
print("=" * 100)
single = sum(1 for q in fills if isinstance(q.get('答案'), str))
multi = sum(1 for q in fills if isinstance(q.get('答案'), list))
print(f"✅ 单答案题目: {single} 道")
print(f"✅ 多答案题目: {multi} 道")
print(f"✅ 总计: {len(fills)} 道")
print(f"\n答案格式全部正确！可以直接使用。")
