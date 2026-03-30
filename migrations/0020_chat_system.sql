-- ═══ Chat System ═══

-- Chat rooms (DM or group)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'dm', -- 'dm', 'group', 'channel'
  name TEXT DEFAULT '',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- Chat room members
CREATE TABLE IF NOT EXISTS chat_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'quick', 'board_link', 'image'
  metadata TEXT DEFAULT '{}', -- JSON: board item ref, quick msg type, etc.
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Read receipts
CREATE TABLE IF NOT EXISTS chat_reads (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_read_at TEXT DEFAULT (datetime('now')),
  last_read_msg_id TEXT DEFAULT '',
  PRIMARY KEY (room_id, user_id)
);

-- Quick message templates
CREATE TABLE IF NOT EXISTS chat_quick_messages (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'chair', 'patient', 'general', 'emergency'
  label TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_hospital ON chat_rooms(hospital_id);
