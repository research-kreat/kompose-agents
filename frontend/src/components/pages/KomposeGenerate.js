// frontend/src/components/pages/KomposeGenerate.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import Message from '@/components/ui/Message';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { getKomposeTasks, formatTaskResult } from '@/lib/blockUtils';

export default function KomposeGenerate() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [generationId, setGenerationId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Get all tasks
  const allTasks = getKomposeTasks();
  
  // Extract state from the store
  const userId = useChatStore(state => state.userId);
  const addLog = useChatStore(state => state.addLog);
  const initializeUser = useChatStore(state => state.initializeUser);
  const resetStore = useChatStore(state => state.resetStore);
  const createNewBlock = useChatStore(state => state.createNewBlock);
  const messageHistory = useChatStore(state => state.messageHistory);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const setBlockInfo = useChatStore(state => state.setBlockInfo);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  
  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
    resetStore();
    
    // Set a welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to One-Click Business Generation! Enter a business concept prompt below to generate a complete business idea with all 18 analytical tasks.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Create a new block for this session
    const blockId = createNewBlock('kompose', 'Kompose Business Generator');
    
    // Set block info
    setBlockInfo({
      type: 'kompose',
      created: new Date().toISOString(),
      blockId: blockId
    });
    
    // Cleanup on unmount
    return () => clearInterval(statusCheckInterval);
  }, []);
  
  // Ref for status check interval
  const statusCheckInterval = useRef(null);
  
  // Scroll to bottom when results change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, isGenerating, currentStep]);
  
  // Function to check generation status
  const checkGenerationStatus = async (blockId) => {
    try {
      const status = await api.getGenerationStatus({
        blockId,
        userId
      });
      
      // Update current step based on tasks completed
      if (status.tasks_completed > currentStep) {
        setCurrentStep(status.tasks_completed);
        
        // If generation is complete, fetch all messages
        if (status.status === 'complete') {
          clearInterval(statusCheckInterval.current);
          
          // Fetch the block to get all messages
          const blockData = await api.getBlock({
            blockId,
            userId
          });
          
          // Format the messages
          const formattedMessages = blockData.messages.map(msg => ({
            role: msg.role,
            content: msg.message,
            timestamp: msg.created_at || new Date().toISOString(),
            fullResponse: msg.result || null
          }));
          
          // Update message history
          setMessageHistory([
            ...messageHistory.filter(msg => msg.role === 'system' || msg.role === 'user'),
            ...formattedMessages.filter(msg => msg.role === 'assistant')
          ]);
          
          // Set results
          const taskResults = formattedMessages
            .filter(msg => msg.fullResponse && msg.fullResponse.task_number)
            .map(msg => formatTaskResult(msg.fullResponse));
          
          setResults(taskResults);
          setIsGenerating(false);
          
          addLog({
            type: 'success',
            message: 'Generated Kompose business idea with 18 tasks'
          });
        }
        
        // If generation failed, show error
        if (status.status === 'failed') {
          clearInterval(statusCheckInterval.current);
          
          setMessageHistory([
            ...messageHistory,
            {
              role: 'system',
              content: `Error generating business idea: ${status.error || 'Unknown error'}. Please try again.`,
              timestamp: new Date().toISOString(),
              error: true
            }
          ]);
          
          setIsGenerating(false);
          
          addLog({
            type: 'error',
            message: `Error generating business idea: ${status.error || 'Unknown error'}`
          });
        }
      }
    } catch (error) {
      console.error('Error checking generation status:', error);
      addLog({
        type: 'error',
        message: `Error checking generation status: ${error.message}`
      });
    }
  };

  // Generate a business idea
  const generateIdea = async () => {
    if (isGenerating) return;
    
    // Reset previous results
    setResults([]);
    setCurrentStep(0);
    setIsGenerating(true);
    
    try {
      // Add a message showing generation is starting
      setMessageHistory([
        ...messageHistory,
        {
          role: 'user',
          content: userPrompt || 'Generate a complete business idea',
          timestamp: new Date().toISOString()
        },
        {
          role: 'system',
          content: 'Starting business idea generation with 18 task analysis...',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'info',
        message: 'Starting Kompose business idea generation'
      });
      
      // Call the API to generate the idea
      const response = await api.generateKomposeIdea({
        userId,
        blockId: currentBlockId,
        userPrompt: userPrompt || undefined
      });
      
      // If successful, set up status checking
      if (response.block_id) {
        setGenerationId(response.block_id);
        
        // Set up interval to check generation status
        statusCheckInterval.current = setInterval(() => {
          checkGenerationStatus(response.block_id);
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to generate business idea');
      }
    } catch (error) {
      console.error('Error generating idea:', error);
      
      // Add error message
      setMessageHistory([
        ...messageHistory,
        {
          role: 'system',
          content: `Error generating business idea: ${error.message}. Please try again.`,
          timestamp: new Date().toISOString(),
          error: true
        }
      ]);
      
      addLog({
        type: 'error',
        message: `Error generating business idea: ${error.message}`
      });
      
      setIsGenerating(false);
    }
  };
  
  // View a block
  const viewBlock = () => {
    if (currentBlockId) {
      router.push(`/blocks/${currentBlockId}`);
    }
  };
  
  // Handle user prompt change
  const handlePromptChange = (e) => {
    setUserPrompt(e.target.value);
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <Header 
        blockId={currentBlockId}
        blockType="kompose"
        handleNewChat={() => router.push('/kompose/generate')}
      />
      
      <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
        <motion.div
          className="max-w-4xl w-full bg-white rounded-lg shadow-md p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <i className="fas fa-lightbulb text-primary text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">One-Click Business Generation</h2>
              <p className="text-gray-600">Generate a complete business idea with all 18 analytical tasks</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="userPrompt" className="block text-sm font-medium text-gray-700 mb-1">
              Business Concept Prompt
            </label>
            <textarea
              id="userPrompt"
              value={userPrompt}
              onChange={handlePromptChange}
              placeholder="e.g., A sustainable fashion marketplace for recycled clothing, or an AI-powered health monitoring app for seniors..."
              disabled={isGenerating}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 focus:ring-primary focus:border-primary"
              required={true}
            />
          </div>
          
          <div className="flex justify-center mb-6">
            <button
              onClick={generateIdea}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-lg text-black font-medium flex items-center gap-2 border border-black cursor-pointer ${
                isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-rocket"></i>
                  Generate Business Idea
                </>
              )}
            </button>
            
            {currentBlockId && results.length > 0 && (
              <button
                onClick={viewBlock}
                className="ml-4 px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/5 font-medium flex items-center gap-2"
              >
                <i className="fas fa-eye"></i>
                View Full Results
              </button>
            )}
          </div>
          
          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Generation Progress</h3>
                <span className="text-sm text-gray-600">
                  {currentStep} of {allTasks.length} tasks completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / allTasks.length) * 100}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allTasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className={`p-3 border rounded-lg flex items-center gap-2 ${
                      index < currentStep 
                        ? 'bg-green-50 border-green-200' 
                        : index === currentStep 
                          ? 'bg-blue-50 border-blue-200 animate-pulse' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStep 
                        ? 'bg-green-500 text-black' 
                        : index === currentStep 
                          ? 'bg-blue-500 text-black' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStep ? (
                        <i className="fas fa-check"></i>
                      ) : (
                        <i className={`fas ${task.icon}`}></i>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {task.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
        
        <div className="max-w-4xl w-full">
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
          {isGenerating && <TypingIndicator />}
          
          {/* Invisible element for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </main>
  );
}