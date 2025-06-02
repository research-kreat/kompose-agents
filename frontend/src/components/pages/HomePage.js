'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/ui/Header';
import AgentCard from '@/components/ui/AgentCard';

export default function Home() {
  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <div className="flex-1 py-8 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <motion.section 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Kompose</h2>
          <p className="text-gray-600">
            Your AI-powered creative framework for innovation and business development
          </p>
        </motion.section>
        
        <motion.section
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4 pb-2 border-b border-gray-300">
            CHOOSE YOUR APPROACH
          </h3>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <AgentCard 
              icon="fa-list-ol" 
              title="Step-by-Step Business Generation" 
              description="{generate-kompose-idea} Generate a complete business idea one task at a time with more control" 
              active={true} 
              link="/kompose/chat" 
            />
            
            <AgentCard 
              icon="fa-lightbulb" 
              title="One-Click Business Generation" 
              description="{stream-kompose-idea} Generate a complete business idea with all 18 steps automatically" 
              active={true} 
              link="/kompose/generate" 
            />
          </motion.div>
        </motion.section>
        
        <motion.section
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4 pb-2 border-b border-gray-300">
            YOUR SAVED BLOCKS
          </h3>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <i className="fas fa-cube text-primary"></i>
                </div>
                <h4 className="font-medium text-gray-800">Saved Blocks</h4>
              </div>
              
              <a 
                href="/blocks" 
                className="text-primary hover:underline flex items-center gap-1"
              >
                View All
                <i className="fas fa-arrow-right text-sm"></i>
              </a>
            </div>
            
            <p className="text-gray-600">
              Access your previously created Kompose blocks, review business ideas, and continue your work.
            </p>
            
            <div className="mt-4">
              <a 
                href="/blocks" 
                className="inline-block px-4 py-2 border border-primary text-primary rounded hover:bg-primary/5 transition-colors"
              >
                Browse Blocks
              </a>
            </div>
          </div>
        </motion.section>
        
      </div>
    </main>
  );
}