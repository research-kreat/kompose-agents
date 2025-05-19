'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function Message({ message, isLast }) {
  const { role, content, timestamp, fullResponse } = message;
  const messageRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  
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
  
  // Get icon for task number
  const getTaskIcon = (taskNumber) => {
    const icons = {
      1: 'fa-tag', // Initial Classification
      2: 'fa-building', // Similar Business Analysis
      3: 'fa-chart-pie', // Market Opportunity
      4: 'fa-fire', // Market Trends
      5: 'fa-chess', // Competition Analysis
      6: 'fa-search', // Opportunity Assessment
      7: 'fa-key', // Key Success Factors
      8: 'fa-chart-line', // Growth Drivers
      9: 'fa-money-bill-wave', // Investment Landscape
      10: 'fa-microchip', // Technology Stack
      11: 'fa-gavel', // Regulatory Environment
      12: 'fa-truck', // Supply Chain
      13: 'fa-users', // Customer Experience
      14: 'fa-clipboard-list', // Resource Requirements
      15: 'fa-exclamation-triangle', // Risk Assessment
      16: 'fa-calculator', // Unit Economics
      17: 'fa-chart-bar', // Market Size Segmentation
      18: 'fa-shield-alt', // Competitive Moat
    };
    
    return icons[taskNumber] || 'fa-file-alt';
  };
  
  // Get task background color based on task number
  const getTaskBackgroundColor = (taskNumber) => {
    const colors = {
      1: 'bg-blue-50 border-blue-200',
      2: 'bg-indigo-50 border-indigo-200',
      3: 'bg-purple-50 border-purple-200',
      4: 'bg-pink-50 border-pink-200',
      5: 'bg-red-50 border-red-200',
      6: 'bg-orange-50 border-orange-200',
      7: 'bg-yellow-50 border-yellow-200',
      8: 'bg-green-50 border-green-200',
      9: 'bg-teal-50 border-teal-200',
      10: 'bg-cyan-50 border-cyan-200',
      11: 'bg-sky-50 border-sky-200',
      12: 'bg-emerald-50 border-emerald-200',
      13: 'bg-amber-50 border-amber-200',
      14: 'bg-lime-50 border-lime-200',
      15: 'bg-rose-50 border-rose-200',
      16: 'bg-fuchsia-50 border-fuchsia-200',
      17: 'bg-violet-50 border-violet-200',
      18: 'bg-slate-50 border-slate-200',
    };
    
    return colors[taskNumber] || 'bg-gray-50 border-gray-200';
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
  
  // Toggle details view
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

  // Render matrix table for Kompose task results
  const renderMatrixTable = (matrixData) => {
    if (!matrixData || typeof matrixData !== 'object') return null;
    
    // Get column headers (keys) and rows (values)
    const columnKeys = Object.keys(matrixData);
    if (columnKeys.length === 0) return null;
    
    // All arrays should be the same length, use the first one to determine rows
    const firstColumn = matrixData[columnKeys[0]];
    if (!Array.isArray(firstColumn) || firstColumn.length === 0) return null;
    
    const rowCount = firstColumn.length;
    
    return (
      <div className="overflow-x-auto max-w-full mt-4 mb-6 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {columnKeys.map((key, index) => (
                <th 
                  key={index} 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Generate rows based on the number of items in the first column */}
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columnKeys.map((columnKey, colIndex) => {
                  const cellData = matrixData[columnKey][rowIndex];
                  
                  return (
                    <td 
                      key={colIndex} 
                      className="px-4 py-3 whitespace-normal text-sm text-gray-600 border-r border-gray-200 last:border-r-0"
                      dangerouslySetInnerHTML={{ 
                        __html: typeof cellData === 'string' 
                          ? cellData.replace(/\n/g, '<br>') 
                          : String(cellData)
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
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
    
    const taskNumber = fullResponse.task_number;
    const taskBackgroundColor = getTaskBackgroundColor(taskNumber);
    const taskIcon = getTaskIcon(taskNumber);
    
    return (
      <div className={`mt-4 w-full bg-white rounded-lg shadow-sm border ${taskBackgroundColor.replace('bg-', 'border-')} overflow-hidden`}>
        <div className={`${taskBackgroundColor} p-3 font-medium flex items-center gap-2`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <i className={`fas ${taskIcon}`}></i>
          </div>
          <div>
            Task {taskNumber}: {fullResponse.task_title}
          </div>
        </div>
        
        <div className="p-4">
          {/* Render matrix table if it exists */}
          {fullResponse.matrix_data && Object.keys(fullResponse.matrix_data).length > 0 && (
            renderMatrixTable(fullResponse.matrix_data)
          )}
          
          {/* Fallback for tasks without matrix data */}
          {(!fullResponse.matrix_data || Object.keys(fullResponse.matrix_data).length === 0) && fullResponse.raw_result && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-600">
                {fullResponse.raw_result}
              </pre>
            </div>
          )}
          
          {/* Display error if present */}
          {fullResponse.error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 mt-2">
              <div className="flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-red-500"></i>
                <span className="font-medium text-red-700">Error:</span>
              </div>
              <p className="text-red-600 mt-1 pl-6">{fullResponse.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render response details if requested
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
      </div>
    </motion.div>
  );
}