import React, { useState, useEffect, useRef } from 'react';
import QuizCard from './components/QuizCard';
import OptionButton from './components/OptionButton';
import ProgressBar from './components/ProgressBar';
import Statistics from './components/Statistics';
import FillBlankQuestion from './components/FillBlankQuestion';
import EssayQuestion from './components/EssayQuestion';
import OnlineCount from './components/OnlineCount';
import AdminVisitorLog from './components/AdminVisitorLog';
import AdminQuizManager from './components/AdminQuizManager';
import AdminAnnouncementManager from './components/AdminAnnouncementManager';
import AnnouncementBanner from './components/AnnouncementBanner';
import MarkdownContent from './components/MarkdownContent';
import ChatWidget from './components/ChatWidget';
import Leaderboard from './components/Leaderboard';
import './App.css';
import './dark-theme.css';
import { parseFillBlankAnswerItems } from './utils/fillBlankAnswer';

const WRONG_ANSWERS_KEY = 'cq_wrong_answers';

// 渲染选择题答案解析文本：答案文本可能内嵌 <img> HTML 标签（数据结构题库），
// 用 dangerouslySetInnerHTML 渲染，图片限宽避免溢出（与 QuizCard 题干渲染方式一致）
function renderAnswerExplanation(text) {
  if (!text) return null;
  return <MarkdownContent content={String(text)} />;
}

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
  const [fillBlankRevealed, setFillBlankRevealed] = useState(false);
  const fillBlankAutoNextTimerRef = useRef(null);

  // 多选题相关状态
  const [multiSelectedAnswers, setMultiSelectedAnswers] = useState(new Set());
  const [multiSubmitted, setMultiSubmitted] = useState(false);
  const [multiCorrect, setMultiCorrect] = useState(null);
  const [multiAnswerRevealed, setMultiAnswerRevealed] = useState(false);
  const [currentView, setCurrentView] = useState(() => window.location.hash === '#admin' ? 'admin' : 'quiz');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cq_dark_mode') === '1');
  const [adminTab, setAdminTab] = useState('visitors');
  const [choiceAnswerRevealed, setChoiceAnswerRevealed] = useState(false);

  // 暗色主题同步到 <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('cq_dark_mode', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash === '#admin' ? 'admin' : 'quiz');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 错题本：按科目持久化到 localStorage
  const [subjectWrongCounts, setSubjectWrongCounts] = useState(() => {
    const counts = {};
    ['c','java','database','kline','sxyz','chaoxing','exam175','ds','co'].forEach(s => {
      try {
        const raw = localStorage.getItem(`${WRONG_ANSWERS_KEY}_${s}`);
        if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) counts[s] = arr.length; }
      } catch {}
    });
    return counts;
  });

  useEffect(() => {
    if (!selectedSubject || wrongAnswers.length === 0) return;
    try {
      localStorage.setItem(`${WRONG_ANSWERS_KEY}_${selectedSubject}`, JSON.stringify(wrongAnswers));
      setSubjectWrongCounts(prev => ({ ...prev, [selectedSubject]: wrongAnswers.length }));
    } catch {}
  }, [wrongAnswers, selectedSubject]);

  // 答题完成后上报分数到排行榜
  useEffect(() => {
    if (!showResultModal || !selectedSubject) return;
    const sender = localStorage.getItem('cq_chat_sender') || '匿名用户';
    fetch('/api/chat/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: sender, score: correctCount, subject: selectedSubject }),
    }).catch(() => {});
  }, [showResultModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (fillBlankAutoNextTimerRef.current) {
      clearTimeout(fillBlankAutoNextTimerRef.current);
    }
  }, []);

  const getSeededRandomGenerator = (seed) => {
    let current = seed >>> 0;

    return () => {
      current = (current + 0x6D2B79F5) >>> 0;
      let next = current;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  };

  const createShuffleSeed = () => {
    const timeSeed = Date.now() >>> 0;

    if (globalThis.crypto?.getRandomValues) {
      const randomBuffer = new Uint32Array(1);
      globalThis.crypto.getRandomValues(randomBuffer);
      return (randomBuffer[0] ^ timeSeed) >>> 0;
    }

    return ((Math.random() * 0xFFFFFFFF) ^ timeSeed) >>> 0;
  };

  // Fisher-Yates 洗牌算法
  const shuffleArray = (array, randomFn = Math.random) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // 打乱选项顺序（判断题保持T/F顺序）
  const shuffleOptions = (question, randomFn = Math.random) => {
    // 判断题不打乱选项
    if (question.题目类型 === '判断题') {
      return question;
    }

    if (!question.选项 || typeof question.选项 !== 'object') {
      return question;
    }

    const options = Object.entries(question.选项);
    const shuffled = shuffleArray([...options], randomFn);
    const newOptions = {};
    const keyMap = {};

    shuffled.forEach(([oldKey, value], index) => {
      const newKey = String.fromCharCode(65 + index);
      newOptions[newKey] = value;
      keyMap[oldKey] = newKey;
    });

    const newCorrectAnswer = Array.isArray(question.正确答案)
      ? question.正确答案.map(answer => keyMap[answer]).filter(Boolean)
      : keyMap[question.正确答案];
    const newAnswerText = Array.isArray(newCorrectAnswer)
      ? newCorrectAnswer.map(answer => newOptions[answer]).filter(Boolean).join('、')
      : newOptions[newCorrectAnswer];

    return {
      ...question,
      选项: newOptions,
      正确答案: newCorrectAnswer,
      答案文本: newAnswerText
    };
  };

  // 分类打乱题目：选择题和判断题分开打乱，然后合并并重新编号
  const shuffleQuestionsByType = (questionsData, randomFn = Math.random) => {
    const singleChoice = questionsData.filter(q => q.题目类型 === "单选题");
    const trueFalse = questionsData.filter(q => q.题目类型 === "判断题");

    const shuffledSingle = shuffleArray(singleChoice, randomFn);
    const shuffledTrueFalse = shuffleArray(trueFalse, randomFn);

    const combined = [...shuffledSingle, ...shuffledTrueFalse];

    return combined.map((q, index) => {
      const shuffledQ = shuffleOptions(q, randomFn);
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

  const shuffleSxyzQuestions = (questionsData) => {
    const seededRandom = getSeededRandomGenerator(createShuffleSeed());
    const shuffledQuestions = shuffleArray(questionsData, seededRandom);

    return shuffledQuestions.map((question, index) => ({
      ...shuffleOptions(question, seededRandom),
      序号: index + 1,
    }));
  };

  const normalizeChaoxingQuestions = (questionsData) => {
    return questionsData.map((question) => {
      if (question.题目类型 !== '判断题') {
        return question;
      }

      const rawAnswer = String(question.正确答案 || question.答案文本 || '').trim();
      const answerKey = rawAnswer === 'A' || rawAnswer === '对' || rawAnswer === '正确'
        ? 'A'
        : rawAnswer === 'B' || rawAnswer === '错' || rawAnswer === '错误'
          ? 'B'
          : '';

      return {
        ...question,
        选项: {
          A: '对',
          B: '错',
        },
        正确答案: answerKey,
        答案文本: answerKey === 'A' ? '对' : answerKey === 'B' ? '错' : question.答案文本,
      };
    });
  };

  const loadQuestions = async (subject) => {
    setLoading(true);
    try {
      let rawQuestions = null;

      try {
        const apiResponse = await fetch(`/api/quiz/banks/${subject}/questions`);
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          rawQuestions = apiData.questions;
        }
      } catch (apiErr) {
        console.warn('题库API不可用，回退到静态JSON:', apiErr.message);
      }

      if (!rawQuestions) {
        const fileMap = {
          database: 'questions_database.json',
          kline: 'kline_questions.json',
          sxyz: 'questions_sxyz.json',
          chaoxing: 'chaoxing-quiz-bank.json',
          exam175: 'exam-175-question-bank.json',
          ds: 'questions_data_structure.json',
          co: 'questions_computer_organization.json',
          c: 'questions.json',
          java: 'questions_java.json',
        };
        const fileName = fileMap[subject] || 'questions_java.json';
        const response = await fetch(`/${fileName}`);
        const data = await response.json();
        rawQuestions = data.questions;
      }

      // 处理数据库题库（不同的数据格式）
      if (subject === 'database' || subject === 'kline' || subject === 'sxyz' || subject === 'chaoxing' || subject === 'exam175' || subject === 'ds' || subject === 'co') {
        const dbQuestions = subject === 'sxyz'
          ? shuffleSxyzQuestions(rawQuestions)
          : subject === 'chaoxing'
            ? normalizeChaoxingQuestions(rawQuestions)
            : rawQuestions;
        setAllQuestions(dbQuestions);

        // 统计各题型数量
        const choiceCount = dbQuestions.filter(q => q.题目类型 === '选择题' || q.题目类型 === '单选题').length;
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

      const shuffled = shuffleQuestionsByType(rawQuestions);

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

    setQuestions(shuffleArray([...filtered]));
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
      filtered = allQuestions.filter(q => q.题目类型 === '选择题' || q.题目类型 === '单选题');
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

    setQuestions(shuffleArray([...filtered]));
    setSelectedQuestionType(type);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFillBlankAnswer('');
    setFillBlankSubmitted(false);
    setFillBlankCorrect(null);
    setFillBlankRevealed(false);
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

  if (currentView === 'admin') {
    const adminPanels = {
      visitors: <AdminVisitorLog />,
      quiz: <AdminQuizManager />,
      announcement: <AdminAnnouncementManager />
    };

    return (
      <div className="App">
        <div className="admin-tabs">
          <button
            className={`admin-tab-btn ${adminTab === 'visitors' ? 'active' : ''}`}
            onClick={() => setAdminTab('visitors')}
          >访客日志</button>
          <button
            className={`admin-tab-btn ${adminTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setAdminTab('quiz')}
          >题库管理</button>
          <button
            className={`admin-tab-btn ${adminTab === 'announcement' ? 'active' : ''}`}
            onClick={() => setAdminTab('announcement')}
          >前端公告</button>
          <a className="admin-tab-back" href="#/">← 返回首页</a>
        </div>
        {adminPanels[adminTab] || adminPanels.visitors}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const goToNextFillBlankQuestion = () => {
    if (fillBlankAutoNextTimerRef.current) {
      clearTimeout(fillBlankAutoNextTimerRef.current);
      fillBlankAutoNextTimerRef.current = null;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setFillBlankAnswer('');
      setFillBlankSubmitted(false);
      setFillBlankCorrect(null);
      setFillBlankRevealed(false);
    } else {
      setShowResultModal(true);
    }
  };

  // Handle option click - 允许答错后重新选择
  const handleOptionClick = (optionKey) => {
    // 如果已经答对了，不允许再选择
    if (isCorrect) return;

    setSelectedAnswer(optionKey);
    const correct = optionKey === currentQuestion.正确答案;
    setIsCorrect(correct);

    if (choiceAnswerRevealed) return;

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

  const handleMultiSelectToggle = (optionKey) => {
    if (multiSubmitted) return;

    setMultiSelectedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(optionKey)) {
        next.delete(optionKey);
      } else {
        next.add(optionKey);
      }
      return next;
    });
  };

  const handleMultiSelectSubmit = () => {
    if (!currentQuestion || multiSelectedAnswers.size === 0) return;

    const correctAnswers = Array.isArray(currentQuestion.正确答案)
      ? [...currentQuestion.正确答案].sort()
      : [currentQuestion.正确答案];
    const selectedAnswers = Array.from(multiSelectedAnswers).sort();
    const correct =
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every((answer, index) => answer === correctAnswers[index]);

    setMultiSubmitted(true);
    setMultiCorrect(correct);

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
  };

  const markQuestionAsWrong = (question) => {
    const questionId = question?.序号 || question?.题目ID;
    if (!questionId || firstAttempts.has(questionId)) return;

    setFirstAttempts(prev => new Set([...prev, questionId]));
    setAnsweredQuestions(prev => new Set([...prev, questionId]));
    setWrongAnswers(prev => [...prev, question]);
  };

  const handleChoiceViewAnswer = () => {
    if (!currentQuestion) return;
    setChoiceAnswerRevealed(true);
    markQuestionAsWrong(currentQuestion);
  };

  const handleMultiSelectViewAnswer = () => {
    if (!currentQuestion) return;
    setMultiAnswerRevealed(true);
    markQuestionAsWrong(currentQuestion);
  };

  const resetQuestionInteractionState = () => {
    if (fillBlankAutoNextTimerRef.current) {
      clearTimeout(fillBlankAutoNextTimerRef.current);
      fillBlankAutoNextTimerRef.current = null;
    }
    setSelectedAnswer(null);
    setIsCorrect(null);
    setChoiceAnswerRevealed(false);
    setFillBlankAnswer('');
    setFillBlankSubmitted(false);
    setFillBlankCorrect(null);
    setFillBlankRevealed(false);
    setMultiSelectedAnswers(new Set());
    setMultiSubmitted(false);
    setMultiCorrect(null);
    setMultiAnswerRevealed(false);
  };

  // Go to next question
  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetQuestionInteractionState();
    } else {
      // Quiz completed - 显示结果弹窗
      setShowResultModal(true);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(currentIndex - 1);
    resetQuestionInteractionState();
  };

  // 开始错题本练习
  const startWrongPractice = () => {
    setPracticeMode('wrong');
    // 从 localStorage 加载持久化的错题（如果当前内存中没有）
    const stored = wrongAnswers.length > 0 ? wrongAnswers : (() => {
      try {
        const raw = localStorage.getItem(`${WRONG_ANSWERS_KEY}_${selectedSubject}`);
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();
    setQuestions(shuffleArray([...stored]));
    setCurrentIndex(0);
    // 清除 localStorage 中该科目的错题
    try { localStorage.removeItem(`${WRONG_ANSWERS_KEY}_${selectedSubject}`); } catch {}
    setSubjectWrongCounts(prev => ({ ...prev, [selectedSubject]: 0 }));
    setWrongAnswers([]);
    setFirstAttempts(new Set());
    setAnsweredQuestions(new Set());
    setCorrectCount(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFillBlankAnswer('');
    setFillBlankSubmitted(false);
    setFillBlankCorrect(null);
    setFillBlankRevealed(false);
    setMultiSelectedAnswers(new Set());
    setMultiSubmitted(false);
    setMultiCorrect(null);
    setShowResultModal(false);
  };

  // 重新开始练习
  const restartPractice = () => {
    // 重新过滤题目 - 根据科目类型调用对应的过滤函数
    if (selectedQuestionType) {
      if (selectedSubject === 'database' || selectedSubject === 'kline' || selectedSubject === 'sxyz' || selectedSubject === 'chaoxing' || selectedSubject === 'exam175' || selectedSubject === 'ds' || selectedSubject === 'co') {
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
    setFillBlankAnswer('');
    setFillBlankSubmitted(false);
    setFillBlankCorrect(null);
    setFillBlankRevealed(false);
    setMultiSelectedAnswers(new Set());
    setMultiSubmitted(false);
    setMultiCorrect(null);
    setShowResultModal(false);
    setPracticeMode('normal');
  };

  // 科目选择界面
  if (!selectedSubject) {
    return (
      <div className="App">
        <ChatWidget />
        <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? '切换亮色' : '切换暗色'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="subject-selection">
          <div className="selection-topbar">
            <OnlineCount scope="home" />
            <a className="admin-entry" href="#admin">管理员后台</a>
          </div>
          <AnnouncementBanner />
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
              {subjectWrongCounts['c'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['c']} 道错题</div>
              )}
            </div>
            <div className="subject-card java-card" onClick={() => setSelectedSubject('java')}>
              <div className="card-glow"></div>
              <div className="subject-icon java-icon">☕</div>
              <h2>Java题库</h2>
              <p className="question-count">241道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">241</span> 单选</div>
            </div>
            {subjectWrongCounts['java'] > 0 && (
              <div className="wrong-count-badge">📝 {subjectWrongCounts['java']} 道错题</div>
            )}
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
              {subjectWrongCounts['database'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['database']} 道错题</div>
              )}
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
              {subjectWrongCounts['kline'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['kline']} 道错题</div>
              )}
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
              {subjectWrongCounts['sxyz'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['sxyz']} 道错题</div>
              )}
            </div>
            <div className="subject-card chaoxing-card" onClick={() => setSelectedSubject('chaoxing')}>
              <div className="card-glow"></div>
              <div className="subject-icon">📚</div>
              <h2>西方文化著作导读</h2>
              <p className="question-count">236道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">126</span> 单选</div>
                <div className="stat-badge"><span className="stat-number">13</span> 多选</div>
                <div className="stat-badge"><span className="stat-number">97</span> 判断</div>
              </div>
              <div className="new-badge">📚 NEW</div>
              {subjectWrongCounts['chaoxing'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['chaoxing']} 道错题</div>
              )}
            </div>
            <div className="subject-card exam175-card" onClick={() => setSelectedSubject('exam175')}>
              <div className="card-glow"></div>
              <div className="subject-icon">📘</div>
              <h2>党纪考试题库</h2>
              <p className="question-count">257道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">230</span> 选择</div>
                <div className="stat-badge"><span className="stat-number">12</span> 多选</div>
                <div className="stat-badge"><span className="stat-number">15</span> 判断</div>
              </div>
              <div className="new-badge">📘 NEW</div>
              {subjectWrongCounts['exam175'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['exam175']} 道错题</div>
              )}
            </div>
            <div className="subject-card database-card" onClick={() => setSelectedSubject('ds')}>
              <div className="card-glow"></div>
              <div className="subject-icon database-icon">🌳</div>
              <h2>数据结构（C语言）</h2>
              <p className="question-count">299道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">198</span> 选择</div>
                <div className="stat-badge"><span className="stat-number">58</span> 填空</div>
                <div className="stat-badge"><span className="stat-number">43</span> 解答</div>
              </div>
              <div className="new-badge">🌳 NEW</div>
              {subjectWrongCounts['ds'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['ds']} 道错题</div>
              )}
            </div>
            <div className="subject-card database-card" onClick={() => setSelectedSubject('co')}>
              <div className="card-glow"></div>
              <div className="subject-icon database-icon">🧠</div>
              <h2>计算机组成与系统结构</h2>
              <p className="question-count">114道题目</p>
              <div className="subject-stats">
                <div className="stat-badge"><span className="stat-number">100</span> 选择</div>
                <div className="stat-badge"><span className="stat-number">14</span> 解答</div>
              </div>
              <div className="new-badge">🧠 NEW</div>
              {subjectWrongCounts['co'] > 0 && (
                <div className="wrong-count-badge">📝 {subjectWrongCounts['co']} 道错题</div>
              )}
            </div>
          </div>
          <Leaderboard />
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

  // 题型选择界面
  if (!selectedQuestionType) {
    return (
      <div className="App">
        <ChatWidget />
        <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? '切换亮色' : '切换暗色'}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="subject-selection">
          <h1 className="selection-title">选择练习类型</h1>
          <p className="selection-subtitle">
            {selectedSubject === 'c' ? 'C语言题库' : selectedSubject === 'java' ? 'Java题库' : selectedSubject === 'kline' ? 'K线技术分析' : selectedSubject === 'sxyz' ? '形势与政策' : selectedSubject === 'chaoxing' ? '西方文化著作导读' : selectedSubject === 'exam175' ? '党纪考试题库' : selectedSubject === 'ds' ? '数据结构（C语言）' : selectedSubject === 'co' ? '计算机组成与系统结构' : '数据库题库'} - 请选择题型
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
            ) : selectedSubject === 'exam175' ? (
              <>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('choice')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>选</div>
                  <h2>选择题</h2>
                  <p>{questionStats.choice || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('multiselect')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>多</div>
                  <h2>多选题</h2>
                  <p>{questionStats.multiselect || 0}道题目</p>
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
            ) : selectedSubject === 'chaoxing' ? (
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
            ) : selectedSubject === 'co' ? (
              <>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('choice')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>选</div>
                  <h2>选择题</h2>
                  <p>{questionStats.choice || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('essay')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>答</div>
                  <h2>解答题</h2>
                  <p>{questionStats.essay || 0}道题目</p>
                </div>
                <div className="subject-card" onClick={() => filterDatabaseQuestionsByType('all')}>
                  <div className="subject-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>全</div>
                  <h2>全部题目</h2>
                  <p>{questionStats.total || 0}道题目</p>
                </div>
              </>
            ) : selectedSubject === 'database' || selectedSubject === 'ds' ? (
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
      <ChatWidget />
      <button className="theme-toggle" onClick={() => setDarkMode(d => !d)} title={darkMode ? '切换亮色' : '切换暗色'}>
        {darkMode ? '☀️' : '🌙'}
      </button>
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
            <OnlineCount scope="quiz" />
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
                      const normalize = (str) => String(str ?? '').trim().toLowerCase().replace(/\s+/g, '');
                      const userAnswers = Array.isArray(fillBlankAnswer)
                        ? fillBlankAnswer.map(answer => normalize(answer)).filter(Boolean)
                        : String(fillBlankAnswer ?? '')
                          .split(/[，,、\s]+/)
                          .map(answer => normalize(answer))
                          .filter(Boolean);

                      if (userAnswers.length === 0) return;

                      // 答案验证（忽略大小写和空格）
                      let correct = false;
                      const correctAnswers = parseFillBlankAnswerItems(currentQuestion).map(answer => normalize(answer));

                      if (correctAnswers.length > 1) {
                        correct =
                          userAnswers.length === correctAnswers.length &&
                          correctAnswers.every((answer, index) => userAnswers[index] === answer);
                      } else {
                        // 单答案题目
                        correct = correctAnswers[0] === userAnswers[0];
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

                      if (correct) {
                        if (fillBlankAutoNextTimerRef.current) {
                          clearTimeout(fillBlankAutoNextTimerRef.current);
                        }
                        fillBlankAutoNextTimerRef.current = setTimeout(() => {
                          fillBlankAutoNextTimerRef.current = null;
                          goToNextFillBlankQuestion();
                        }, 500);
                      }
                    }}
                    showAnswer={fillBlankSubmitted}
                    isCorrect={fillBlankCorrect}
                    answerRevealed={fillBlankRevealed}
                    onViewAnswer={() => {
                      setFillBlankRevealed(true);
                      const questionId = currentQuestion.序号 || currentQuestion.题目ID;
                      if (!firstAttempts.has(questionId)) {
                        setFirstAttempts(prev => new Set([...prev, questionId]));
                        setAnsweredQuestions(prev => new Set([...prev, questionId]));
                        setWrongAnswers(prev => [...prev, currentQuestion]);
                      }
                    }}
                  />

                  {!fillBlankSubmitted && (
                    <div className="navigation-buttons">
                      <button
                        className="next-btn secondary"
                        onClick={goToPreviousQuestion}
                        disabled={currentIndex === 0}
                      >
                        ← 上一题
                      </button>
                      <button
                        className="next-btn secondary"
                        onClick={goToNextQuestion}
                      >
                        {currentIndex < questions.length - 1 ? '跳过此题' : '结束练习'}
                      </button>
                    </div>
                  )}

                  {/* 填空题提交后的下一题按钮 */}
                  {fillBlankSubmitted && fillBlankCorrect === false && (
                    <div className="navigation-buttons">
                      <button
                        className="next-btn secondary"
                        onClick={goToPreviousQuestion}
                        disabled={currentIndex === 0}
                      >
                        ← 上一题
                      </button>
                      <button
                        className="next-btn"
                        onClick={goToNextFillBlankQuestion}
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
                  key={currentQuestion.序号 || currentQuestion.题目ID || currentIndex}
                  question={currentQuestion}
                  onPrevious={goToPreviousQuestion}
                  canGoPrevious={currentIndex > 0}
                  onSkip={goToNextQuestion}
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

                    goToNextQuestion();
                  }}
                />
              );
            }
            if (questionType === '多选题') {
              const correctAnswers = Array.isArray(currentQuestion.正确答案)
                ? currentQuestion.正确答案
                : [currentQuestion.正确答案];

              return (
                <>
                  <QuizCard
                    question={currentQuestion}
                    currentIndex={currentIndex}
                    totalQuestions={questions.length}
                  />

                  <div className="options-container">
                    {currentQuestion.选项 && Object.entries(currentQuestion.选项).map(([key, value]) => {
                      const isSelected = multiSelectedAnswers.has(key);
                      const isCorrectOption = correctAnswers.includes(key);
                      return (
                        <OptionButton
                          key={key}
                          optionKey={key}
                          optionText={value}
                          isSelected={isSelected}
                          isCorrect={(multiSubmitted || multiAnswerRevealed) && isCorrectOption}
                          isWrong={multiSubmitted && isSelected && !isCorrectOption}
                          disabled={multiSubmitted}
                          onClick={() => handleMultiSelectToggle(key)}
                        />
                      );
                    })}
                  </div>

                  {!multiSubmitted && (
                    <div className="control-buttons">
                      <button
                        className="control-button secondary"
                        onClick={resetQuiz}
                      >
                        重新开始
                      </button>
                      <button
                        className="control-button secondary"
                        onClick={goToPreviousQuestion}
                        disabled={currentIndex === 0}
                      >
                        ← 上一题
                      </button>
                      <button
                        className="control-button secondary"
                        onClick={goToNextQuestion}
                      >
                        {currentIndex < questions.length - 1 ? '跳过此题' : '结束练习'}
                      </button>
                      {!multiAnswerRevealed && (
                        <button
                          className="control-button secondary"
                          onClick={handleMultiSelectViewAnswer}
                        >
                          查看答案
                        </button>
                      )}
                      <button
                        className="control-button primary"
                        onClick={handleMultiSelectSubmit}
                        disabled={multiSelectedAnswers.size === 0}
                      >
                        提交答案
                      </button>
                    </div>
                  )}

                  {(multiSubmitted || multiAnswerRevealed) && (
                    <>
                      <div className={`compact-hint ${multiCorrect ? 'success' : ''}`}>
                        {multiSubmitted && multiCorrect
                          ? '✓ 回答正确！'
                          : <>正确答案：<strong>{correctAnswers.join('、')}</strong> - {renderAnswerExplanation(currentQuestion.答案文本)}</>}
                      </div>

                      {multiSubmitted && (
                        <>
                          <Statistics
                            totalQuestions={questions.length}
                            answeredQuestions={answeredQuestions.size}
                            correctAnswers={correctCount}
                          />

                          <div className="control-buttons">
                            <button
                              className="control-button secondary"
                              onClick={resetQuiz}
                            >
                              重新开始
                            </button>
                            <button
                              className="control-button secondary"
                              onClick={goToPreviousQuestion}
                              disabled={currentIndex === 0}
                            >
                              ← 上一题
                            </button>
                            <button
                              className="control-button primary"
                              onClick={goToNextQuestion}
                            >
                              {currentIndex < questions.length - 1 ? '下一题 →' : '查看结果'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
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
                      isCorrect={(isCorrect !== null || choiceAnswerRevealed) && key === currentQuestion.正确答案}
                      isWrong={isCorrect !== null && selectedAnswer === key && !isCorrect}
                      disabled={isCorrect}
                      onClick={() => handleOptionClick(key)}
                    />
                  ))}
                </div>

                {/* Compact Feedback - 紧凑的反馈提示 */}
                {(choiceAnswerRevealed || (isCorrect !== null && !isCorrect)) && (
                  <div className="compact-hint">
                    正确答案：<strong>{currentQuestion.正确答案}</strong> - {renderAnswerExplanation(currentQuestion.答案文本)}
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
                  <button
                    className="control-button secondary"
                    onClick={goToPreviousQuestion}
                    disabled={currentIndex === 0}
                  >
                    ← 上一题
                  </button>
                  <button
                    className="control-button primary"
                    onClick={goToNextQuestion}
                  >
                    {isCorrect !== null || choiceAnswerRevealed
                      ? (currentIndex < questions.length - 1 ? '下一题 →' : '查看结果')
                      : (currentIndex < questions.length - 1 ? '跳过此题' : '结束练习')}
                  </button>
                  {isCorrect === null && !choiceAnswerRevealed && (
                    <button
                      className="control-button secondary"
                      onClick={handleChoiceViewAnswer}
                    >
                      查看答案
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
