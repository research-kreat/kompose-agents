'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Message({ message, isLast }) {
  const { role, content, timestamp, fullResponse, error } = message;
  const messageRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(true);
  
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
  
  // Get task colors based on task number
  const getTaskColors = (taskNumber) => {
    const colors = {
      1: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', header: 'bg-blue-100/50' },
      2: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-500', header: 'bg-indigo-100/50' },
      3: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', header: 'bg-purple-100/50' },
      4: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-500', header: 'bg-pink-100/50' },
      5: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', header: 'bg-red-100/50' },
      6: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', header: 'bg-orange-100/50' },
      7: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', header: 'bg-yellow-100/50' },
      8: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', header: 'bg-green-100/50' },
      9: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-500', header: 'bg-teal-100/50' },
      10: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-500', header: 'bg-cyan-100/50' },
      11: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-500', header: 'bg-sky-100/50' },
      12: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', header: 'bg-emerald-100/50' },
      13: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', header: 'bg-amber-100/50' },
      14: { bg: 'bg-lime-50', border: 'border-lime-200', icon: 'text-lime-600', header: 'bg-lime-100/50' },
      15: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500', header: 'bg-rose-100/50' },
      16: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', icon: 'text-fuchsia-500', header: 'bg-fuchsia-100/50' },
      17: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-500', header: 'bg-violet-100/50' },
      18: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', header: 'bg-slate-100/50' },
    };
    
    return colors[taskNumber] || { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-500', header: 'bg-gray-100/50' };
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
  
  // Toggle matrix table expansion
  const toggleMatrixExpansion = (e) => {
    e.stopPropagation();
    setIsMatrixExpanded(!isMatrixExpanded);
  };
  
  // Check if this is a Kompose task result message
  const isKomposeTaskResult = 
    (fullResponse && 
    fullResponse.task_number && 
    fullResponse.task_title) || 
    (fullResponse && 
    fullResponse.task_result && 
    fullResponse.task_result.task_number && 
    fullResponse.task_result.task_title);

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
      <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700">Matrix Data</h4>
          <button 
            onClick={toggleMatrixExpansion}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {isMatrixExpanded ? (
              <>
                <i className="fas fa-compress-alt"></i>
                <span>Collapse</span>
              </>
            ) : (
              <>
                <i className="fas fa-expand-alt"></i>
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
        
        <div className={`overflow-x-auto transition-all duration-300 ${isMatrixExpanded ? 'max-h-96' : 'max-h-32'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
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
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition-colors'}>
                  {columnKeys.map((columnKey, colIndex) => {
                    const cellData = matrixData[columnKey][rowIndex];
                    
                    // Handle cell data with bullet points marked with •
                    const formattedCellData = typeof cellData === 'string' 
                      ? cellData.replace(/•\s?([^•]+)/g, '<div class="py-1 flex items-start"><span class="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2 flex-shrink-0 mt-1.5"></span><span>$1</span></div>')
                      : String(cellData);
                    
                    return (
                      <td 
                        key={colIndex} 
                        className="px-4 py-3 whitespace-normal text-sm text-gray-600 border-r border-gray-200 last:border-r-0"
                        dangerouslySetInnerHTML={{ 
                          __html: formattedCellData.replace(/\n/g, '<br>')
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Special rendering for system messages
  if (role === 'system') {
    return (
      <motion.div 
        ref={messageRef}
        className="self-center max-w-[80%] my-6"
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ duration: 0.3 }}
      >
        <div className={`p-4 rounded-lg ${error ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-800 border border-gray-200'} text-center shadow-sm`}>
          {error && <i className="fas fa-exclamation-circle mr-2"></i>}
          <p>{content}</p>
        </div>
      </motion.div>
    );
  }

  // Render Kompose task result
  const renderKomposeTaskResult = () => {
    if (!isKomposeTaskResult) return null;
    
    // Handle both the old 'fullResponse' structure and the new structure with task_result
    const taskData = fullResponse.task_result || fullResponse;
    const taskNumber = taskData.task_number;
    const taskTitle = taskData.task_title;
    const taskColors = getTaskColors(taskNumber);
    const taskIcon = getTaskIcon(taskNumber);
    
    return (
      <motion.div 
        className={`mt-8 mb-12 w-full bg-white rounded-xl shadow-lg border ${taskColors.border} overflow-hidden transform hover:shadow-xl transition-all`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Task header with improved design */}
        <div className={`${taskColors.header} p-4 font-medium border-b ${taskColors.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${taskColors.bg} flex items-center justify-center shadow-md`}>
              <i className={`fas ${taskIcon} text-xl ${taskColors.icon}`}></i>
            </div>
            <div>
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                Task {taskNumber} of 18
              </div>
              <div className="text-gray-900 font-bold text-lg">
                {taskTitle}
              </div>
            </div>
          </div>
        </div>
        
        {/* Task content with improved styling */}
        <div className={`p-5 ${taskColors.bg} bg-opacity-30`}>
          {/* Render matrix table if it exists - check both structures */}
          {((taskData.matrix_data && Object.keys(taskData.matrix_data).length > 0) ||
            (taskData.task_result && taskData.task_result.matrix_data && Object.keys(taskData.task_result.matrix_data).length > 0)) && (
            renderMatrixTable(taskData.matrix_data || (taskData.task_result && taskData.task_result.matrix_data))
          )}
          
          {/* Fallback for tasks without matrix data */}
          {((!taskData.matrix_data || Object.keys(taskData.matrix_data).length === 0) &&
            (!taskData.task_result || !taskData.task_result.matrix_data || Object.keys(taskData.task_result.matrix_data).length === 0)) && 
            taskData.raw_result && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm text-gray-600">
                {taskData.raw_result}
              </pre>
            </div>
          )}
          
          {/* Display error if present */}
          {(taskData.error || (taskData.task_result && taskData.task_result.error)) && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-3 shadow-sm">
              <div className="flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-red-500"></i>
                <span className="font-medium text-red-700">Error:</span>
              </div>
              <p className="text-red-600 mt-2 pl-6">{taskData.error || (taskData.task_result && taskData.task_result.error)}</p>
            </div>
          )}
        </div>
        
        {/* Task footer with completion info */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
          <span className="flex items-center gap-1">
            <i className="fas fa-check-circle text-green-500"></i>
            Completed
          </span>
          <span>{formattedTime}</span>
        </div>
      </motion.div>
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
  
  // Check if it's a simple chat message (not a task result)
  const isSimpleChatMessage = role === 'user' || (role === 'assistant' && !isKomposeTaskResult);
  
  return (
    <motion.div 
      ref={messageRef}
      className={`flex gap-4 ${isSimpleChatMessage ? 'my-4' : 'my-1'} ${
        role === 'user' 
          ? 'self-end flex-row-reverse max-w-[85%]' 
          : isKomposeTaskResult 
            ? 'self-center w-full' 
            : 'self-start max-w-[85%]'
      }`}
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 0.3 }}
    >
      {/* Only show avatar for regular chat messages */}
      {isSimpleChatMessage && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          role === 'user' 
            ? 'bg-primary text-black' 
            : 'bg-secondary text-black'
        }`}>
          <i className={`fas ${role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
        </div>
      )}
      
      <div className={`flex flex-col items-start ${isKomposeTaskResult ? 'w-full' : 'max-w-full'}`}>
        {/* Classification message if it exists and should be displayed separately */}
        {fullResponse && fullResponse.classification_message && fullResponse.display_separately && (
          <div className="p-4 mb-3 rounded-2xl bg-blue-50 text-gray-800 rounded-bl-none shadow-sm border border-blue-100 w-full">
            <div 
              dangerouslySetInnerHTML={{ __html: formatMessageContent(fullResponse.classification_message) }} 
              className="message-content"
            />
          </div>
        )}
        
        {/* Regular chat message bubble */}
        {isSimpleChatMessage && (
          <div 
            className={`p-4 rounded-2xl shadow-sm ${
              role === 'user' 
                ? 'bg-primary text-black rounded-br-none' 
                : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
            } ${role === 'assistant' && fullResponse ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
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
            
            <div className="text-xs mt-2 text-right flex justify-between items-center">
              {role === 'assistant' && fullResponse && Object.keys(fullResponse).length > 0 && (
                <span className="cursor-pointer text-blue-500 hover:underline flex items-center gap-1">
                  <i className={`fas ${showDetails ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}></i>
                  {showDetails ? 'Hide details' : 'Show details'}
                </span>
              )}
              <span className={`${role === 'user' ? 'text-black/80' : 'text-gray-500'} font-mono`}>{formattedTime}</span>
            </div>
          </div>
        )}
        
        {/* Render Kompose task result */}
        {isKomposeTaskResult && renderKomposeTaskResult()}
      </div>
    </motion.div>
  );
}