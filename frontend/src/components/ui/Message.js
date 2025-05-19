'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function Message({ message, isLast }) {
  const { role, content, timestamp, fullResponse } = message;
  const messageRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Card styles for different content types
  const cardStyles = {
    idea_name: "bg-blue-50 border-blue-200",
    tagline: "bg-indigo-50 border-indigo-200",
    summary: "bg-purple-50 border-purple-200",
    market_size: "bg-pink-50 border-pink-200",
    market_growth: "bg-red-50 border-red-200",
    primary_segment: "bg-orange-50 border-orange-200",
    core_value_proposition: "bg-yellow-50 border-yellow-200",
    revenue_model: "bg-green-50 border-green-200",
    direct_competitors: "bg-teal-50 border-teal-200",
    strengths: "bg-cyan-50 border-cyan-200",
    weaknesses: "bg-sky-50 border-sky-200", 
    opportunities: "bg-emerald-50 border-emerald-200",
    threats: "bg-amber-50 border-amber-200",
    brand_positioning: "bg-lime-50 border-lime-200",
    mvp_features: "bg-green-50 border-green-200",
    startup_costs: "bg-teal-50 border-teal-200",
    founding_team: "bg-cyan-50 border-cyan-200",
    launch_strategy: "bg-sky-50 border-sky-200", 
    market_risks: "bg-emerald-50 border-emerald-200",
    core_technologies: "bg-amber-50 border-amber-200",
    growth_drivers: "bg-lime-50 border-lime-200",
    business_structure: "bg-green-50 border-green-200",
    strategic_partners: "bg-teal-50 border-teal-200",
    months_1_3: "bg-cyan-50 border-cyan-200"
  };

  // Icons for different content types
  const cardIcons = {
    idea_name: "fa-lightbulb",
    tagline: "fa-quote-left",
    summary: "fa-file-alt",
    market_size: "fa-chart-pie",
    market_growth: "fa-chart-line",
    primary_segment: "fa-users",
    core_value_proposition: "fa-award",
    revenue_model: "fa-money-bill-wave",
    direct_competitors: "fa-chess",
    strengths: "fa-plus-circle",
    weaknesses: "fa-minus-circle", 
    opportunities: "fa-door-open",
    threats: "fa-exclamation-triangle",
    brand_positioning: "fa-bullseye",
    mvp_features: "fa-list-check",
    startup_costs: "fa-coins",
    founding_team: "fa-user-friends",
    launch_strategy: "fa-rocket", 
    market_risks: "fa-skull-crossbones",
    core_technologies: "fa-microchip",
    growth_drivers: "fa-seedling",
    business_structure: "fa-building",
    strategic_partners: "fa-handshake",
    months_1_3: "fa-calendar"
  };
  
  // Nice human-readable labels for each key
  const keyLabels = {
    title: "Title",
    abstract: "Abstract",
    stakeholders: "Stakeholders",
    tags: "Tags & Categories",
    assumptions: "Assumptions",
    constraints: "Constraints",
    risks: "Risks",
    areas: "Related Areas",
    impact: "Impact",
    connections: "Connections",
    classifications: "Classifications",
    think_models: "Thinking Models",
    suggestion: "Suggestion",
    // Kompose business idea task labels
    idea_name: "Business Idea Name",
    tagline: "Tagline",
    summary: "Summary",
    market_size: "Market Size",
    market_growth: "Market Growth",
    primary_segment: "Primary Customer Segment",
    core_value_proposition: "Value Proposition",
    revenue_model: "Revenue Model",
    direct_competitors: "Direct Competitors",
    strengths: "Strengths",
    weaknesses: "Weaknesses", 
    opportunities: "Opportunities",
    threats: "Threats",
    brand_positioning: "Brand Positioning",
    mvp_features: "MVP Features",
    startup_costs: "Startup Costs",
    founding_team: "Founding Team",
    launch_strategy: "Launch Strategy", 
    market_risks: "Market Risks",
    core_technologies: "Core Technologies",
    growth_drivers: "Growth Drivers",
    business_structure: "Business Structure",
    strategic_partners: "Strategic Partners",
    months_1_3: "First 3 Months Plan"
  };
  
  // Scroll into view if it's the last message
  useEffect(() => {
    if (isLast && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLast]);
  
  // Format message content with links, code blocks, etc.
  const formatMessageContent = (content) => {
    if (!content) return '';
    
    // Handle line breaks
    let formattedContent = content.replace(/\n/g, '<br>');
    
    // Convert URLs to links
    formattedContent = formattedContent.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'
    );
    
    // Convert markdown-style code blocks to HTML
    formattedContent = formattedContent.replace(
      /```([^`]+)```/g,
      '<pre class="bg-gray-100 p-3 rounded my-2 overflow-auto"><code>$1</code></pre>'
    );
    
    // Convert markdown-style inline code to HTML
    formattedContent = formattedContent.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 rounded">$1</code>'
    );
    
    return formattedContent;
  };
  
  // Format list items for display
  const formatListItems = (items) => {
    if (!Array.isArray(items)) return formatMessageContent(items);
    
    return (
      <ul className="list-disc ml-5 mt-2 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-gray-700">
            {typeof item === 'object' 
              ? JSON.stringify(item) 
              : item}
          </li>
        ))}
      </ul>
    );
  };
  
  // Format timestamp
  const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';
  
  // Animation variants
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Toggle details view for assistants' responses when fullResponse exists
  const toggleDetails = () => {
    if (role === 'assistant' && fullResponse) {
      setShowDetails(!showDetails);
    }
  };
  
  // Check if this is a Kompose task result message
  const isKomposeTaskResult = 
    fullResponse && 
    fullResponse.task_number && 
    fullResponse.task_title;
  
  // Special rendering for system messages
  if (role === 'system') {
    return (
      <motion.div 
        ref={messageRef}
        className="self-center max-w-[80%]"
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 rounded-md bg-gray-200 text-gray-800 text-center">
          <p>{content}</p>
        </div>
      </motion.div>
    );
  }
  
  // Render Kompose task result
  const renderKomposeTaskResult = () => {
    if (!isKomposeTaskResult) return null;
    
    return (
      <div className="mt-4 w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-primary text-black p-3 font-medium flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <i className="fas fa-tasks"></i>
          </div>
          <div>
            Task {fullResponse.task_number}: {fullResponse.task_title}
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Render each key in the task result */}
          {Object.keys(fullResponse).filter(key => 
            key !== 'task_number' && 
            key !== 'task_title' && 
            key !== 'error' &&
            key !== 'raw_result'
          ).map(key => (
            <div 
              key={key}
              className={`p-3 rounded-lg border ${cardStyles[key] || 'bg-gray-50 border-gray-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cardStyles[key]?.replace('bg-', 'bg-').replace('border-', 'text-') || 'bg-gray-200 text-gray-600'}`}>
                  <i className={`fas ${cardIcons[key] || 'fa-file-alt'} text-sm`}></i>
                </div>
                <h4 className="font-medium text-gray-800">{keyLabels[key] || key}</h4>
              </div>
              
              <div className="pl-8">
                {typeof fullResponse[key] === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse[key]) }} />
                ) : Array.isArray(fullResponse[key]) ? (
                  formatListItems(fullResponse[key])
                ) : typeof fullResponse[key] === 'object' ? (
                  <div className="space-y-3">
                    {Object.keys(fullResponse[key]).map(subKey => (
                      <div key={subKey} className="mb-2">
                        <div className="font-medium text-sm text-gray-700 mb-1">{subKey}:</div>
                        {typeof fullResponse[key][subKey] === 'string' ? (
                          <div dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse[key][subKey]) }} />
                        ) : Array.isArray(fullResponse[key][subKey]) ? (
                          formatListItems(fullResponse[key][subKey])
                        ) : (
                          <div className="pl-4 text-gray-700">{JSON.stringify(fullResponse[key][subKey])}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: formatMessageContent(String(fullResponse[key])) }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render response cards for regular assistant messages
  const renderResponseCards = () => {
    if (role !== 'assistant' || !fullResponse || typeof fullResponse !== 'object' || isKomposeTaskResult) {
      return null;
    }
    
    // Get the keys we want to display as cards (excluding some meta fields)
    const cardKeys = Object.keys(fullResponse).filter(key => 
      key !== 'updated_flow_status' && 
      key !== 'classification_message' &&
      key !== 'identified_as' &&
      key !== 'display_separately' &&
      key !== 'current_step' &&
      key !== 'current_step_completed' &&
      key in cardStyles
    );
    
    if (cardKeys.length === 0) return null;
    
    return (
      <div className="mt-4 space-y-3 w-full">
        {cardKeys.map(key => (
          <div 
            key={key}
            className={`p-4 rounded-lg border ${cardStyles[key] || 'bg-gray-50 border-gray-200'} shadow-sm`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cardStyles[key].replace('bg-', 'bg-').replace('border-', 'text-')}`}>
                <i className={`fas ${cardIcons[key] || 'fa-file-alt'}`}></i>
              </div>
              <h4 className="font-medium text-gray-800">{keyLabels[key] || key}</h4>
            </div>
            
            <div className="pl-10">
              {key === 'title' || key === 'abstract' || key === 'suggestion' ? (
                <div dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse[key]) }} />
              ) : Array.isArray(fullResponse[key]) ? (
                formatListItems(fullResponse[key])
              ) : typeof fullResponse[key] === 'object' ? (
                <pre className="text-sm bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(fullResponse[key], null, 2)}
                </pre>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse[key]) }} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render detailed response data if requested
  const renderResponseDetails = () => {
    if (!fullResponse || typeof fullResponse !== 'object') return null;
  
    return (
      <div className="mt-3 border-t border-gray-200 pt-2 text-xs w-full max-w-full">
        <div className="font-medium mb-1 text-gray-700">Full Response Data:</div>
        <pre className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60 text-left whitespace-pre-wrap break-words text-[11px]">
          {JSON.stringify(fullResponse, null, 2)}
        </pre>
      </div>
    );
  };
  
  return (
    <motion.div 
      ref={messageRef}
      className={`flex gap-4 max-w-[85%] ${
        role === 'user' 
          ? 'self-end flex-row-reverse' 
          : 'self-start'
      }`}
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 0.3 }}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        role === 'user' 
          ? 'bg-primary text-black' 
          : 'bg-secondary text-black'
      }`}>
        <i className={`fas ${role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
      </div>
      
      <div className="flex flex-col items-start max-w-full">
        {/* Classification message if it exists and should be displayed separately */}
        {fullResponse && fullResponse.classification_message && fullResponse.display_separately && (
          <div className="p-4 mb-2 rounded-2xl bg-blue-50 text-gray-800 rounded-bl-none">
            <div 
              dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse.classification_message) }} 
              className="message-content"
            />
          </div>
        )}
        
        <div 
          className={`p-4 rounded-2xl shadow-sm ${
            role === 'user' 
              ? 'bg-primary text-black rounded-br-none' 
              : 'bg-white text-gray-800 rounded-bl-none'
          }`}
          onClick={role === 'assistant' && fullResponse ? toggleDetails : undefined}
        >
          {/* Message content */}
          <div className="message-content">
            {/* For assistant messages with fullResponse, show suggestion in the bubble */}
            {role === 'assistant' && fullResponse?.suggestion && (
              <div dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse.suggestion) }} />
            )}
            
            {/* For assistant messages without suggestion, show the regular content */}
            {role === 'assistant' && !fullResponse?.suggestion && (
              <div dangerouslySetInnerHTML={{ __html: formatMessageContent(content) }} />
            )}
            
            {/* Always show user content */}
            {role === 'user' && (
              <div dangerouslySetInnerHTML={{ __html: formatMessageContent(content) }} />
            )}
          </div>
          
          {/* Show response details if toggled and available */}
          {showDetails && renderResponseDetails()}
          
          <div className="text-xs mt-1 text-right flex justify-between items-center">
            {role === 'assistant' && fullResponse && Object.keys(fullResponse).length > 0 && (
              <span className="cursor-pointer text-blue-500 hover:underline">
                {showDetails ? 'Hide details' : 'Show details'}
              </span>
            )}
            <span className={role === 'user' ? 'text-black/80' : 'text-gray-500'}>{formattedTime}</span>
          </div>
        </div>
        
        {/* Render Kompose task result */}
        {isKomposeTaskResult && renderKomposeTaskResult()}
        
        {/* Render regular cards for other responses */}
        {!isKomposeTaskResult && renderResponseCards()}
      </div>
    </motion.div>
  );
}