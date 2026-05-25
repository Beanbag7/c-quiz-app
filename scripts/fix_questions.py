import json

# 读取JSON
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\public\\questions_database.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 需要修正的题目（题目文本和答案）
corrections = {
    11: {
        "题目内容": "数据库的三级模式结构中，模式对应（）。",
        "答案": "基本表"
    },
    20: {
        "题目内容": "在一个关系中，列必须是同质的，即每一列中的分量是同类型的数据，来自同一个（）。",
        "答案": "域"
    },
    39: {
        "题目内容": "在 MySQL 中可以定义（）、（）、（）、（）和（）5 种类型的完整性约束。",
        "答案": ["非空约束", "唯一约束", "主键约束", "外键约束", "检查约束"]
    },
    51: {
        "题目内容": "相关子查询的执行次数是由（）决定的。",
        "答案": "父查询表的行数（或者元组数量）"
    },
    60: {
        "题目内容": "从索引的特征角度，索引分为（）、（）、（）、（）、（）。",
        "答案": ["普通索引", "唯一索引", "主键索引", "全文索引", "空间信息索引"]
    },
    85: {
        "题目内容": "数据库设计的 6 个阶段为（）、（）、（）、（）、（）、（）。",
        "答案": ["数据库系统规划", "需求分析", "设计", "实现", "加载和测试", "运行和维护"]
    }
}

# 更新题目
updated = []
for question in data['questions']:
    seq = question['序号']
    if seq in corrections:
        question['题目内容'] = corrections[seq]['题目内容']
        question['答案'] = corrections[seq]['答案']
        updated.append(seq)
        print(f"✓ 序号{seq}: 题目和答案已修正")

print(f"\n总共修正了 {len(updated)} 道题目")

# 保存
with open('e:\\Toolls\\fetchquestions\\c-quiz-app\\public\\questions_database.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n✅ questions_database.json 已更新！")
print("\n修正的题目：")
for seq in updated:
    print(f"  - 序号{seq}: {corrections[seq]['题目内容'][:40]}...")
