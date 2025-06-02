'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Message from '@/components/ui/Message';
import ChatInput from '@/components/ui/ChatInput';
import TypingIndicator from '@/components/ui/TypingIndicator';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import { getWelcomeMessage } from '@/lib/blockUtils';

export default function BlockChatInterface({ blockId }) {
  const router = useRouter();
  const chatContainerRef = useRef(null);
  const [blockNotFound, setBlockNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [creatingBlock, setCreatingBlock] = useState(false);
  
  // Extract all state from the store
  const userId = useChatStore(state => state.userId);
  const currentBlockId = useChatStore(state => state.currentBlockId);
  const messageHistory = useChatStore(state => state.messageHistory);
  const isTyping = useChatStore(state => state.isTyping);
  const blockInfo = useChatStore(state => state.blockInfo);
  const addMessage = useChatStore(state => state.addMessage);
  const addLog = useChatStore(state => state.addLog);
  const setIsTyping = useChatStore(state => state.setIsTyping);
  const clearMessages = useChatStore(state => state.clearMessages);
  const initializeUser = useChatStore(state => state.initializeUser);
  const setBlockInfo = useChatStore(state => state.setBlockInfo);
  const setMessageHistory = useChatStore(state => state.setMessageHistory);
  const setCurrentBlockId = useChatStore(state => state.setCurrentBlockId);
  const createNewBlock = useChatStore(state => state.createNewBlock);

  // Initialize user if not already set
  useEffect(() => {
    initializeUser();
    
    // Set current block ID
    if (blockId) {
      setCurrentBlockId(blockId);
    }
  }, [blockId]);

  // Function to fetch messages for the current block
  const fetchMessages = async () => {
    if (!blockId || !userId) {
      return;
    }
    
    // Set loading state
    setIsTyping(true);
    
    try {
      const data = await api.getBlock({ blockId, userId });
      
      // Check if we received valid messages
      if (data.messages && Array.isArray(data.messages)) {
        // If there are no messages, add a welcome message
        if (data.messages.length === 0) {
          setMessageHistory([
            {
              role: 'system',
              content: getWelcomeMessage(),
              timestamp: new Date().toISOString()
            }
          ]);
        } else {
          // Format messages to match expected structure
          const formattedMessages = data.messages.map(msg => ({
            role: msg.role,
            content: msg.message,
            timestamp: msg.created_at || new Date().toISOString(),
            // Include fullResponse if it exists in the result
            fullResponse: msg.result || null
          }));
          
          setMessageHistory(formattedMessages);
        }
        
        // Update block info
        setBlockInfo({
          ...blockInfo,
          messageCount: data.messages.length,
          blockId: data.block.block_id,
          created: data.block.created_at
        });
        
        addLog({
          type: 'info',
          message: 'Loaded conversation history'
        });
        
        // Clear block not found state if we successfully loaded messages
        setBlockNotFound(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      
      // Check if this is a "Block not found" error
      if (error.message === 'Block not found') {
        setBlockNotFound(true);
        
        // Add error message to the chat
        setMessageHistory([
          {
            role: 'system',
            content: 'This block was not found or may have been deleted. You can create a new block or navigate back to the blocks list.',
            timestamp: new Date().toISOString(),
            error: true
          }
        ]);
      } else {
        addLog({
          type: 'error',
          message: `Error loading messages: ${error.message}`
        });
        
        // Add a welcome message as fallback
        setMessageHistory([
          {
            role: 'system',
            content: getWelcomeMessage(),
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setIsTyping(false);
      setRetrying(false);
    }
  };

  // Load messages when component mounts
  useEffect(() => {
    fetchMessages();
  }, [blockId, userId]);

  // Handle sending a message
  const handleSendMessage = async (content) => {
    if (!blockId || !content.trim()) return;
  
    // Get userId from store
    const currentUserId = useChatStore.getState().userId;
    if (!currentUserId) {
      addLog({
        type: 'error',
        message: 'User ID not initialized'
      });
      return;
    }
  
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);
  
    // Set typing indicator
    setIsTyping(true);
  
    try {
      // Use the centralized API
      const data = await api.generateKomposeIdea({
        userPrompt: content,
        userId: currentUserId,
        blockId
      });
      
      // Extract the response content based on API response structure
      let responseContent = '';
      let fullResponseData = {};
      
      if (data.response && typeof data.response === 'object') {
        // Store the full response data
        fullResponseData = data.response;
        
        // For structured block responses
        if (data.response.suggestion) {
          responseContent = data.response.suggestion;
          
          // Check if there's a classification message to display first
          if (data.response.classification_message) {
            // Add classification message as a separate system message
            addMessage({
              role: 'assistant',
              content: data.response.classification_message,
              timestamp: new Date().toISOString()
            });
          }
        } else if (data.response.analysis) {
          // Initial block analysis
          responseContent = `${data.response.analysis}\n\n${data.response.suggestion}`;
        } else {
          // Fallback to serializing the response
          responseContent = JSON.stringify(data.response, null, 2);
        }
      } else if (data.response && typeof data.response === 'string') {
        // For simple string responses
        responseContent = data.response;
        fullResponseData = { suggestion: data.response };
      } else {
        // Fallback
        responseContent = "I've processed your request, but I'm not sure how to respond. Can you provide more details?";
        fullResponseData = { suggestion: responseContent };
      }
      
      // Add assistant's response to chat with full data
      addMessage({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        fullResponse: fullResponseData // Store the full response data
      });
      
      addLog({
        type: 'info',
        message: 'Received response from assistant'
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      addMessage({
        role: 'system',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        error: true
      });
      
      addLog({
        type: 'error',
        message: `Error sending message: ${error.message}`
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle clearing the chat
  const handleClearChat = async () => {
    if (!blockId) return;
    
    if (messageHistory.length > 1) {
      if (!confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
        return;
      }
    }

    // Clear messages locally
    clearMessages();
    
    // Send API request to clear on server if we have a backend block ID
    if (blockId) {
      try {
        await api.clearBlock({ blockId, userId });
        addLog({
          type: 'system',
          message: 'Chat cleared'
        });
      } catch (error) {
        addLog({
          type: 'error',
          message: `Error clearing chat on server: ${error.message}`
        });
      }
    } else {
      addLog({
        type: 'system',
        message: 'Chat cleared locally'
      });
    }
  };

  // Handle exporting the chat
  const handleExportChat = () => {
    if (!blockId || messageHistory.length === 0) {
      alert('No messages to export');
      return;
    }
    
    // Create export object
    const exportData = {
      block_id: blockId,
      messages: messageHistory,
      exported_at: new Date().toISOString(),
    };
    
    // Convert to JSON string
    const jsonStr = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kompose-chat-${blockId.substring(0, 8)}-${new Date().toLocaleString().replace(/[/\\:*?"<>|]/g, '-')}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    addLog({
      type: 'info',
      message: 'Chat exported to JSON'
    });
  };
  
  // Handle creating a new block with automatic navigation
  const handleCreateNewBlock = async () => {
    try {
      setCreatingBlock(true);
      
      // Create a new block - now an async operation
      const newBlockId = await createNewBlock();
      
      // Add a slight delay to ensure the block is created properly before navigating
      setTimeout(() => {
        // Navigate to the new block
        router.push(`/blocks/${newBlockId}`);
        
        // Reset creation state
        setCreatingBlock(false);
      }, 300);
    } catch (error) {
      console.error('Error creating new block:', error);
      
      addLog({
        type: 'error',
        message: `Error creating new block: ${error.message}`
      });
      
      setCreatingBlock(false);
    }
  };
  
  // Handle retrying to load messages
  const handleRetry = () => {
    setRetrying(true);
    fetchMessages();
  };
  
  // Handle navigating back to blocks list
  const handleBackToBlocks = () => {
    router.push('/blocks');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <i className="fas fa-lightbulb text-xl text-primary"></i>
          <h2 className="text-lg font-medium text-gray-800">Business Development</h2>
          {blockId && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
              {blockId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {!blockNotFound ? (
            <>
              <button
                onClick={handleExportChat}
                disabled={!blockId || messageHistory.length === 0}
                className={`p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors ${
                  (!blockId || messageHistory.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Export Conversation"
              >
                <i className="fas fa-download"></i>
              </button>
              
              <button
                onClick={handleClearChat}
                disabled={!blockId || messageHistory.length === 0}
                className={`p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors ${
                  (!blockId || messageHistory.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Clear Chat"
              >
                <i className="fas fa-refresh"></i>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCreateNewBlock}
                disabled={creatingBlock}
                className={`p-2 rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors ${
                  creatingBlock ? 'opacity-50 cursor-wait' : ''
                }`}
                title="Create New Block"
              >
                {creatingBlock ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fas fa-plus"></i>
                )}
              </button>
              
              <button
                onClick={handleBackToBlocks}
                className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                title="Back to Blocks"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              
              <button
                onClick={handleRetry}
                disabled={retrying}
                className={`p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors ${
                  retrying ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Retry Loading Block"
              >
                <i className={`fas ${retrying ? 'fa-spinner fa-spin' : 'fa-redo'}`}></i>
              </button>
            </>
          )}
        </div>
      </div>
      
      <div 
        ref={chatContainerRef}
        className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-gray-50"
      >
        {/* Message history */}
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
        {isTyping && <TypingIndicator />}
        
        {/* Block not found UI */}
        {blockNotFound && (
          <div className="flex flex-col items-center justify-center gap-4 my-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <i className="fas fa-exclamation-circle text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-800">Block Not Found</h3>
            <p className="text-gray-600 text-center max-w-md">
              This block may have been deleted or doesn't exist. You can create a new block or go back to your blocks list.
            </p>
            <div className="flex gap-4 mt-2">
              <button
                onClick={handleCreateNewBlock}
                disabled={creatingBlock}
                className={`px-4 py-2 bg-primary text-black rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2 ${
                  creatingBlock ? 'opacity-75 cursor-wait' : ''
                }`}
              >
                {creatingBlock ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    Create New Block
                  </>
                )}
              </button>
              <button
                onClick={handleBackToBlocks}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Blocks
              </button>
            </div>
          </div>
        )}
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={!blockId || isTyping || blockNotFound || creatingBlock}
      />
    </div>
  );
}