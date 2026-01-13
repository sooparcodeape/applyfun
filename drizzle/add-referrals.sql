-- Add referral code to users table
ALTER TABLE users ADD COLUMN referral_code VARCHAR(20);
ALTER TABLE users ADD COLUMN referred_by_code VARCHAR(20);
CREATE UNIQUE INDEX idx_referral_code ON users(referral_code);

-- Create referrals table to track referral rewards
CREATE TABLE IF NOT EXISTS referrals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrer_id INT NOT NULL,
  referee_id INT NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  referee_first_purchase_at DATETIME,
  referrer_rewarded BOOLEAN DEFAULT FALSE,
  referee_rewarded BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_referrer (referrer_id),
  INDEX idx_referee (referee_id),
  INDEX idx_code (referral_code)
);
