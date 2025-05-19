// lib/blockUtils.js

/**
 * Get welcome message based on block type
 * @param {string} blockType - Type of block
 * @returns {string} - Welcome message
 */
export const getWelcomeMessage = (blockType) => {
    const messages = {
        kompose: "Welcome to the kompose. I can help guide you through creative problem-solving and innovation. How can I assist you today?"
    };
    
    return messages[blockType] || "Welcome to the Kompose. How can I assist you today?";
  };
  
  /**
   * Get information about a block type
   * @param {string} blockType - Type of block
   * @returns {Object} - Block type information
   */
  export const getBlockTypeInfo = (blockType) => {
    const blockTypes = {
   
    };
    
    return blockTypes[blockType] || blockTypes.general;
  };
  
  /**
   * Map block types to their routes
   */
  export const blockTypeRoutes = {
    kompose: '/kompose',
  };
  
  /**
   * Get the appropriate route for a block type
   * @param {string} blockType - Type of block
   * @returns {string} - Route for the block type
   */
  export const getRouteForBlockType = (blockType) => {
    return blockTypeRoutes[blockType];
  };