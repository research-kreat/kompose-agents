'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import BlockSidebar from '@/components/ui/BlockSidebar';
import BlockChatInterface from '@/components/ui/BlockChatInterface';
import InfoPanel from '@/components/ui/InfoPanel';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';

export default function KomposePage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { 
    currentBlockId,
    setCurrentBlockId,
    setMessageHistory,
    setIsTyping,
    setBlockInfo,
    addLog,
    resetStore,
    createNewBlock,
    userId,
    initializeUser,
    addMessage
  } = useChatStore();
  
  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
    // Initialize user if needed
    initializeUser();
  }, [initializeUser]);

  // Initialize block based on URL or create new block
  useEffect(() => {
    if (!userId) return;
    
    if (!currentBlockId) {
      // Create new block
      createNewKomposeBlock();
    }
    
    // Cleanup on unmount
    return () => {
      resetStore();
    };
  }, [userId]);
  
  // Create a new Kompose block
  const createNewKomposeBlock = async () => {
    try {
      // Create block on the server
      const data = await api.createBlock({
        userId,
        name: 'New Kompose Chat'
      });
      
      // Set as current block
      setCurrentBlockId(data.block_id);
      
      // Update block info
      setBlockInfo({
        created: data.created_at,
        type: 'kompose',
        blockId: data.block_id,
        messageCount: 1 // Starting with welcome message
      });
      
      // Navigate to the dynamic route
      router.replace(`/kompose/${data.block_id}`);
      
      // Add welcome message
      setMessageHistory([
        {
          role: 'system',
          content: 'Welcome to Kompose. I can help you generate innovative startup ideas and actionable business plans. How can I help you today?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'system',
        message: `Created new Kompose block: ${data.block_id.substring(0, 8)}...`
      });
    } catch (error) {
      console.error('Error creating block:', error);
      
      // Fallback to local creation
      const blockId = createNewBlock('kompose', 'New Kompose Chat');
      
      // Navigate to the dynamic route
      router.replace(`/kompose/${blockId}`);
      
      // Add welcome message
      setMessageHistory([
        {
          role: 'system',
          content: 'Welcome to Kompose. I can help you generate innovative startup ideas and actionable business plans. How can I help you today?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      addLog({
        type: 'error',
        message: `Error creating block on server, using local fallback: ${error.message}`
      });
    }
  };
  
  // Handle Kompose Business Idea generation
  const handleGenerateBusinessIdea = async () => {
    if (!currentBlockId || !userId || isGenerating) return;
    
    try {
      setIsGenerating(true);
      setIsTyping(true);
      
      // Add user message
      addMessage({
        role: 'user',
        content: 'Generate a Kompose business idea',
        timestamp: new Date().toISOString()
      });
      
      // Add a message to indicate generation is starting
      addMessage({
        role: 'assistant',
        content: 'Starting to generate a comprehensive business idea with 18 steps. This may take a few minutes...',
        timestamp: new Date().toISOString()
      });
      
      // Call the API endpoint
      const response = await api.generateKomposeIdea({ userId });
      
      if (response.success && response.results) {
        // Add each result as a message
        for (const result of response.results) {
          addMessage({
            role: 'assistant',
            content: `Task ${result.task_number}: ${result.task_title}`,
            timestamp: new Date().toISOString(),
            fullResponse: result
          });
        }
        
        // Add completion message
        addMessage({
          role: 'assistant',
          content: 'Business idea generation complete! Review the details above for a comprehensive business plan.',
          timestamp: new Date().toISOString()
        });
        
        addLog({
          type: 'info',
          message: 'Kompose business idea generated successfully'
        });
      } else {
        // Add error message
        addMessage({
          role: 'assistant',
          content: 'Error generating business idea. Please try again.',
          timestamp: new Date().toISOString(),
          error: true
        });
        
        addLog({
          type: 'error',
          message: `Error generating business idea: ${response.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Error generating business idea:', error);
      
      // Add error message
      addMessage({
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error generating business idea: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
      setIsTyping(false);
    }
  };
  
  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <Header 
        blockType="kompose"
        blockId={currentBlockId} 
        handleNewChat={createNewKomposeBlock} 
      />
      
      <div className="flex-1 grid grid-cols-[250px_1fr_300px] h-[calc(100vh-72px)]">
        <BlockSidebar 
          onBlockSelect={(blockId) => router.push(`/kompose/${blockId}`)} 
          blockType="kompose" 
        />
        
        <div className="flex flex-col h-full">
          {/* Generate Business Idea Button */}
          <div className="bg-white p-4 border-b border-gray-200 flex justify-center">
            <button
              onClick={handleGenerateBusinessIdea}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-lg font-medium text-white ${
                isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary hover:bg-primary-dark transition-colors'
              } flex items-center gap-2`}
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating Business Idea...
                </>
              ) : (
                <>
                  <i className="fas fa-lightbulb"></i>
                  Kompose Business Idea
                </>
              )}
            </button>
          </div>
          
          <BlockChatInterface blockType="kompose" />
        </div>
        
        <InfoPanel />
      </div>
    </main>
  );
}