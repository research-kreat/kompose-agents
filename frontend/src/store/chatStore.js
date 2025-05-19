'use client';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api'; // Import the API client

export const useChatStore = create(
  persist(
    (set, get) => ({
      // User state
      userId: null,
      
      // Block state
      currentBlockId: null,
      blocks: [],
      messageHistory: [],
      isTyping: false,
      
      // Block info
      blockInfo: {
        created: null,
        messageCount: 0,
        blockId: null,   // This will hold the backend blockId when created
      },
      
      // Console logs
      logs: [
        {
          type: 'system',
          message: 'Ready to assist with Kompose',
          timestamp: new Date().toLocaleTimeString()
        }
      ],
      
      // Initialize user ID if not already set
      initializeUser: () => {
        const { userId } = get();
        if (!userId) {
          set({ userId: uuidv4() });
        }
        return get().userId;
      },
      
      // Actions
      setCurrentBlockId: (blockId) => set({ currentBlockId: blockId }),
      
      addMessage: (message) => {
        const { messageHistory } = get();
        // Create a new array instead of modifying the existing one
        const newHistory = [...messageHistory, message];
        
        set({ 
          messageHistory: newHistory,
          blockInfo: {
            ...get().blockInfo,
            messageCount: newHistory.length
          }
        });
      },
      
      setBlocks: (blocks) => set({ blocks }),
      
      addBlock: (block) => {
        const { blocks } = get();
        const existingIndex = blocks.findIndex(b => b.block_id === block.block_id);
        
        if (existingIndex >= 0) {
          // Update existing block
          const updatedBlocks = [...blocks];
          updatedBlocks[existingIndex] = block;
          set({ blocks: updatedBlocks });
        } else {
          // Add new block
          set({ blocks: [block, ...blocks] });
        }
      },
      
      removeBlock: (blockId) => {
        const { blocks, currentBlockId } = get();
        set({ 
          blocks: blocks.filter(b => b.block_id !== blockId),
          currentBlockId: blockId === currentBlockId ? null : currentBlockId,
          messageHistory: blockId === currentBlockId ? [] : get().messageHistory
        });
      },
      
      setMessageHistory: (messages) => {
        // Ensure each message has a timestamp
        const messagesWithTimestamps = messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp || new Date().toISOString()
        }));
        
        set({ 
          messageHistory: messagesWithTimestamps,
          blockInfo: {
            ...get().blockInfo,
            messageCount: messagesWithTimestamps.length
          } 
        });
      },
      
      clearMessages: () => set({ 
        messageHistory: [
          {
            role: 'system',
            content: 'Chat has been cleared. How can I help you today?',
            timestamp: new Date().toISOString()
          }
        ],
        blockInfo: {
          ...get().blockInfo,
          messageCount: 1
        }
      }),
      
      setBlockInfo: (info) => set({ 
        blockInfo: {
          ...get().blockInfo,
          ...info
        }
      }),
      
      setIsTyping: (status) => set({ isTyping: status }),
      
      addLog: (log) => {
        const { logs } = get();
        const newLog = {
          ...log,
          timestamp: new Date().toLocaleTimeString()
        };
        
        set({ logs: [...logs, newLog] });
      },
      
      resetStore: () => set({
        currentBlockId: null,
        messageHistory: [],
        isTyping: false,
        blockInfo: {
          created: null,
          messageCount: 0,
          blockId: null,
        },
        logs: [
          {
            type: 'system',
            message: 'Ready to assist with Kompose',
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }),
      
      // Create a new block
      createNewBlock: async (name = 'New Kompose Block') => {
        try {
          const { resetStore, addBlock, setCurrentBlockId, setBlockInfo, addLog, userId } = get();
          
          // Ensure user is initialized
          const currentUserId = get().initializeUser();
          
          // Reset store to clear previous chat
          resetStore();
          
          // First, create the block on the backend
          const response = await api.createBlock({
            userId: currentUserId,
            name: name
          });
          
          // Check if we got a block from the backend
          if (response.success && response.block && response.block.block_id) {
            const backendBlock = response.block;
            
            // Add the block to the list
            addBlock(backendBlock);
            
            // Set as current block
            setCurrentBlockId(backendBlock.block_id);
            
            // Update block info
            setBlockInfo({
              created: backendBlock.created_at,
              blockId: backendBlock.block_id,
              messageCount: 0
            });
            
            // Add welcome message to the block
            set({
              messageHistory: [
                {
                  role: 'system',
                  content: 'Welcome to your new Kompose chat!',
                  timestamp: new Date().toISOString()
                }
              ]
            });
            
            addLog({
              type: 'success',
              message: `Created new block: ${backendBlock.block_id.substring(0, 8)}`
            });
            
            return backendBlock.block_id;
          } else {
            throw new Error('Failed to create block on backend');
          }
        } catch (error) {
          // Fallback to creating just a local block if backend creation fails
          console.error('Error creating block on backend:', error);
          
          const { addLog } = get();
          addLog({
            type: 'error',
            message: `Failed to create block on backend: ${error.message}. Creating local block instead.`
          });
          
          // Generate a local block ID
          const blockId = uuidv4();
          const newBlock = {
            block_id: blockId,
            name: name,
            created_at: new Date().toISOString(),
            is_local: true // Mark this as a local block
          };
          
          const { addBlock, setCurrentBlockId, setBlockInfo, resetStore } = get();
          
          // Reset store to clear previous chat
          resetStore();
          
          // Add the new block to the list
          addBlock(newBlock);
          
          // Set as current block
          setCurrentBlockId(blockId);
          
          // Update block info
          setBlockInfo({
            created: newBlock.created_at,
            blockId: blockId,
            messageCount: 0,
            is_local: true
          });
          
          // Add message about local-only mode
          set({
            messageHistory: [
              {
                role: 'system',
                content: 'Created a local block. Note: This block is not synchronized with the server and will not persist across sessions.',
                timestamp: new Date().toISOString()
              }
            ]
          });
          
          return blockId;
        }
      }
    }),
    {
      name: 'Kompose-chat-storage',
      partialize: (state) => ({
        userId: state.userId,
        blocks: state.blocks,
        // Don't persist these volatile states
        // messageHistory, isTyping, blockInfo, logs
      }),
    }
  )
);

export default useChatStore;