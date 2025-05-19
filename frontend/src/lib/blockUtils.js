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
      title: "Initial Classification",
      description: "Categorize and define the business concept",
      icon: "fa-tag"
    },
    {
      id: 2,
      title: "Business Idea Generation",
      description: "Create the core business concept and value proposition",
      icon: "fa-lightbulb"
    },
    {
      id: 3,
      title: "Market Analysis",
      description: "Analyze the target market size and opportunities",
      icon: "fa-chart-pie"
    },
    {
      id: 4,
      title: "Customer Segmentation",
      description: "Define the ideal customer profiles and segments",
      icon: "fa-users"
    },
    {
      id: 5,
      title: "Value Proposition",
      description: "Articulate the unique value offered to customers",
      icon: "fa-award"
    },
    {
      id: 6,
      title: "Business Model",
      description: "Structure the revenue model and pricing strategy",
      icon: "fa-money-bill-wave"
    },
    {
      id: 7,
      title: "Competitor Analysis",
      description: "Evaluate existing competitors and market positioning",
      icon: "fa-chess"
    },
    {
      id: 8,
      title: "SWOT Analysis",
      description: "Assess strengths, weaknesses, opportunities and threats",
      icon: "fa-balance-scale"
    },
    {
      id: 9,
      title: "Marketing Strategy",
      description: "Develop go-to-market and customer acquisition approach",
      icon: "fa-bullhorn"
    },
    {
      id: 10,
      title: "Product Development Roadmap",
      description: "Plan the evolution of the product or service",
      icon: "fa-road"
    },
    {
      id: 11,
      title: "Financial Projections",
      description: "Forecast revenue, costs, and profitability",
      icon: "fa-chart-line"
    },
    {
      id: 12,
      title: "Team Structure",
      description: "Define organizational roles and responsibilities",
      icon: "fa-users-cog"
    },
    {
      id: 13,
      title: "Go-to-Market Strategy",
      description: "Plan the launch and market entry approach",
      icon: "fa-rocket"
    },
    {
      id: 14,
      title: "Risk Assessment",
      description: "Identify and mitigate potential challenges",
      icon: "fa-exclamation-triangle"
    },
    {
      id: 15,
      title: "Technology Requirements",
      description: "Determine technical infrastructure needed",
      icon: "fa-microchip"
    },
    {
      id: 16,
      title: "Scalability Plan",
      description: "Develop strategy for growth and expansion",
      icon: "fa-expand-arrows-alt"
    },
    {
      id: 17,
      title: "Legal and Regulatory Considerations",
      description: "Address compliance and legal requirements",
      icon: "fa-gavel"
    },
    {
      id: 18,
      title: "Implementation Action Plan",
      description: "Create detailed execution strategy and timeline",
      icon: "fa-tasks"
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