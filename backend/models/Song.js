const pool = require('../config/database');

class Song {
  static async create({ title, artist, album, duration, file_url, user_id }) {
    const query = `
      INSERT INTO songs (title, artist, album, duration, file_url, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    const values = [title, artist, album, duration, file_url, user_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0) {
    const query = `
      SELECT s.*, u.username as uploader_name
      FROM songs s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT s.*, u.username as uploader_name
      FROM songs s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUser(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM songs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  static async search(searchTerm, limit = 50, offset = 0) {
    const query = `
      SELECT s.*, u.username as uploader_name
      FROM songs s
      JOIN users u ON s.user_id = u.id
      WHERE s.title ILIKE $1 OR s.artist ILIKE $1 OR s.album ILIKE $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [`%${searchTerm}%`, limit, offset]);
    return result.rows;
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM songs WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = Song;