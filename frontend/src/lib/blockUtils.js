// lib/blockUtils.js

/**
 * Get welcome message based on block type
 * @param {string} blockType - Type of block
 * @returns {string} - Welcome message
 */
export const getWelcomeMessage = (blockType) => {
  const messages = {
    kompose: "Welcome to Kompose. I can help guide you through creative business development and innovation. How can I assist you today?"
  };
  
  return messages[blockType] || "Welcome to Kompose. How can I assist you today?";
};

/**
 * Get information about a block type
 * @param {string} blockType - Type of block
 * @returns {Object} - Block type information
 */
export const getBlockTypeInfo = (blockType) => {
  const blockTypes = {
    kompose: {
      title: "Business Development",
      description: "Generate startup ideas and business plans",
      icon: "fa-lightbulb",
      color: "text-primary"
    },
    general: {
      title: "Kompose Assistant",
      description: "AI-powered creative framework",
      icon: "fa-comment",
      color: "text-primary"
    }
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
  return blockTypeRoutes[blockType] || '/';
};

/**
 * Get tasks for Kompose business generation
 * @returns {Array} - Array of task definitions
 */
export const getKomposeTasks = () => {
  return [
    {
      id: 1,
      title: "Initial Classification Matrix",
      description: "Categorize the business across multiple dimensions",
      icon: "fa-tag"
    },
    {
      id: 2,
      title: "Similar Business Analysis Matrix",
      description: "Compare with existing businesses in the market",
      icon: "fa-building"
    },
    {
      id: 3,
      title: "Market Opportunity Grid",
      description: "Assess market opportunities and growth potential",
      icon: "fa-chart-pie"
    },
    {
      id: 4,
      title: "Market Trends Heat Map",
      description: "Identify key market trends and their impact",
      icon: "fa-fire"
    },
    {
      id: 5,
      title: "Competition Analysis Matrix",
      description: "Analyze direct and indirect competitors",
      icon: "fa-chess"
    },
    {
      id: 6,
      title: "Opportunity Assessment Matrix",
      description: "Evaluate business opportunities and risks",
      icon: "fa-search"
    },
    {
      id: 7,
      title: "Key Success Factors Matrix",
      description: "Identify critical factors for success",
      icon: "fa-key"
    },
    {
      id: 8,
      title: "Growth Drivers Matrix",
      description: "Identify key drivers for business growth",
      icon: "fa-chart-line"
    },
    {
      id: 9,
      title: "Investment Landscape Matrix",
      description: "Analyze the investment environment",
      icon: "fa-money-bill-wave"
    },
    {
      id: 10,
      title: "Technology Stack Requirements",
      description: "Determine technical needs and solutions",
      icon: "fa-microchip"
    },
    {
      id: 11,
      title: "Regulatory Environment Matrix",
      description: "Assess regulatory considerations",
      icon: "fa-gavel"
    },
    {
      id: 12,
      title: "Supply Chain Analysis",
      description: "Analyze supply chain components and innovations",
      icon: "fa-truck"
    },
    {
      id: 13,
      title: "Customer Experience Mapping",
      description: "Map customer journey touchpoints",
      icon: "fa-users"
    },
    {
      id: 14,
      title: "Resource Requirements Matrix",
      description: "Identify personnel and operational resources needed",
      icon: "fa-clipboard-list"
    },
    {
      id: 15,
      title: "Risk Assessment Matrix",
      description: "Evaluate business risks and mitigation strategies",
      icon: "fa-exclamation-triangle"
    },
    {
      id: 16,
      title: "Unit Economics Baseline",
      description: "Analyze key financial metrics",
      icon: "fa-calculator"
    },
    {
      id: 17,
      title: "Market Size Segmentation",
      description: "Calculate TAM, SAM, and SOM",
      icon: "fa-chart-bar"
    },
    {
      id: 18,
      title: "Competitive Moat Analysis",
      description: "Analyze potential competitive advantages",
      icon: "fa-shield-alt"
    }
  ];
};

/**
 * Get task by ID
 * @param {number} taskId - Task ID
 * @returns {Object} - Task object
 */
export const getTaskById = (taskId) => {
  const tasks = getKomposeTasks();
  return tasks.find(task => task.id === taskId) || {
    id: taskId,
    title: `Task ${taskId}`,
    description: "Business development task",
    icon: "fa-file"
  };
};

/**
 * Format task result for display
 * @param {Object} result - Task result from API
 * @returns {Object} - Formatted result with UI helpers
 */
export const formatTaskResult = (result) => {
  if (!result) return null;
  
  const taskId = result.task_number || 0;
  const taskInfo = getTaskById(taskId);
  
  return {
    ...result,
    taskInfo,
    displayTitle: result.task_title || taskInfo.title,
    icon: taskInfo.icon
  };
};