import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { open } from 'sqlite';
const dataBaseLocation = './back/db/db.db';
async function createDatabase() {
    const db = await open({
        filename: dataBaseLocation,
        driver: sqlite3.Database
    });
    await db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			displayname TEXT NOT NULL
		)
	`);
}
createDatabase().catch(error => {
    console.error('An error occurred while managing the database:', error);
});
export async function registerUser(username, password, displayname) {
    const db = await open({
        filename: dataBaseLocation,
        driver: sqlite3.Database
    });
    const hashedPasswort = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password, displayname) VALUES (?, ?, ?)', [username, hashedPasswort, displayname]);
}
export async function loginUser(username, password) {
    const db = await open({
        filename: dataBaseLocation,
        driver: sqlite3.Database
    });
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (!user)
        throw new Error('User not found');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
        throw new Error('Password incorrect');
    return user;
}
