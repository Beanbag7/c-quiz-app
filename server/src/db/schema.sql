CREATE TABLE IF NOT EXISTS quiz_banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '📖',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_id INT NOT NULL,
  seq INT NOT NULL,
  question_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  options JSON,
  correct_answer TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  explanation TEXT,
  score DECIMAL(5,1) DEFAULT 1.0,
  is_required TINYINT(1) DEFAULT 0,
  chapter VARCHAR(200),
  question_images JSON,
  FOREIGN KEY (bank_id) REFERENCES quiz_banks(id) ON DELETE CASCADE,
  INDEX idx_bank_seq (bank_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
