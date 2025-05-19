from abc import ABC, abstractmethod
import logging
from crewai import Agent, Task, Crew, Process
from crewai import LLM
import json
import re

logger = logging.getLogger(__name__)

class BaseBlockHandler(ABC):
    """
    Base class for all block handlers with improved dynamic suggestions and conversation history usage
    Adapted for the Kompose application
    """
    
    def __init__(self, db, block_id, user_id):
        """Initialize the block handler
        
        Args:
            db: MongoDB database instance
            block_id: ID of the block
            user_id: ID of the user
        """
        self.db = db
        self.block_id = block_id
        self.user_id = user_id
        self.flow_collection = db.flow_status
        self.history_collection = db.conversation_history
        
        # Initialize LLM with moderate temperature for creativity
        self.llm = LLM(
            model="azure/gpt-4o-mini",
            temperature=0.7
        )
        
        # Standard flow steps in the correct order
        self.flow_steps = [
            "title",
            "abstract",
            "stakeholders",
            "tags",
            "assumptions",
            "constraints",
            "risks",
            "areas",
            "impact",
            "connections",
            "classifications",
            "think_models"
        ]
    
    def is_greeting(self, user_input):
        """Check if the user input is a greeting"""
        greeting_phrases = [
            "hi", "hello", "hey", "greetings", "good morning", "good afternoon", 
            "good evening", "howdy", "what's up", "how are you", "nice to meet you",
            "how's it going", "sup", "yo", "hiya", "hi there", "hello there",
            "hey there", "welcome", "good day", "how do you do", "how's everything"
        ]

        clean_input = user_input.lower().strip()
        
        # Check if input starts with greeting phrase or is a greeting
        for phrase in greeting_phrases:
            if clean_input.startswith(phrase) or clean_input == phrase:
                return True
                
        return False
    
    def handle_greeting(self, user_input, block_type):
        """Handle greeting with natural, concise responses using conversation history"""
        # Get conversation history to provide more contextual greetings
        history = self._get_conversation_history()
        previous_content = self._get_previous_content(history)
        
        try:
            # Create agent for generating natural greeting
            agent = Agent(
                role="Conversation Guide",
                goal="Engage users in a friendly conversation about business ideas",
                backstory="You help people develop startup ideas with concise, natural responses.",
                verbose=True,
                llm=self.llm
            )
            
            # Title and abstract context for richer greeting
            title_context = f"Title: {previous_content.get('title', 'Not yet defined')}" if 'title' in previous_content else ""
            abstract_context = f"Abstract: {previous_content.get('abstract', 'Not yet defined')}" if 'abstract' in previous_content else ""
            
            # Task for generating greeting response
            task = Task(
                description=f"""
                The user has sent a greeting: "{user_input}"
                
                Current Block Type: {block_type}
                {title_context}
                {abstract_context}
                
                Based on the previous conversation history and any existing content:
                
                Respond with a brief, friendly greeting that:
                1. Acknowledges their greeting naturally
                2. References the current title/topic if it exists
                3. Asks what they'd like to develop next or continue with
                
                Your response should be:
                - Very conversational and warm
                - Brief (1-2 sentences)
                - Avoid sounding like a chatbot with phrases like "How can I assist you"
                - Reference existing content if available to show continuity
                
                Example: "Hey there! Ready to continue developing your business idea? What would you like to explore next?"
                """,
                agent=agent,
                expected_output="A brief, friendly greeting"
            )
            
            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True
            )
            
            result = crew.kickoff()
            return {
                "identified_as": "greeting",
                "greeting_response": result.raw.strip()
            }
        except Exception as e:
            logger.error(f"Error generating greeting response: {str(e)}")
            
            # Create contextual fallback greeting using available content
            if 'title' in previous_content:
                default_greeting = f"Hey there! Ready to continue developing \"{previous_content['title']}\"? What would you like to explore next?"
            else:
                default_greeting = f"Hey there! What kind of business idea are you thinking about today?"
            
            return {
                "identified_as": "greeting",
                "greeting_response": default_greeting
            }
    
    @abstractmethod
    def initialize_block(self, user_input):
        """Initialize a new block based on user input
        
        Args:
            user_input: Initial user message
            
        Returns:
            dict: Response with suggestion for next step
        """
        pass
    
    def process_message(self, user_message, flow_status):
        """Process user message based on current flow status"""
        # Check if the message is a greeting
        if self.is_greeting(user_message):
            block_data = self.flow_collection.find_one({"block_id": self.block_id, "user_id": self.user_id})
            block_type = block_data.get("block_type", "kompose")
            return self.handle_greeting(user_message, block_type)
        
        # Get conversation history and previous content
        history = self._get_conversation_history()
        previous_content = self._get_previous_content(history)
        
        # Generate a contextual response
        try:
            # Create agent for generating response
            agent = Agent(
                role="Startup Idea Assistant",
                goal="Help users develop innovative business ideas",
                backstory="You guide entrepreneurs through the process of creating startup concepts and business plans.",
                verbose=True,
                llm=self.llm
            )
            
            # Create context from conversation history
            recent_messages = ""
            if history:
                # Get the last 3 messages
                last_messages = history[-min(3, len(history)):]
                for msg in last_messages:
                    role = msg.get("role", "")
                    content = msg.get("message", "")[:100]
                    if content:
                        recent_messages += f"{role.capitalize()}: {content}...\n"
            
            # Create task for generating response
            task = Task(
                description=f"""
                The user has sent this message: "{user_message}"
                
                Recent conversation:
                {recent_messages}
                
                Create a natural, conversational response that:
                1. Acknowledges what the user has said
                2. Provides helpful information related to startup ideas or business development
                3. Suggests the "Kompose Business Idea" feature for generating a complete business plan
                
                Your response should be:
                - Conversational and helpful
                - 2-3 sentences
                - Mention the one-click feature as an option if relevant
                """,
                agent=agent,
                expected_output="A conversational response"
            )
            
            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True
            )
            
            result = crew.kickoff()
            
            return {"suggestion": result.raw.strip()}
            
        except Exception as e:
            logger.error(f"Error generating contextual response: {str(e)}")
            
            # Fallback response
            return {"suggestion": "I understand. Would you like to generate a complete business idea using our 'Kompose Business Idea' feature? It will create a comprehensive business plan with market analysis and implementation steps."}
    
    def _get_conversation_history(self, limit=20):
        """Get the conversation history for context"""
        history = list(self.history_collection.find(
            {"block_id": self.block_id, "user_id": self.user_id}
        ).sort("created_at", -1).limit(limit))
        
        # Reverse to get chronological order
        return list(reversed(history))
    
    def _get_previous_content(self, history):
        """Get previously generated content from conversation history"""
        content = {}
        
        # Process history in reverse to get the most recent content first
        for item in reversed(history):
            if item.get("role") == "assistant" and "result" in item:
                result = item["result"]
                
                # Add each step's content to the dictionary, but only if not already present
                for step in self.flow_steps:
                    if step in result and result[step] and step not in content:
                        content[step] = result[step]
        
        return content