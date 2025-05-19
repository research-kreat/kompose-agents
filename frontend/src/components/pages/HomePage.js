'use client';
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
            Your AI-powered creative framework for innovation and problem-solving
          </p>
        </motion.section>
        
        <motion.section
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4 pb-2 border-b border-gray-300">
            FEATURED APPLICATIONS
          </h3>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <AgentCard 
              icon="fa-lightbulb" 
              title="Kompose" 
              description="Generate startup ideas and business plans" 
              active={true} 
              link="/kompose" 
            />
            
            <AgentCard 
              icon="fa-comment" 
              title="One Click Innovation" 
              description="Generate All 18 Task in single click" 
              active={true} 
              link="/one-click-innovation" 
            />
          </motion.div>
        </motion.section>
      </div>
    </main>
  );
}