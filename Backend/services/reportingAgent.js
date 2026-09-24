import OpenAI from 'openai';
import { env } from '../config/env.js';
import { validateReadOnlySql } from '../security/readOnlySql.js';

const MAX_RETRIES = 2;

function requireLlmEnabled() {
  if (!env.llmEnabled) {
    const error = new Error('LLM reporting is disabled. Set LLM_ENABLED=true and configure the provider to enable it.');
    error.statusCode = 503;
    throw error;
  }
}

function getClient() {
  requireLlmEnabled();
  if (!process.env.LLM_API_KEY) throw new Error('LLM_API_KEY is required when LLM reporting is enabled.');
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL || undefined,
    defaultHeaders: {
      'X-Title': env.appName,
      ...(process.env.LLM_HTTP_REFERER ? { 'HTTP-Referer': process.env.LLM_HTTP_REFERER } : {}),
    },
  });
}

const getModel = () => process.env.LLM_MODEL || 'gpt-4.1-mini';

export const generateValidSqlQuery = async (schema, userQuery) => {
  const client = getClient();
  let lastError = null;
  let lastQuery = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const prompt = createPrompt(schema, userQuery, lastQuery, lastError);
      const completion = await client.chat.completions.create({ model: getModel(), messages: [{ role: 'user', content: prompt }] });
      const sqlQuery = extractSqlFromString(completion.choices?.[0]?.message?.content || '');
      lastQuery = sqlQuery;
      validateReadOnlySql(sqlQuery);
      return sqlQuery;
    } catch (error) {
      lastError = error.message;
      if (attempt === MAX_RETRIES - 1) throw new Error('LLM failed to produce a safe read-only SQL query.');
    }
  }
  throw new Error('Failed to generate SQL query.');
};

const createPrompt = (schema, userQuery, lastQuery, lastError) => {
  let prompt = `You are a SQL analytics assistant for ${env.appName}.
Convert the user question into exactly one read-only SQLite query.

SCHEMA METADATA (contains no real database rows):
${schema}

RULES:
- Return raw SQL only.
- Query must begin with SELECT or WITH and resolve to SELECT.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, REPLACE, ATTACH, DETACH, PRAGMA, VACUUM, or transaction commands.
- Use only tables and columns in the supplied schema.

User question: ${JSON.stringify(userQuery)}`;
  if (lastQuery && lastError) prompt += `\nPrevious rejected query: ${lastQuery}\nValidation error: ${lastError}\nReturn a corrected read-only query.`;
  return prompt;
};

const extractSqlFromString = (text) => {
  const match = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  return (match ? match[1] : text).trim();
};

export const generateChartConfig = async (data, userQuery, chartPrompt) => {
  const client = getClient();
  const prompt = `Based on the question ${JSON.stringify(userQuery)} and this data sample ${JSON.stringify((data || []).slice(0, 5))}, return ONLY JSON for a Recharts configuration with chartType (bar|line|pie), xAxisKey, dataKeys, and colors.${chartPrompt ? ` User preference: ${JSON.stringify(chartPrompt)}` : ''}`;
  const completion = await client.chat.completions.create({ model: getModel(), messages: [{ role: 'user', content: prompt }] });
  return JSON.parse(completion.choices?.[0]?.message?.content || '{}');
};

export const refineChartConfig = async (data, oldConfig, chatHistory, userRequest) => {
  const client = getClient();
  const prompt = `Return ONLY an updated Recharts JSON configuration.\nData sample: ${JSON.stringify((data || []).slice(0, 3))}\nCurrent config: ${JSON.stringify(oldConfig)}\nConversation: ${JSON.stringify(chatHistory)}\nRequest: ${JSON.stringify(userRequest)}`;
  const completion = await client.chat.completions.create({ model: getModel(), messages: [{ role: 'user', content: prompt }] });
  return JSON.parse(completion.choices?.[0]?.message?.content || '{}');
};
