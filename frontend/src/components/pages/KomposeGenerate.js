// frontend/src/components/pages/KomposeGenerate.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import Message from '@/components/ui/Message';
import TypingIndicator from '@/components/ui/TypingIndicator';

export default function KomposeGenerate() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef(null);
  
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
  
  // Task titles matching the backend tasks
  const taskTitles = [
    "Initial Classification",
    "Business Idea Generation",
    "Market Analysis",
    "Customer Segmentation",
    "Value Proposition",
    "Business Model",
    "Competitor Analysis",
    "SWOT Analysis",
    "Marketing Strategy",
    "Product Development Roadmap",
    "Financial Projections",
    "Team Structure",
    "Go-to-Market Strategy",
    "Risk Assessment",
    "Technology Requirements",
    "Scalability Plan",
    "Legal and Regulatory Considerations",
    "Implementation Action Plan"
  ];

  // Initialize user on component mount
  useEffect(() => {
    initializeUser();
    resetStore();
    
    // Set a welcome message
    setMessageHistory([
      {
        role: 'system',
        content: 'Welcome to One-Click Business Generation! Click "Generate Business Idea" below to create a complete business concept with all 18 steps.',
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
    
  }, []);
  
  // Scroll to bottom when results change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, isGenerating, currentStep]);

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
          content: 'Generate a complete business idea',
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
        blockId: currentBlockId
      });
      
      if (response.success && response.results) {
        // Process each result
        const formattedResults = response.results.map((result, index) => ({
          role: 'assistant',
          content: `Task ${index + 1}: ${result.task_title || taskTitles[index] || 'Task'}`,
          timestamp: new Date().toISOString(),
          fullResponse: result
        }));
        
        // Update the message history with all results
        setMessageHistory([
          ...messageHistory,
          {
            role: 'system',
            content: 'Business idea generated successfully! Review each section below:',
            timestamp: new Date().toISOString()
          },
          ...formattedResults
        ]);
        
        setResults(response.results);
        
        addLog({
          type: 'success',
          message: 'Generated Kompose business idea with 18 tasks'
        });
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
    } finally {
      setIsGenerating(false);
    }
  };
  
  // View a block
  const viewBlock = () => {
    if (currentBlockId) {
      router.push(`/blocks/${currentBlockId}`);
    }
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
          
          <div className="flex justify-center mb-6">
            <button
              onClick={generateIdea}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 ${
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
          
          {results.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Generated Business Idea</h3>
                <span className="text-sm text-gray-600">
                  {currentStep + 1} of {results.length} tasks completed
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / results.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </motion.div>
        
        <div className="max-w-4xl w-full">
          {/* Message history, including results */}
          {messageHistory.map((message, index) => (
            <Message 
              key={`${message.role}-${index}`}
              message={message}
              isLast={index === messageHistory.length - 1}
            />
          ))}
          
          {/* Typing indicator */}
          {isGenerating && <TypingIndicator />}
          
          {/* Invisible element for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </main>
  );
}