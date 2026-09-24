import { dbPromise } from '../db/db.js';
import { generateValidSqlQuery, generateChartConfig, refineChartConfig } from '../services/reportingAgent.js';
import { validateReadOnlySql } from '../security/readOnlySql.js';

const REPORT_TABLES = [
  'users', 'orders', 'products', 'floors', 'rst_companies', 'rst_meal_types', 'rst_dishes',
  'rst_menus', 'rst_daily_options', 'rst_reservations', 'rst_reservation_statuses',
];

export const getDatabaseSchema = async () => {
  const { db } = await dbPromise;
  const sections = [];
  for (const table of REPORT_TABLES) {
    const columns = await db.all(`PRAGMA table_info(${table})`);
    const safeColumns = columns
      .filter(c => !(table === 'users' && ['password', 'adAttributes'].includes(c.name)))
      .map(c => `${c.name} ${c.type}${c.pk ? ' PRIMARY KEY' : ''}`);
    sections.push(`TABLE: ${table}\nCOLUMNS: ${safeColumns.join(', ')}`);
  }
  return sections.join('\n\n');
};

export const runReportQuery = async (req, res) => {
  const { nl_query, sql_query } = req.body;
  if (!nl_query && !sql_query) return res.status(400).json({ message: 'A query is required.' });
  try {
    let finalSqlQuery = sql_query;
    if (!finalSqlQuery) finalSqlQuery = await generateValidSqlQuery(await getDatabaseSchema(), nl_query);
    finalSqlQuery = validateReadOnlySql(finalSqlQuery);
    const { db } = await dbPromise;
    const results = await db.all(finalSqlQuery);
    res.status(200).json({ results, sqlQuery: finalSqlQuery });
  } catch (error) {
    const status = error.statusCode || (String(error.message).includes('read-only') || String(error.message).includes('Only ') ? 400 : 500);
    res.status(status).json({ message: error.message || 'An error occurred.' });
  }
};

export const saveReport = async (req, res) => {
  const { name, nl_query, sql_query, viz_type, chart_config, conversation_history } = req.body;
  if (!name || !sql_query) return res.status(400).json({ message: 'Report name and SQL query are required.' });
  try {
    const safeSql = validateReadOnlySql(sql_query);
    const { db, nanoid } = await dbPromise;
    await db.run(`
      INSERT INTO reports (id, adminId, name, nl_query, sql_query, viz_type, chart_config, conversation_history)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nanoid(), req.user.id, name, nl_query || null, safeSql, viz_type || 'table',
      chart_config ? JSON.stringify(chart_config) : null,
      conversation_history ? JSON.stringify(conversation_history) : null,
    ]);
    res.status(201).json({ message: 'Report saved successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getSavedReports = async (req, res) => {
  try {
    const { db } = await dbPromise;
    res.status(200).json(await db.all('SELECT * FROM reports WHERE adminId = ? ORDER BY createdAt DESC', [req.user.id]));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
};

export const deleteReport = async (req, res) => {
  try {
    const { db } = await dbPromise;
    await db.run('DELETE FROM reports WHERE id = ? AND adminId = ?', [req.params.id, req.user.id]);
    res.status(200).json({ message: 'Report deleted successfully.' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
};

export const getChartConfigForData = async (req, res) => {
  try { res.status(200).json({ chartConfig: await generateChartConfig(req.body.data, req.body.userQuery, req.body.chartPrompt) }); }
  catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};

export const refineChart = async (req, res) => {
  try { res.status(200).json({ newConfig: await refineChartConfig(req.body.data, req.body.oldConfig, req.body.chatHistory, req.body.userRequest) }); }
  catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};
