import React, { useState, useEffect } from 'react';
import QuizCard from './components/QuizCard';
import OptionButton from './components/OptionButton';
import ProgressBar from './components/ProgressBar';
import Statistics from './components/Statistics';
import FillBlankQuestion from './components/FillBlankQuestion';
import EssayQuestion from './components/EssayQuestion';
import './App.css';

function App() {
  const [selectedSubject, setSelectedSubject] = useState(null); // 'c' or 'java'
  const [selectedQuestionType, setSelectedQuestionType] = useState(null); // 'single' | 'truefalse' | 'all'
  const [allQuestions, setAllQuestions] = useState([]); // 存储所有题目
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [questionStats, setQuestionStats] = useState({ single: 0, truefalse: 0, total: 0 });

  // 错题本相关状态
  const [wrongAnswers, setWrongAnswers] = useState([]); // 错题集合
  const [firstAttempts, setFirstAttempts] = useState(new Set()); // 已首次尝试的题目ID
  const [showResultModal, setShowResultModal] = useState(false); // 显示结果弹窗
  const [practiceMode, setPracticeMode] = useState('normal'); // 'normal' | 'wrong'

  // 填空题相关状态
  const [fillBlankAnswer, setFillBlankAnswer] = useState('');
  const [fillBlankSubmitted, setFillBlankSubmitted] = useState(false);
  const [fillBlankCorrect, setFillBlankCorrect] = useState(null);

  // 多选题相关状态
  const [multiSelectedAnswers, setMultiSelectedAnswers] = useState(new Set());
  const [multiSubmitted, setMultiSubmitted] = useState(false);
  const [multiCorrect, setMultiCorrect] = useState(null);

  // Fisher-Yates 洗牌算法
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // 打乱选项顺序（判断题保持T/F顺序）
  const shuffleOptions = (question) => {
    // 判断题不打乱选项
    if (question.题目类型 === '判断题') {
      return question;
    }

    const options = Object.entries(question.选项);
    const shuffled = shuffleArray([...options]);
    const newOptions = {};
    const keyMap = {};

    shuffled.forEach(([oldKey, value], index) => {
      const newKey = String.fromCharCode(65 + index);
      newOptions[newKey] = value;
      keyMap[oldKey] = newKey;
    });

    const newCorrectAnswer = keyMap[question.正确答案];
    const newAnswerText = newOptions[newCorrectAnswer];

    return {
      ...question,
      选项: newOptions,
      正确答案: newCorrectAnswer,
      答案文本: newAnswerText
    };
  };

  // 分类打乱题目：选择题和判断题分开打乱，然后合并并重新编号
  const shuffleQuestionsByType = (questionsData) => {
    const singleChoice = questionsData.filter(q => q.题目类型 === "单选题");
    const trueFalse = questionsData.filter(q => q.题目类型 === "判断题");

    const shuffledSingle = shuffleArray(singleChoice);
    const shuffledTrueFalse = shuffleArray(trueFalse);

    const combined = [...shuffledSingle, ...shuffledTrueFalse];

    return combined.map((q, index) => {
      const shuffledQ = shuffleOptions(q);
      return {
        ...shuffledQ,
        序号: index + 1
      };
    });
  };

  // 仅打乱选项，保持题目顺序
  const shuffleOptionsOnly = (questions) => {
    return questions.map(q => shuffleOptions(q));
  };

  // 加载题库
  const loadQuestions = async (subject) => {
    setLoading(true);
    try {
      // 根据科目选择不同的JSON文件
      let fileName;
      if (subject === 'database') {
        fileName = 'questions_database.json';
      } else if (subject === 'kline') {
        fileName = 'kline_questions.json';
      } else if (subject === 'sxyz') {
        fileName = 'questions_sxyz.json';
      } else if (subject === 'c') {
        fileName = 'questions.json';
      } else {
        fileName = 'questions_java.json';
      }
      const response = await fetch(`/${fileName}`);
      const data = await response.json();

      // 处理数据库题库（不同的数据格式）
      if (subject === 'database' || subject === 'kline' || subject === 'sxyz') {
        const dbQuestions = data.questions;
        setAllQuestions(dbQuestions);

        // 统计各题型数量
        const choiceCount = dbQuestions.filter(q => q.题目类型 === '选择题').length;
        const fillBlankCount = dbQuestions.filter(q => q.题目类型 === '填空题').length;
        const essayCount = dbQuestions.filter(q => q.题目类型 === '解答题').length;
        const trueFalseCount = dbQuestions.filter(q => q.题目类型 === '判断题').length;
        const multiSelectCount = dbQuestions.filter(q => q.题目类型 === '多选题').length;
        const requiredCount = dbQuestions.filter(q => q.必考 === true).length;
        setQuestionStats({
          single: choiceCount,
          truefalse: trueFalseCount,
          total: dbQuestions.length,
          choice: choiceCount,
          fillblank: fillBlankCount,
          essay: essayCount,
          required: requiredCount,
          multiselect: multiSelectCount
        });
        setLoading(false);
        return;
      }

      // 现有的C/Java题库处理逻辑
      const shuffled = shuffleQuestionsByType(data.questions);

      // 存储所有题目
      setAllQuestions(shuffled);

      // 计算各题型数量
      const singleCount = shuffled.filter(q => q.题目类型 === '单选题').length;
      const trueFalseCount = shuffled.filter(q => q.题目类型 === '判断题').length;
      setQuestionStats({
        single: singleCount,
        truefalse: trueFalseCount,
        total: shuffled.length
      });

      // 不立即设置questions，等待用户选择题型
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据题型过滤题目
  const filterQuestionsByType = (type) => {
    let filtered = [];
    if (type === 'all') {
      filtered = allQuestions;
    } else if (type === 'single') {
      filtered = allQuestions.filter(q => q.题目类型 === '单选题');
    } else if (type === 'truefalse') {
      filtered = allQuestions.filter(q => q.题目类型 === '判断题');
    }

    setQuestions(filtered);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAnsweredQuestions(new Set());
    setCorrectCount(0);
    setSelectedQuestionType(type);
  };

  // 数据库题型过滤
  const filterDatabaseQuestionsByType = (type) => {
    let filtered = [];
    if (type === 'choice') {
      filtered = allQuestions.filter(q => q.题目类型 === '选择题');
    } else if (type === 'fillblank') {
      filtered = allQuestions.filter(q => q.题目类型 === '填空题');
    } else if (type === 'essay') {
      filtered = allQuestions.filter(q => q.题目类型 === '解答题');
    } else if (type === 'truefalse') {
      filtered = allQuestions.filter(q => q.题目类型 === '判断题');
    } else if (type === 'multiselect') {
      filtered = allQuestions.filter(q => q.题目类型 === '多选题');
    } else if (type === 'required') {
      filtered = allQuestions.filter(q => q.必考 === true);
    } else {
      filtered = allQuestions;
    }

    setQuestions(filtered);
    setSelectedQuestionType(type);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFillBlankAnswer('');
    setFillBlankSubmitted(false);
    setFillBlankCorrect(null);
    setMultiSelectedAnswers(new Set());
    setMultiSubmitted(false);
    setMultiCorrect(null);
    setAnsweredQuestions(new Set());
    setCorrectCount(0);
  };


  // 当选择题库时加载
  useEffect(() => {
    if (selectedSubject) {
      loadQuestions(selectedSubject);
    }
  }, [selectedSubject]);

  const currentQuestion = questions[currentIndex];

  // Handle option click - 允许答错后重新选择
  const handleOptionClick = (optionKey) => {
    // 如果已经答对了，不允许再选择
    if (isCorrect) return;

    setSelectedAnswer(optionKey);
    const correct = optionKey === currentQuestion.正确答案;
    setIsCorrect(correct);

    // 检查是否是首次答题（使用序号追踪）
    if (!firstAttempts.has(currentQuestion.序号)) {
      const newFirstAttempts = new Set(firstAttempts);
      newFirstAttempts.add(currentQuestion.序号);
      setFirstAttempts(newFirstAttempts);

      // 首次答题时标记为已回答（无论对错）
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.序号]));

      // 如果首次答对，增加正确数
      if (correct) {
        setCorrectCount(prev => prev + 1);
      } else {
        // 如果首次答错，加入错题本
        setWrongAnswers(prev => [...prev, currentQuestion]);
      }
    }

    // 只有答对才自动跳转
    if (correct) {
      setTimeout(() => {
        goToNextQuestion();
      }, 500);
    }
    // 答错了允许重新选择
  };

  // Go to next question
  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      // Quiz completed - 显示结果弹窗
      setShowResultModal(true);
    }
  };

  // 开始错题本练习
  const startWrongPractice = () => {
    setPracticeMode('wrong');
    setQuestions(wrongAnswers);
    setCurrentIndex(0);
    setWrongAnswers([]); // 清空当前错题本，准备新的记录
    setFirstAttempts(new Set());
    setAnsweredQuestions(new Set());
    setCorrectCount(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResultModal(false);
  };

  // 重新开始练习
  const restartPractice = () => {
    // 重新过滤题目 - 根据科目类型调用对应的过滤函数
    if (selectedQuestionType) {
      if (selectedSubject === 'database' || selectedSubject === 'sxyz') {
        filterDatabaseQuestionsByType(selectedQuestionType);
      } else {
        filterQuestionsByType(selectedQuestionType);
      }
    }
    setWrongAnswers([]);
    setFirstAttempts(new Set());
    setShowResultModal(false);
    setPracticeMode('normal');
  };

  // Reset quiz - 返回科目选择
  const resetQuiz = () => {
    setSelectedSubject(null);
    setSelectedQuestionType(null);
    setQuestions([]);
    setAllQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setAnsweredQuestions(new Set());
    setCorrectCount(0);
    setWrongAnswers([]);
    setFirstAttempts(new Set());
    setShowResultModal(false);
    setPracticeMode('normal');
  };

  // 科目选择界面
  if (!selectedSubject) {
    return (
      <div className="App">
        <div className="subject-selection">
          <h1 className="selection-title">选择题库</h1>
          <p className="selection-subtitle">请选择你要练习的科目</p>
          <div className="subject-cards">
            <div className="subject-card c-card" onClick={() => setSelectedSubject('c')}>
              <div className="card-glow"></div>
              <div className="subject-icon c-icon">💻</div>
              <h2>C语言题库</h2>
              <p className="question-count">165道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">69</span> 单选</div>
                <div className="stat-badge"><span className="stat-number">96</span> 判断</div>
              </div>
            </div>
            <div className="subject-card java-card" onClick={() => setSelectedSubject('java')}>
              <div className="card-glow"></div>
              <div className="subject-icon java-icon">☕</div>
              <h2>Java题库</h2>
              <p className="question-count">241道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">241</span> 单选</div>
              </div>
            </div>
            <div className="subject-card database-card" onClick={() => setSelectedSubject('database')}>
              <div className="card-glow"></div>
              <div className="subject-icon database-icon">🗄️</div>
              <h2>数据库题库</h2>
              <p className="question-count">111道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">72</span> 选择</div>
                <div className="stat-badge"><span className="stat-number">18</span> 填空</div>
                <div className="stat-badge"><span className="stat-number">21</span> 解答</div>
              </div>
              <div className="new-badge">✨ NEW</div>
            </div>
            <div className="subject-card kline-card" onClick={() => setSelectedSubject('kline')}>
              <div className="card-glow"></div>
              <div className="subject-icon kline-icon">📈</div>
              <h2>K线技术分析</h2>
              <p className="question-count">75道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">19</span> 选择</div>
                <div className="stat-badge"><span className="stat-number">51</span> 判断</div>
                <div className="stat-badge"><span className="stat-number">5</span> 多选</div>
              </div>
              <div className="new-badge">🔥 HOT</div>
            </div>
            <div className="subject-card sxyz-card" onClick={() => setSelectedSubject('sxyz')}>
              <div className="card-glow"></div>
              <div className="subject-icon sxyz-icon">🇨🇳</div>
              <h2>形势与政策</h2>
              <p className="question-count">456道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">153</span> 单选</div>
                <div className="stat-badge"><span className="stat-number">117</span> 多选</div>
                <div className="stat-badge"><span className="stat-number">82</span> 填空</div>
                <div className="stat-badge"><span className="stat-number">104</span> 判断</div>
              </div>
              <div className="new-badge">🆕 NEW</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 题型选择界面
  if (!selectedQuestionType) {
    return (
      <div className="App">
        <div className="subject-selection">
          <h1 className="selection-title">选择练习类型</h1>
          <p className="selection-subtitle">
            {selectedSubject === 'c' ? 'C语言题库' : selectedSubject === 'java' ? 'Java题库' : selectedSubject === 'kline' ? 'K线技术分析' : selectedSubject === 'sxyz' ? '形势与政策' : '数据库题库'} - 请选择题型
          </p>
          <div className="subject-cards">
            {selectedSubject === 'kline' ? (
              <>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('choice')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>选</div>
                  <h2>选择题</h2>
                  <p>{questionStats.choice || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('truefalse')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>判</div>
                  <h2>判断题</h2>
                  <p>{questionStats.truefalse || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('multiselect')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>多</div>
                  <h2>多选题</h2>
                  <p>{questionStats.multiselect || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('all')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>全</div>
                  <h2>全部题目</h2>
                  <p>{questionStats.total || 0}道题目</p>
                </div>
              </>
            ) : selectedSubject === 'database' ? (
              <>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('choice')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>选</div>
                  <h2>选择题</h2>
                  <p>{questionStats.choice || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('fillblank')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>填</div>
                  <h2>填空题</h2>
                  <p>{questionStats.fillblank || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('essay')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>答</div>
                  <h2>解答题</h2>
                  <p>{questionStats.essay || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('required')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' }}>必</div>
                  <h2>必考题</h2>
                  <p>{questionStats.required || 0}道重点题</p>
                  <div className="new-badge">⭐ 必考</div>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('all')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>全</div>
                  <h2>全部题目</h2>
                  <p>{questionStats.total || 0}道题目</p>
                </div>
              </>
            ) : selectedSubject === 'sxyz' ? (
              <>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('choice')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>单</div>
                  <h2>单选题</h2>
                  <p>{questionStats.choice || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('multiselect')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>多</div>
                  <h2>多选题</h2>
                  <p>{questionStats.multiselect || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('fillblank')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>填</div>
                  <h2>填空题</h2>
                  <p>{questionStats.fillblank || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('truefalse')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>判</div>
                  <h2>判断题</h2>
                  <p>{questionStats.truefalse || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('all')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>全</div>
                  <h2>全部题目</h2>
                  <p>{questionStats.total || 0}道题目</p>
                </div>
              </>
            ) : (
              <>
                <div className="subject-card" onClick={() => filterQuestionsByType('single')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>单</div>
                  <h2>单选题</h2>
                  <p>{questionStats.single}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterQuestionsByType('truefalse')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>判</div>
                  <h2>判断题</h2>
                  <p>{questionStats.truefalse}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterQuestionsByType('all')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>全</div>
                  <h2>全部题目</h2>
                  <p>{questionStats.total}道题目</p>
                </div>
              </>
            )}
          </div>
          <button className="back-button" onClick={() => { setSelectedSubject(null); setSelectedQuestionType(null); }}>
            ← 返回科目选择
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载题库中...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="app">
        <div className="error-container">
          <p>未找到题目数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* 开始答题后隐藏顶部标题栏 */}
      <div className="container">
        <div className="main-content">
          <div className="quiz-nav">
            <button className="back-text-btn" onClick={() => {
              if (window.confirm('确定要退出当前练习吗？进度将丢失。')) {
                setSelectedSubject(null);
                setSelectedQuestionType(null);
              }
            }}>
              ← 退出练习
            </button>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            current={currentIndex + 1}
            total={questions.length}
          />
          {/* 根据题目类型渲染不同组件 */}
          {(() => {
            const currentQuestion = questions[currentIndex];
            const questionType = currentQuestion?.题目类型;
            // 填空题
            if (questionType === '填空题') {
              return (
                <div>
                  <FillBlankQuestion
                    question={currentQuestion}
                    userAnswer={fillBlankAnswer}
                    onAnswerChange={setFillBlankAnswer}
                    onSubmit={() => {
                      if (!fillBlankAnswer.trim()) return;

                      // 答案验证（忽略大小写和空格）
                      const normalize = (str) => str.trim().toLowerCase();
                      const userAns = normalize(fillBlankAnswer);
                      let correct = false;

                      if (Array.isArray(currentQuestion.答案)) {
                        // 多答案题目：支持逗号、空格分隔输入
                        // 用户可以用中文逗号、英文逗号、顿号或空格分隔
                        const userAnswers = fillBlankAnswer
                          .split(/[，,、\s]+/)  // 支持中文逗号、英文逗号、顿号、空格
                          .map(ans => normalize(ans))
                          .filter(ans => ans.length > 0);

                        const correctAnswers = currentQuestion.答案.map(ans => normalize(ans));

                        // 检查是否所有答案都匹配（顺序可以不同）
                        if (userAnswers.length === correctAnswers.length) {
                          correct = userAnswers.every(userAns =>
                            correctAnswers.some(correctAns => correctAns === userAns)
                          ) && correctAnswers.every(correctAns =>
                            userAnswers.some(userAns => userAns === correctAns)
                          );
                        }
                      } else {
                        // 单答案题目
                        correct = normalize(currentQuestion.答案) === userAns;
                      }

                      setFillBlankSubmitted(true);
                      setFillBlankCorrect(correct);

                      // 记录答题状态
                      const questionId = currentQuestion.序号 || currentQuestion.题目ID;
                      if (!firstAttempts.has(questionId)) {
                        setFirstAttempts(prev => new Set([...prev, questionId]));
                        setAnsweredQuestions(prev => new Set([...prev, questionId]));
                        if (correct) {
                          setCorrectCount(prev => prev + 1);
                        } else {
                          setWrongAnswers(prev => [...prev, currentQuestion]);
                        }
                      }
                    }}
                    showAnswer={fillBlankSubmitted}
                    isCorrect={fillBlankCorrect}
                  />

                  {/* 填空题提交后的下一题按钮 */}
                  {fillBlankSubmitted && (
                    <div className="navigation-buttons">
                      <button
                        className="next-btn"
                        onClick={() => {
                          if (currentIndex < questions.length - 1) {
                            setCurrentIndex(prev => prev + 1);
                            setFillBlankAnswer('');
                            setFillBlankSubmitted(false);
                            setFillBlankCorrect(null);
                          } else {
                            setShowResultModal(true);
                          }
                        }}
                      >
                        {currentIndex < questions.length - 1 ? '下一题 →' : '查看结果'}
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            // 解答题
            if (questionType === '解答题') {
              return (
                <EssayQuestion
                  question={currentQuestion}
                  onScoreChange={(score) => {
                    const questionId = currentQuestion.序号 || currentQuestion.题目ID;
                    if (!firstAttempts.has(questionId)) {
                      setFirstAttempts(prev => new Set([...prev, questionId]));
                      setAnsweredQuestions(prev => new Set([...prev, questionId]));
                      if (score >= 3) {
                        setCorrectCount(prev => prev + 1);
                      } else {
                        setWrongAnswers(prev => [...prev, currentQuestion]);
                      }
                    }
                  }}
                  onNext={() => {
                    // 解答题只需标记为已查看
                    const questionId = currentQuestion.序号 || currentQuestion.题目ID;
                    if (!firstAttempts.has(questionId)) {
                      setFirstAttempts(prev => new Set([...prev, questionId]));
                      setAnsweredQuestions(prev => new Set([...prev, questionId]));
                    }

                    if (currentIndex < questions.length - 1) {
                      setCurrentIndex(prev => prev + 1);
                    } else {
                      setShowResultModal(true);
                    }
                  }}
                />
              );
            }
            // 选择题（默认）
            return (
              <>
                {/* Question Card */}
                <QuizCard
                  question={currentQuestion}
                  currentIndex={currentIndex}
                  totalQuestions={questions.length}
                />
                {/* Options */}
                <div className="options-container">
                  {currentQuestion.选项 && Object.entries(currentQuestion.选项).map(([key, value]) => (
                    <OptionButton
                      key={key}
                      optionKey={key}
                      optionText={value}
                      isSelected={selectedAnswer === key}
                      isCorrect={isCorrect !== null && key === currentQuestion.正确答案}
                      isWrong={isCorrect !== null && selectedAnswer === key && !isCorrect}
                      disabled={isCorrect}
                      onClick={() => handleOptionClick(key)}
                    />
                  ))}
                </div>

                {/* Compact Feedback - 紧凑的反馈提示 */}
                {isCorrect !== null && !isCorrect && (
                  <div className="compact-hint">
                    正确答案：<strong>{currentQuestion.正确答案}</strong> - {currentQuestion.答案文本}
                  </div>
                )}

                {isCorrect && (
                  <div className="compact-hint success">
                    ✓ 正确！0.5秒后自动跳转...
                  </div>
                )}

                {/* Statistics */}
                <Statistics
                  totalQuestions={questions.length}
                  answeredQuestions={answeredQuestions.size}
                  correctAnswers={correctCount}
                />

                {/* Control Buttons */}
                <div className="control-buttons">
                  <button
                    className="control-button secondary"
                    onClick={resetQuiz}
                  >
                    重新开始
                  </button>
                  {currentIndex < questions.length - 1 && (
                    <button
                      className="control-button primary"
                      onClick={goToNextQuestion}
                      disabled={isCorrect === null}
                    >
                      跳过此题
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </div>
        {/* 结果弹窗 */}
        {showResultModal && (
          <div className="modal-overlay">
            <div className="result-modal">
              <h2>🎉 练习完成！</h2>
              <div className="result-stats">
                <div className="stat-item">
                  <span className="stat-label">总题数</span>
                  <span className="stat-value">{questions.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">正确数</span>
                  <span className="stat-value correct">{correctCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">错误数</span>
                  <span className="stat-value wrong">{wrongAnswers.length}</span>
                </div>
                <div className="stat-item highlight">
                  <span className="stat-label">正确率</span>
                  <span className="stat-value">{answeredQuestions.size > 0 ? Math.round((correctCount / answeredQuestions.size) * 100) : 0}%</span>
                </div>
              </div>
              <div className="modal-actions">
                {wrongAnswers.length > 0 && (
                  <button className="btn-primary" onClick={startWrongPractice}>
                    📝 错题本练习 ({wrongAnswers.length}题)
                  </button>
                )}
                <button className="btn-secondary" onClick={restartPractice}>
                  🔄 重新开始
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
