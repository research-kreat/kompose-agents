'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import Message from '@/components/ui/Message';
import ChatInput from '@/components/ui/ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { getKomposeTasks, formatTaskResult } from '@/lib/blockUtils';

export default function KomposeGenerateFlow() {
  const router = useRouter();
  const chatContainerRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [generationId, setGenerationId] = useState(null);
  const [error, setError] = useState(null);
  const [allCompleted, setAllCompleted] = useState(false);
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const [flowProgress, setFlowProgress] = useState(null);
  
  // Get all tasks
  const allTasks = getKomposeTasks();
  
  // Extract state from the store
  const userId = useChatStore(state => state.userId);
  const addLog = useChatStore(state => state.addLog);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);
  const messageHistory = useChatStore(state => state.messageHistory);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const setBlockInfo = useChatStore(state => state.setBlockInfo);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  const addMessage = useChatStore(state => state.addMessage);
  const setCurrentBlockId = useChatStore(state => state.setCurrentBlockId);
  
  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
    resetStore();
    
    // Set a welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Business Idea Generator! Enter your business concept prompt below to start generating a complete business analysis with all 18 tasks at once.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    return () => {
      // Cleanup if needed
    };
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messageHistory, isGenerating]);
  
  // Handle flow generation (all tasks at once)
  const startFlowGeneration = async (userPrompt) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setFlowProgress({ current: 0, total: 18, status: 'starting' });
    setInitialPromptSent(true);
    
    try {
      addLog({
        type: 'info',
        message: 'Starting Kompose business idea generation (one-click flow)'
      });
      
      addMessage({
        role: 'assistant',
        content: 'Starting comprehensive business analysis... This will generate all 18 tasks at once. Please wait while I analyze your business idea.',
        timestamp: new Date().toISOString()
      });
      
      // Call the flow API
      const response = await api.flowKomposeIdea({
        userId,
        userPrompt
      });
      
      if (response.success) {
        setGenerationId(response.block_id);
        setCurrentBlockId(response.block_id);
        
        // Set block info
        setBlockInfo({
          created: new Date().toISOString(),
          blockId: response.block_id
        });
        
        // Process all results
        const formattedResults = [];
        const completedTasks = response.task_results || [];
        
        // Add each task result as a message
        completedTasks.forEach((taskResult, index) => {
          if (taskResult.status === 'completed') {
            const formatted = formatTaskResult(taskResult);
            formattedResults.push(formatted);
            
            addMessage({
              role: 'assistant',
              content: `Task ${taskResult.task_number}: ${taskResult.task_title}`,
              timestamp: new Date().toISOString(),
              fullResponse: taskResult
            });
          } else if (taskResult.status === 'error') {
            addMessage({
              role: 'system',
              content: `Task ${taskResult.task_number} failed: ${taskResult.error}`,
              timestamp: new Date().toISOString(),
              error: true
            });
          }
        });
        
        setResults(formattedResults);
        setCurrentStep(response.tasks_completed);
        setAllCompleted(response.tasks_completed === response.tasks_total);
        
        // Add completion message
        addMessage({
          role: 'assistant',
          content: `Business analysis completed! Generated ${response.tasks_completed} out of ${response.tasks_total} tasks in ${Math.round(response.total_processing_time)}s. ${response.summary?.failed_tasks > 0 ? `Note: ${response.summary.failed_tasks} tasks encountered errors.` : ''}`,
          timestamp: new Date().toISOString()
        });
        
        setFlowProgress({
          current: response.tasks_completed,
          total: response.tasks_total,
          status: 'completed',
          processingTime: response.total_processing_time,
          summary: response.summary
        });
        
        addLog({
          type: 'success',
          message: `Flow generation completed: ${response.tasks_completed}/${response.tasks_total} tasks`
        });
        
      } else {
        throw new Error(response.error || 'Flow generation failed');
      }
      
    } catch (error) {
      console.error('Error in flow generation:', error);
      setError(error.message);
      
      addMessage({
        role: 'system',
        content: `Error during flow generation: ${error.message}. Please try again with a different business idea.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      setFlowProgress({
        current: 0,
        total: 18,
        status: 'error',
        error: error.message
      });
      
      addLog({
        type: 'error',
        message: `Flow generation error: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle sending message (initial prompt)
  const handleSendMessage = (content) => {
    // Add user message to chat
    addMessage({
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    });
    
    // Start flow generation
    startFlowGeneration(content);
  };
  
  // View the block
  const viewBlock = () => {
    if (generationId) {
      router.push(`/blocks/${generationId}`);
    }
  };
  
  // Restart the generation
  const restartGeneration = () => {
    setGenerationId(null);
    setResults([]);
    setCurrentStep(0);
    setError(null);
    setAllCompleted(false);
    setInitialPromptSent(false);
    setFlowProgress(null);
    
    // Reset message history to just the welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to Business Idea Generator! Enter your business concept prompt below to start generating a complete business analysis with all 18 tasks at once.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    addLog({
      type: 'info',
      message: 'Reset generation process'
    });
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header blockId={generationId} />
      
      <div className="flex-1 flex flex-col h-[calc(100vh-72px)]">
        {/* Progress bar at the top */}
        {initialPromptSent && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Analysis Progress 
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    One-Click Flow
                  </span>
                </h3>
                <span className="text-xs text-gray-600">
                  {currentStep} of {allTasks.length} tasks completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 bg-blue-500"
                  style={{ width: `${(currentStep / allTasks.length) * 100}%` }}
                ></div>
              </div>
              
              {/* Flow progress details */}
              {flowProgress && (
                <div className="mt-2 text-xs text-gray-600">
                  {flowProgress.status === 'starting' && (
                    <span className="flex items-center">
                      <i className="fas fa-cog fa-spin mr-2"></i>
                      Initializing flow generation...
                    </span>
                  )}
                  {flowProgress.status === 'completed' && flowProgress.summary && (
                    <span>
                      Completed in {Math.round(flowProgress.processingTime)}s • 
                      Success: {flowProgress.summary.successful_tasks} • 
                      Failed: {flowProgress.summary.failed_tasks}
                    </span>
                  )}
                  {flowProgress.status === 'error' && (
                    <span className="text-red-600">
                      Flow generation failed: {flowProgress.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Chat container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50"
        >
          {/* Message history, including results */}
          <AnimatePresence>
            {messageHistory.map((message, index) => (
              <Message 
                key={`${message.role}-${index}`}
                message={message}
                isLast={index === messageHistory.length - 1}
              />
            ))}
          </AnimatePresence>
          
          {/* Typing indicator */}
          {isGenerating && (
            <div className="flex flex-col items-center">
              <TypingIndicator />
              <div className="mt-2 text-xs text-gray-600 text-center">
                Generating all tasks in one go... This may take up to 2 minutes.
              </div>
            </div>
          )}
          
          {/* View results button */}
          {initialPromptSent && !isGenerating && allCompleted && (
            <div className="self-center my-4">
              <div className="flex gap-4">
                <button
                  onClick={viewBlock}
                  className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <i className="fas fa-check-circle"></i>
                  View Complete Analysis
                </button>
                
                <button
                  onClick={restartGeneration}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center gap-2 hover:bg-gray-100"
                >
                  <i className="fas fa-plus"></i>
                  New Business Idea
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Chat input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={initialPromptSent || isGenerating}
          placeholder={
            !initialPromptSent 
              ? "Enter your business idea to generate complete analysis..."
              : isGenerating 
                ? 'Generating...' 
                : 'Generation in progress...'
          }
        />
      </div>
    </main>
  );
}