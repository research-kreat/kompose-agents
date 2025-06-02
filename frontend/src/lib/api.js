// lib/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * API client for interacting with the backend
 */
export const api = {
  /**
   * Fetch wrapper with error handling
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Parsed response data
   */
  async fetchWithErrorHandling(url, options = {}) {
    try {
      // Ensure the URL has the correct format
      const apiUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      
      // Log request for debugging
      console.log(`Fetching API: ${apiUrl}`, options);
      
      const response = await fetch(apiUrl, options);
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          // Try to parse as JSON
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not valid JSON, use as plain text
          errorData = { error: errorText };
        }
        
        const errorMessage = errorData.error || `API error: ${response.status} ${response.statusText}`;
        console.error(`API error response: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API error (${url}):`, error);
      throw error;
    }
  },

  /**
   * Generate a Kompose business idea with 18 tasks
   * @param {Object} params - Parameters
   * @param {string} params.userId - User ID
   * @param {string} [params.blockId] - Block ID to associate with
   * @param {string} [params.userPrompt] - User prompt to guide generation
   * @returns {Promise<Object>} - Response data with all tasks results
   */
  generateKomposeIdea: async ({ userId, blockId = null, userPrompt = null }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Prepare request body
    const requestBody = {
      user_id: userId
    };
    
    // Add block ID if provided (for next task generation)
    if (blockId) {
      requestBody.block_id = blockId;
    }
    
    // Add user prompt if provided
    if (userPrompt) {
      requestBody.user_prompt = userPrompt;
    }
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await api.fetchWithErrorHandling('/generate-kompose-marketanalysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // Enhance error with more context
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server might be overloaded or not responding.');
      }
      
      throw new Error(`Failed to generate Kompose idea: ${error.message}`);
    }
  },
  
  /**
   * Get blocks for a user
   * @param {Object} params - Parameters
   * @param {string} params.userId - User ID
   * @param {number} [params.limit] - Maximum number of blocks to return
   * @returns {Promise<Object>} - Response data with blocks
   */
  getBlocks: async ({ userId, limit = 10 }) => {
    return api.fetchWithErrorHandling(
      `/blocks?user_id=${encodeURIComponent(userId)}&limit=${limit}`
    );
  },
  
  /**
   * Get a specific block and its messages
   * @param {Object} params - Parameters
   * @param {string} params.blockId - Block ID
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} - Response data with block and messages
   */
  getBlock: async ({ blockId, userId }) => {
    if (!blockId || !userId) {
      throw new Error('Block ID and User ID are required');
    }
    
    return api.fetchWithErrorHandling(
      `/blocks/${encodeURIComponent(blockId)}?user_id=${encodeURIComponent(userId)}`
    );
  },
  
  /**
   * Delete a block
   * @param {Object} params - Parameters
   * @param {string} params.blockId - Block ID
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} - Response data
   */
  deleteBlock: async ({ blockId, userId }) => {
    if (!blockId || !userId) {
      throw new Error('Block ID and User ID are required');
    }
    
    return api.fetchWithErrorHandling(`/blocks/${encodeURIComponent(blockId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    });
  },
  
  /**
   * Clear messages for a block
   * @param {Object} params - Parameters
   * @param {string} params.blockId - Block ID
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} - Response data
   */
  clearBlock: async ({ blockId, userId }) => {
    if (!blockId || !userId) {
      throw new Error('Block ID and User ID are required');
    }
    
    return api.fetchWithErrorHandling(`/blocks/${encodeURIComponent(blockId)}/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: userId })
    });
  },
  
  /**
   * Create a new block
   * @param {Object} params - Parameters
   * @param {string} params.userId - User ID
   * @param {string} [params.name] - Block name
   * @returns {Promise<Object>} - Response data with new block
   */
  createBlock: async ({ userId, name = null }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const defaultName = name || 'New Kompose Block';
    
    return api.fetchWithErrorHandling('/blocks/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        name: defaultName
      })
    });
  },
  
  /**
   * Stream a Kompose business idea with real-time task results
   * @param {Object} params - Parameters
   * @param {string} params.userId - User ID
   * @param {string} [params.userPrompt] - User prompt to guide generation
   * @returns {ReadableStream} - Stream of task results
   */
  streamKomposeIdea: async ({ userId, userPrompt = null }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Prepare request body
    const requestBody = {
      user_id: userId
    };
    
    // Add user prompt if provided
    if (userPrompt) {
      requestBody.user_prompt = userPrompt;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/stream-kompose-marketanalysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      return response.body;
    } catch (error) {
      console.error(`API error (stream-kompose-marketanalysis):`, error);
      throw error;
    }
  },


/**
 * Generate a Kompose business idea with all 18 tasks in a single flow request
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {string} [params.userPrompt] - User prompt to guide generation
 * @returns {Promise<Object>} - Response data with all tasks results
 */
  flowKomposeIdea: async ({ userId, userPrompt = null }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Prepare request body
    const requestBody = {
      user_id: userId
    };
    
    // Add user prompt if provided
    if (userPrompt) {
      requestBody.user_prompt = userPrompt;
    }
    
    try {
      // Add timeout to prevent hanging requests (increased for flow processing)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for flow processing
      
      const response = await api.fetchWithErrorHandling('/flow-kompose-marketanalysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // Enhance error with more context
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The flow processing is taking too long.');
      }
      
      throw new Error(`Failed to generate Kompose idea in flow: ${error.message}`);
    }
  },
};

export default api;