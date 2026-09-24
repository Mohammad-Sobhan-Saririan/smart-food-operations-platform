import { dbPromise } from '../db/db.js';

export const getAllFloors = async (req, res) => {
    const { db } = await dbPromise;
    const floors = await db.all('SELECT * FROM floors ORDER BY name');
    res.json(floors);
};
export const createFloor = async (req, res) => {
    const { name } = req.body;
    const { db } = await dbPromise;
    // We only need to insert the name. The database handles the ID.
    await db.run('INSERT INTO floors (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Floor created successfully.' });
};
export const deleteFloor = async (req, res) => {
    const { id } = req.params;
    const { db } = await dbPromise;
    await db.run('DELETE FROM floors WHERE id = ?', [id]);
    res.status(200).json({ message: 'Floor deleted successfully.' });
};
export const updateFloor = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { db } = await dbPromise;
    await db.run('UPDATE floors SET name = ? WHERE id = ?', [name, id]);
    res.status(200).json({ message: 'Floor updated successfully.' });
};