const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const firebaseService = require('./firebaseService');
const axios = require('axios');
require('dotenv').config();

// Load the system prompt
const promptPath = path.join(__dirname, '../../prompts/election_assistant.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf8');

// Load candidates and constituency data for validation and fallback
let candidatesData = {};
let constituencyData = [];
let candidatesExtraData = {};

try {
  const candidatesExtraPath = path.join(__dirname, '../data/candidates_extra.json');
  if (fs.existsSync(candidatesExtraPath)) {
    candidatesExtraData = JSON.parse(fs.readFileSync(candidatesExtraPath, 'utf8'));
    console.log('✓ Loaded candidates extra data');
  }

  const constituenciesPath = path.join(__dirname, '../data/constituencies.json');
  if (fs.existsSync(constituenciesPath)) {
    constituencyData = JSON.parse(fs.readFileSync(constituenciesPath, 'utf8'));
    console.log('✓ Loaded constituency data');
  }

  // Parse candidates data from all extra data
  Object.entries(candidatesExtraData).forEach(([constituencyId, candidates]) => {
    candidatesData[constituencyId] = candidates;
  });
} catch (error) {
  console.warn('⚠ Warning: Could not load validation data:', error.message);
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define tool schemas (Gemini format)
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_constituency',
        description: 'Fetch a constituency from the database by its name.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The name of the constituency in Tamil Nadu (e.g., "Mylapore", "Velachery").'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'get_candidates',
        description: 'Fetch the list of candidates for a given constituency ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            constituencyId: {
              type: 'STRING',
              description: 'The unique ID of the constituency.'
            }
          },
          required: ['constituencyId']
        }
      },
      {
        name: 'get_candidate_details',
        description: 'Fetch detailed information for a specific candidate within a constituency.',
        parameters: {
          type: 'OBJECT',
          properties: {
            candidateId: {
              type: 'STRING',
              description: 'The unique ID of the candidate.'
            },
            constituencyId: {
              type: 'STRING',
              description: 'The unique ID of the constituency the candidate belongs to.'
            }
          },
          required: ['candidateId', 'constituencyId']
        }
      }
    ]
  }
];

// Define tools for backup (OpenAI format)
const backupTools = [
  {
    type: 'function',
    function: {
      name: 'get_constituency',
      description: 'Fetch a constituency from the database by its name.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the constituency in Tamil Nadu (e.g., "Mylapore", "Velachery").'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_candidates',
      description: 'Fetch the list of candidates for a given constituency ID.',
      parameters: {
        type: 'object',
        properties: {
          constituencyId: {
            type: 'string',
            description: 'The unique ID of the constituency.'
          }
        },
        required: ['constituencyId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_candidate_details',
      description: 'Fetch detailed information for a specific candidate within a constituency.',
      parameters: {
        type: 'object',
        properties: {
          candidateId: {
            type: 'string',
            description: 'The unique ID of the candidate.'
          },
          constituencyId: {
            type: 'string',
            description: 'The unique ID of the constituency the candidate belongs to.'
          }
        },
        required: ['candidateId', 'constituencyId']
      }
    }
  }
];

// Initialize the generative model
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash', 
  systemInstruction: systemPrompt,
  tools: tools
});

// A simple in-memory map to hold chat sessions
const chatSessions = new Map();

/**
 * Executes a tool function based on the name and arguments.
 */
async function executeTool(name, args) {
  console.log(`Executing tool: ${name} with args:`, args);
  let result;
  try {
    switch (name) {
      case 'get_constituency':
        result = await firebaseService.getConstituency(args.name);
        break;
      case 'get_candidates':
        result = await firebaseService.getCandidates(args.constituencyId);
        break;
      case 'get_candidate_details':
        result = await firebaseService.getCandidateDetails(args.candidateId, args.constituencyId);
        break;
      default:
        result = { success: false, message: `Tool ${name} not found.` };
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    result = { success: false, message: `Error executing tool: ${error.message}` };
  }
  return result;
}

/**
 * Search helper functions for mock response
 */
function searchConstituency(name) {
  const lowerName = name.toLowerCase();
  return constituencyData.find(c => c.name.toLowerCase().includes(lowerName)) ||
         constituencyData.find(c => lowerName.includes(c.name.toLowerCase()));
}

function getCandidatesByConstituency(constituencyId) {
  return candidatesData[constituencyId] || [];
}

function searchCandidates(query) {
  const lowerQuery = query.toLowerCase();
  const results = [];
  Object.entries(candidatesData).forEach(([constituencyId, candidates]) => {
    candidates.forEach(candidate => {
      if (candidate.name.toLowerCase().includes(lowerQuery) || 
          candidate.party.toLowerCase().includes(lowerQuery)) {
        results.push({
          ...candidate,
          constituencyId,
          constituencyName: constituencyData.find(c => c.id === constituencyId)?.name || `Constituency ${constituencyId}`
        });
      }
    });
  });
  return results;
}

/**
 * Generate response using actual data from database (Final fallback)
 */
function generateMockResponse(message) {
  console.log('Generating local mock response as final safety net...');
  const lowerMessage = message.toLowerCase();
  
  const constituencyMatch = message.match(/(?:in|from|for|constituency)\s+(['"]?)([A-Za-z\s]+)\1/i);
  if (constituencyMatch) {
    const constituencyName = constituencyMatch[2].trim();
    const constituency = searchConstituency(constituencyName);
    if (constituency) {
      const candidates = getCandidatesByConstituency(constituency.id);
      if (candidates.length > 0) {
        return `📊 Constituency: **${constituency.name}**\n\n**Candidates:**\n${candidates.map(c => `• **${c.name}** - ${c.party}`).join('\n')}`;
      }
    }
  }
  
  const candidateKeywords = message.match(/(?:candidate|person|about)\s+(['"]?)([A-Za-z\s.]+)\1/i);
  if (candidateKeywords) {
    const candidateName = candidateKeywords[2].trim();
    const candidates = searchCandidates(candidateName);
    if (candidates.length > 0) {
      const c = candidates[0];
      return `👤 **${c.name}**\n• **Party:** ${c.party}\n• **Constituency:** ${c.constituencyName}`;
    }
  }
  
  return `ℹ️ **API Rate Limit Reached**\n\nI can still help you search our local election database:\n• "Show candidates in [constituency name]"\n• "Tell me about [candidate name]"`;
}

/**
 * Handle message using OpenRouter as a backup
 */
async function handleBackupMessage(sessionId, message, history) {
  console.log('Gemini limited. Using Backup API (OpenRouter)...');
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  try {
    let response;
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'google/gemini-2.0-flash-001',
        messages: messages,
        tools: backupTools,
        tool_choice: 'auto'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.BACKUP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      const choice = response.data.choices[0];
      messages.push(choice.message);

      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(toolCall.function.name, args);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(result)
          });
        }
      } else {
        const finalResponse = choice.message.content;
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: finalResponse });
        return finalResponse;
      }
    }
    return generateMockResponse(message);
  } catch (error) {
    console.error('Backup API error:', error.response?.data || error.message);
    return generateMockResponse(message);
  }
}

/**
 * Checks if error is a rate limit error
 */
function isRateLimitError(error) {
  return error.status === 429 || 
         error.code === 429 || 
         error.message?.includes('429') ||
         error.message?.includes('rate limit') ||
         error.message?.includes('quota');
}

/**
 * Handle a message from the user, run the agent loop.
 */
async function handleMessage(sessionId, message) {
  let session = chatSessions.get(sessionId);
  if (!session) {
    session = {
      geminiChat: model.startChat({ history: [] }),
      history: []
    };
    chatSessions.set(sessionId, session);
  }

  try {
    let result = await session.geminiChat.sendMessage(message);
    
    while (result.response.functionCalls() && result.response.functionCalls().length > 0) {
      const functionCalls = result.response.functionCalls();
      const functionResponses = [];

      for (const call of functionCalls) {
        const toolResult = await executeTool(call.name, call.args);
        functionResponses.push({
          functionResponse: { name: call.name, response: toolResult }
        });
      }
      result = await session.geminiChat.sendMessage(functionResponses);
    }

    const responseText = result.response.text();
    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'assistant', content: responseText });
    return responseText;

  } catch (error) {
    console.error('Gemini error:', error.message);
    if (isRateLimitError(error)) {
      return await handleBackupMessage(sessionId, message, session.history);
    }
    throw error;
  }
}

module.exports = {
  handleMessage
};
