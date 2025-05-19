from utils_agents.base_block_handler import BaseBlockHandler
import logging
from crewai import Agent, Task, Crew, Process
import json
import re
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class KomposeBlockHandler(BaseBlockHandler):
    """
    Handler for the Kompose block type - generates startup ideas and business approaches
    """
    
    def initialize_block(self, user_input):
        """
        Initialize a new Kompose block based on user input
        
        Args:
            user_input: Initial user message
            
        Returns:
            dict: Response with suggestion for next step
        """
        # Check if the input is a greeting
        if self.is_greeting(user_input):
            return self.handle_greeting(user_input, "kompose")
        
        # Create specialized agent for kompose initialization
        kompose_agent = Agent(
            role="Startup Idea Generator",
            goal="Generate innovative startup ideas and business approaches",
            backstory="""You help entrepreneurs develop startup ideas and create structured approaches 
            for building new businesses through natural dialogue.""",
            verbose=True,
            llm=self.llm
        )
        
        # Create task for initial analysis
        analysis_task = Task(
            description=f"""
            The user has shared this initial input:
            
            "{user_input}"
            
            Your goal is to provide a two-part response:
            
            PART 1: A brief, conversational message that acknowledges their interest in startup ideas
            or business approaches. Keep it friendly and enthusiastic.
            
            PART 2: A suggestion asking if they would like to generate a business idea.
            
            FORMAT:
            {{
                "classification_message": "Your message from PART 1",
                "suggestion": "Your follow-up message from PART 2"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with classification message and suggestion"
        )
        
        # Execute the analysis
        crew = Crew(
            agents=[kompose_agent],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=True
        )
        
        try:
            result = crew.kickoff()
            
            # Try to parse JSON from the result
            json_match = re.search(r'({.*})', result.raw, re.DOTALL)
            if json_match:
                try:
                    result_data = json.loads(json_match.group(1))
                    # Ensure required fields are present
                    if "classification_message" not in result_data:
                        result_data["classification_message"] = "Thanks for your interest in developing a startup idea! I can help you generate innovative business concepts and structured approaches."
                    if "suggestion" not in result_data:
                        result_data["suggestion"] = "Would you like me to generate a business idea for you?"
                    
                    return result_data
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON response: {result.raw}")
            
            # Fallback if JSON parsing fails
            return {
                "classification_message": "Thanks for your interest in developing a startup idea! I can help you generate innovative business concepts and structured approaches.",
                "suggestion": "Would you like me to generate a business idea for you?"
            }
        except Exception as e:
            logger.error(f"Error initializing kompose block: {str(e)}")
            
            # Fallback response
            return {
                "classification_message": "Thanks for your interest in developing a startup idea! I can help you generate innovative business concepts and structured approaches.",
                "suggestion": "Would you like me to generate a business idea for you?"
            }
    
    def process_message(self, user_message, flow_status):
        """
        Process a user message for a kompose block
        
        Args:
            user_message: Message from the user
            flow_status: Current flow status
            
        Returns:
            dict: Response with results and next step suggestion
        """
        # Check if this is a greeting
        if self.is_greeting(user_message):
            return self.handle_greeting(user_message, "kompose")
        
        # Get conversation history
        history = self._get_conversation_history()
        
        # Default response for normal conversation
        return {
            "suggestion": "Would you like to generate a business idea using our 'Kompose Business Idea' feature? It will create a comprehensive business plan with market analysis and implementation steps."
        }
    
    def generate_kompose_idea(self, user_prompt=None):
        """
        Generate a complete business idea with all 18 tasks
        
        Returns:
            list: Results from all tasks
        """
        initial_user_input = ""
        if user_prompt:
            initial_user_input = user_prompt
        else:
            # Get business idea from database based on block_id
            conversation_history = self._get_conversation_history()
            for message in conversation_history:
                if message.get("role") == "user":
                    initial_user_input = message.get("content")
                    break

        # Create the agent for all tasks
        kompose_agent = Agent(
            role="Business Analysis Expert",
            goal="Generate comprehensive business analysis using structured matrices",
            backstory="""You are an expert in business analysis, market research, 
            and startup strategy. You help entrepreneurs analyze business ideas 
            using data-driven frameworks and structured analytical matrices.""",
            verbose=True,
            llm=self.llm
        )
        
        # Define all 18 tasks
        tasks = []
        
        # Task 1: Initial Classification Matrix
        tasks.append(Task(
            description=f"""
            Create an Initial Classification Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Category": ["Industry", "Target Market", "Core Value", "Geography"],
                    "Primary": ["Primary value for Industry", "Primary value for Target Market", "Primary value for Core Value", "Primary value for Geography"],
                    "Secondary": ["Secondary value for Industry", "Secondary value for Target Market", "Secondary value for Core Value", "Secondary value for Geography"],
                    "Tertiary": ["Tertiary value for Industry", "Tertiary value for Target Market", "Tertiary value for Core Value", "Tertiary value for Geography"]
                }}
            }}
            
            Be specific and realistic with your classifications based on the business idea. For example, if it's like "Zepto for Fashion", the Industry might be "Retail" (Primary), "Fashion" (Secondary), "Quick Commerce" (Tertiary).
            """,
            agent=kompose_agent,
            expected_output="JSON with Initial Classification Matrix"
        ))
        
        # Task 2: Similar Business Analysis Matrix
        tasks.append(Task(
            description=f"""
            Create a Similar Business Analysis Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Company": ["Company 1", "Company 2", "Company 3"],
                    "Business Model": ["Business Model 1", "Business Model 2", "Business Model 3"],
                    "Key Metrics": ["Metrics 1", "Metrics 2", "Metrics 3"],
                    "Success Factors": ["Factors 1", "Factors 2", "Factors 3"],
                    "Market Position": ["Position 1", "Position 2", "Position 3"]
                }}
            }}
            
            Provide real-world examples of similar businesses with accurate metrics (revenue, growth, market share), success factors (bullet points with • symbol), and market positions.
            """,
            agent=kompose_agent,
            expected_output="JSON with Similar Business Analysis Matrix"
        ))
        
        # Task 3: Market Opportunity Grid
        tasks.append(Task(
            description=f"""
            Create a Market Opportunity Grid for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Dimension": ["Dimension 1", "Dimension 2", "Dimension 3"],
                    "Current State": ["State 1", "State 2", "State 3"],
                    "Growth Potential": ["Potential 1", "Potential 2", "Potential 3"],
                    "Competition Level": ["Level 1", "Level 2", "Level 3"],
                    "Opportunity Score": ["Score 1", "Score 2", "Score 3"]
                }}
            }}
            
            For Growth Potential, use text indicators like "High", "Medium", "Low". For Competition Level, use "High", "Medium", "Low". For Opportunity Score, use a scale of 1-10.
            """,
            agent=kompose_agent,
            expected_output="JSON with Market Opportunity Grid"
        ))
        
        # Task 4: Market Trends Heat Map
        tasks.append(Task(
            description=f"""
            Create a Market Trends Heat Map for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Trend Category": ["Category 1", "Category 1", "Category 1", "Category 2", "Category 2", "Category 2", "Category 3", "Category 3", "Category 3"],
                    "Trend": ["Trend 1", "Trend 2", "Trend 3", "Trend 4", "Trend 5", "Trend 6", "Trend 7", "Trend 8", "Trend 9"],
                    "Impact": ["Impact 1", "Impact 2", "Impact 3", "Impact 4", "Impact 5", "Impact 6", "Impact 7", "Impact 8", "Impact 9"],
                    "Adoption Rate": ["Rate 1", "Rate 2", "Rate 3", "Rate 4", "Rate 5", "Rate 6", "Rate 7", "Rate 8", "Rate 9"],
                    "Relevance": ["Relevance 1", "Relevance 2", "Relevance 3", "Relevance 4", "Relevance 5", "Relevance 6", "Relevance 7", "Relevance 8", "Relevance 9"]
                }}
            }}
            
            Group trends by categories like "Consumer Behavior", "Technology", "Delivery", etc. For Impact, use text indicators like "High", "Medium", "Low". For Adoption Rate, use percentages. For Relevance, use terms like "Critical", "Important", "Standard", "Differentiator", "Innovative".
            """,
            agent=kompose_agent,
            expected_output="JSON with Market Trends Heat Map"
        ))
        
        # Task 5: Competition Analysis Matrix
        tasks.append(Task(
            description=f"""
            Create a Competition Analysis Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Parameter": ["Market Players", "Entry Barriers", "Market Share", "Growth Rate", "Differentiation"],
                    "Direct Competition": ["Few (3-5)", "Medium", "Fragmented", "High (30%+)", "Low"],
                    "Indirect Competition": ["Many (20+)", "High", "Consolidated", "Moderate (15%)", "High"],
                    "Your Position": ["New Entrant", "-", "-", "-", "High"]
                }}
            }}
            
            Analyze the competitive landscape realistically, showing direct competition (similar business models), indirect competition (alternative solutions), and your potential market position.
            """,
            agent=kompose_agent,
            expected_output="JSON with Competition Analysis Matrix"
        ))
        
        # Task 6: Opportunity Assessment Matrix
        tasks.append(Task(
            description=f"""
            Create an Opportunity Assessment Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Factor": ["Market Gap", "Technology", "Geography", "Customer Need", "Competition"],
                    "Status": ["Underserved", "Emerging", "Limited Coverage", "Strong", "Low"],
                    "Opportunity": ["High", "High", "High", "High", "High"],
                    "Risk Level": ["Medium", "Medium", "Low", "Low", "Medium"]
                }}
            }}
            
            Assess key opportunity factors with relevant status descriptions, opportunity levels (High, Medium, Low), and risk levels (High, Medium, Low).
            """,
            agent=kompose_agent,
            expected_output="JSON with Opportunity Assessment Matrix"
        ))
        
        # Task 7: Key Success Factors Matrix
        tasks.append(Task(
            description=f"""
            Create a Key Success Factors Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Area": ["Technology", "Operations", "Customer Experience"],
                    "Requirements": ["Requirements for Technology", "Requirements for Operations", "Requirements for Customer Experience"],
                    "Current Market": ["Current Market for Technology", "Current Market for Operations", "Current Market for Customer Experience"],
                    "Your Potential": ["Your Potential for Technology", "Your Potential for Operations", "Your Potential for Customer Experience"]
                }}
            }}
            
            For Requirements, list 3 key requirements for each area, formatted as bullet points with line breaks (e.g., "• Mobile App<br>• AI/ML<br>• Real-time Tracking"). For Current Market and Your Potential, provide concise assessments like "Limited Solutions", "Competitive Edge", etc.
            """,
            agent=kompose_agent,
            expected_output="JSON with Key Success Factors Matrix"
        ))
        
        # Task 8: Growth Drivers Matrix
        tasks.append(Task(
            description=f"""
            Create a Growth Drivers Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Driver Type": ["Driver 1", "Driver 2", "Driver 3", "Driver 4", "Driver 5"],
                    "Impact": ["High", "High", "High", "Medium", "Medium"],
                    "Trend": ["Rising", "Rising", "Rising", "Rising", "Rising"],
                    "Time Horizon": ["Short Term", "Immediate", "Short Term", "Medium Term", "Long Term"]
                }}
            }}
            
            Identify key growth drivers relevant to the business, their impact (High, Medium, Low), trend direction (Rising, Stable, Declining), and time horizon for realization (Immediate, Short Term, Medium Term, Long Term).
            """,
            agent=kompose_agent,
            expected_output="JSON with Growth Drivers Matrix"
        ))
        
        # Task 9: Investment Landscape Matrix
        tasks.append(Task(
            description=f"""
            Create an Investment Landscape Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Investor Type": ["VCs", "Strategic Investors", "Private Equity"],
                    "Recent Investments": ["2.1B (Last 12 months)", "3.2B (Last 12 months)", "1.8B (Last 12 months)"],
                    "Average Deal Size": ["25M - 100M", "50M - 250M", "100M+"],
                    "Focus Areas": ["Focus Areas for VCs", "Focus Areas for Strategic Investors", "Focus Areas for Private Equity"],
                    "Trends": ["Increasing", "Increasing", "Stable"]
                }}
            }}
            
            For Focus Areas, list 3 key focus areas for each investor type as bullet points with line breaks (e.g., "• Tech Integration<br>• Supply Chain<br>• Customer Analytics"). For Trends, use text indicators (Increasing, Stable, Declining).
            """,
            agent=kompose_agent,
            expected_output="JSON with Investment Landscape Matrix"
        ))
        
        # Task 10: Technology Stack Requirements
        tasks.append(Task(
            description=f"""
            Create a Technology Stack Requirements matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Component": ["E-commerce Platform", "Inventory Management", "Delivery Management", "AR/VR Try-on", "Analytics & AI"],
                    "Current Market Solutions": ["Multiple Solutions Available", "Limited Quick-Commerce Solutions", "Emerging Solutions", "Few Specialized Solutions", "Custom Development Needed"],
                    "Gap Analysis": ["Medium Gap", "High Gap", "High Gap", "Very High Gap", "High Gap"],
                    "Implementation Complexity": ["Medium", "High", "High", "Very High", "High"],
                    "Cost Range": ["150000-250000", "75000-120000", "80000-130000", "180000-270000", "100000-180000"]
                }}
            }}
            
            Identify the key technology components needed for the business, evaluate available market solutions, gap analysis (Low Gap, Medium Gap, High Gap, Very High Gap), implementation complexity, and approximate cost ranges with realistic numerical values for each component.
            """,
            agent=kompose_agent,
            expected_output="JSON with Technology Stack Requirements"
        ))
        
        # Task 11: Regulatory Environment Matrix
        tasks.append(Task(
            description=f"""
            Create a Regulatory Environment Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Aspect": ["E-commerce", "Quick Commerce", "Labor Laws", "Data Privacy", "Consumer Protection"],
                    "Current Regulations": ["Standard Framework", "Evolving Rules", "Gig Economy Focus", "GDPR/Similar", "Standard Framework"],
                    "Future Trends": ["Increasing Oversight", "New Regulations Expected", "Stricter Controls", "Increasing Strictness", "Enhanced Protection"],
                    "Impact Level": ["Medium", "High", "High", "High", "Medium"],
                    "Compliance Cost": ["40000-60000", "80000-120000", "75000-110000", "90000-130000", "40000-70000"]
                }}
            }}
            
            Analyze the regulatory landscape relevant to the business idea, current and future regulatory trends, potential impact levels (Low, Medium, High), and approximate compliance costs with numerical ranges for each aspect.
            """,
            agent=kompose_agent,
            expected_output="JSON with Regulatory Environment Matrix"
        ))
        
        # Task 12: Supply Chain Analysis
        tasks.append(Task(
            description=f"""
            Create a Supply Chain Analysis for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Component": ["Sourcing", "Storage", "Last Mile", "Returns"],
                    "Current State": ["Traditional", "Centralized", "Standard", "Complex"],
                    "Pain Points": ["Long Lead Times", "High Inventory Costs", "Slow Delivery", "High Return Rates"],
                    "Innovation Opportunities": ["AI Prediction", "Dark Stores", "Micro-Fulfillment", "Smart Solutions"],
                    "Cost Impact": ["High", "Medium", "High", "High"]
                }}
            }}
            
            Analyze the supply chain components specific to the business idea, current state of each component, key pain points, opportunities for innovation, and cost impact (Low, Medium, High).
            """,
            agent=kompose_agent,
            expected_output="JSON with Supply Chain Analysis"
        ))
        
        # Task 13: Customer Experience Mapping
        tasks.append(Task(
            description=f"""
            Create a Customer Experience Mapping for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Touchpoint": ["Discovery", "Size/Fit", "Purchase", "Delivery", "Returns"],
                    "Current Market Standard": ["Social Media/Apps", "Basic Tools", "Standard E-commerce", "Same Day/Next Day", "Traditional Process"],
                    "Pain Points": ["Fragmented", "Inaccurate", "Slow", "Too Slow", "Complex"],
                    "Innovation Potential": ["High", "Very High", "High", "Very High", "High"],
                    "Priority": ["Critical", "Critical", "High", "Critical", "High"]
                }}
            }}
            
            Map the customer journey touchpoints relevant to the business idea, current market standards, pain points, potential for innovation (Low, Medium, High, Very High), and priority level (Low, Medium, High, Critical).
            """,
            agent=kompose_agent,
            expected_output="JSON with Customer Experience Mapping"
        ))
        
        # Task 14: Resource Requirements Matrix
        tasks.append(Task(
            description=f"""
            Create a Resource Requirements Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Resource Type": ["Technology Team", "Operations Team", "Warehouse Staff", "Delivery Partners", "Management Team"],
                    "Initial Need": ["15-20", "25-30", "30-40", "50-100", "5-7"],
                    "Scale-up Need": ["50-75", "100-150", "150-200", "500-1000", "15-20"],
                    "Availability": ["Limited", "Available", "Available", "Available", "Limited"],
                    "Cost Level": ["High", "Medium", "Low", "Medium", "High"]
                }}
            }}
            
            Define the human and operational resources needed for the business, both initially and for scaling up, resource availability (Limited, Available, Abundant), and cost levels (Low, Medium, High).
            """,
            agent=kompose_agent,
            expected_output="JSON with Resource Requirements Matrix"
        ))
        
        # Task 15: Risk Assessment Matrix
        tasks.append(Task(
            description=f"""
            Create a Risk Assessment Matrix for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Risk Category": ["Technology Risk", "Market Risk", "Operational Risk", "Financial Risk", "Regulatory Risk"],
                    "Probability": ["High", "Medium", "High", "Medium", "Low"],
                    "Impact": ["High", "High", "High", "High", "High"],
                    "Mitigation Availability": ["Available", "Partial", "Available", "Available", "Available"],
                    "Priority": ["Critical", "High", "Critical", "High", "Medium"]
                }}
            }}
            
            Identify key risk categories, assess probability (Low, Medium, High), potential impact (Low, Medium, High), availability of mitigation measures (Available, Partial, Limited, None), and priority level (Low, Medium, High, Critical).
            """,
            agent=kompose_agent,
            expected_output="JSON with Risk Assessment Matrix"
        ))
        
        # Task 16: Unit Economics Baseline
        tasks.append(Task(
            description=f"""
            Create a Unit Economics Baseline for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Metric": ["CAC", "LTV", "AOV", "Gross Margin", "Delivery Cost"],
                    "Industry Average": ["25-30", "150-200", "45-50", "45-50%", "8-10"],
                    "Best in Class": ["15-20", "300-350", "75-80", "60-65%", "5-6"],
                    "Your Potential": ["20-25", "250-300", "60-65", "55-60%", "6-7"],
                    "Notes": ["Optimization Possible", "Higher with Quick Service", "Premium for Speed", "Efficiency Dependent", "Scale Dependent"]
                }}
            }}
            
            Analyze key unit economics metrics: Customer Acquisition Cost (CAC), Lifetime Value (LTV), Average Order Value (AOV), Gross Margin, Delivery Cost, and other metrics relevant to the business. Compare industry averages, best-in-class benchmarks, and potential for your business. Use numeric values without currency symbols.
            """,
            agent=kompose_agent,
            expected_output="JSON with Unit Economics Baseline"
        ))
        
        # Task 17: Market Size Segmentation
        tasks.append(Task(
            description=f"""
            Create a Market Size Segmentation for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Segment": ["Segment 1", "Segment 2", "Segment 3", "Combined Opportunity"],
                    "TAM": ["142B", "25B", "62B", "229B"],
                    "SAM": ["42B", "8B", "18B", "68B"],
                    "SOM": ["2.1B", "400M", "900M", "3.4B"],
                    "Growth Rate": ["21%", "32%", "27%", "26%"]
                }}
            }}
            
            Identify relevant market segments for the business idea, calculate Total Addressable Market (TAM), Serviceable Addressable Market (SAM), Serviceable Obtainable Market (SOM), and growth rates for each segment. Include a "Combined Opportunity" row with totals. Use numeric values without currency symbols.
            """,
            agent=kompose_agent,
            expected_output="JSON with Market Size Segmentation"
        ))
        
        # Task 18: Competitive Moat Analysis
        tasks.append(Task(
            description=f"""
            Create a Competitive Moat Analysis for the business idea: "{initial_user_input}".
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "matrix_data": {{
                    "Moat Type": ["Network Effects", "Brand Value", "Technology", "Data Advantage", "Scale Economics"],
                    "Current Market": ["Limited", "Limited", "Limited", "Limited", "Limited"],
                    "Development Potential": ["High", "High", "Very High", "Very High", "High"],
                    "Time to Build": ["18-24 months", "12-18 months", "12-15 months", "18-24 months", "24-36 months"],
                    "Investment Need": ["150000-250000", "80000-140000", "180000-300000", "100000-180000", "200000-350000"]
                }}
            }}
            
            Analyze potential competitive advantages (moats), evaluate the current market state for each moat type, development potential (Low, Medium, High, Very High), estimated time to build the moat, and approximate investment needed with realistic numerical ranges for each moat type.
            """,
            agent=kompose_agent,
            expected_output="JSON with Competitive Moat Analysis"
        ))
        
        # Create the crew with all tasks
        crew = Crew(
            agents=[kompose_agent],
            tasks=tasks,
            process=Process.sequential,
            verbose=True
        )
        
        # Execute all tasks and collect results
        try:
            results = []
            # Execute all tasks in sequence
            for i, task in enumerate(tasks):
                try:
                    # Execute individual task
                    result = kompose_agent.execute_task(task)
                    
                    # Try to parse JSON from the result
                    json_match = re.search(r'({.*})', result, re.DOTALL)
                    if json_match:
                        try:
                            result_data = json.loads(json_match.group(1))
                            # Add task number and title
                            result_data["task_number"] = i + 1
                            result_data["task_title"] = self._get_task_title(i + 1)
                            results.append(result_data)
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse JSON for task {i+1}: {result}")
                            # Create a fallback result with error message
                            results.append({
                                "task_number": i + 1,
                                "task_title": self._get_task_title(i + 1),
                                "error": "Failed to parse result",
                                "raw_result": result
                            })
                    else:
                        logger.error(f"No JSON found in result for task {i+1}")
                        # Create a fallback result with error message
                        results.append({
                            "task_number": i + 1,
                            "task_title": self._get_task_title(i + 1),
                            "error": "No JSON found in result",
                            "raw_result": result
                        })
                except Exception as e:
                    logger.error(f"Error executing task {i+1}: {str(e)}")
                    # Create a fallback result with error message
                    results.append({
                        "task_number": i + 1,
                        "task_title": self._get_task_title(i + 1),
                        "error": f"Error executing task: {str(e)}"
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error generating Kompose idea: {str(e)}")
            return [{"error": f"Error generating Kompose idea: {str(e)}"}]
    
    def _get_task_title(self, task_number):
        """Get title for a task based on its number"""
        task_titles = {
            1: "Initial Classification Matrix",
            2: "Similar Business Analysis Matrix",
            3: "Market Opportunity Grid",
            4: "Market Trends Heat Map",
            5: "Competition Analysis Matrix",
            6: "Opportunity Assessment Matrix",
            7: "Key Success Factors Matrix",
            8: "Growth Drivers Matrix",
            9: "Investment Landscape Matrix",
            10: "Technology Stack Requirements",
            11: "Regulatory Environment Matrix",
            12: "Supply Chain Analysis",
            13: "Customer Experience Mapping",
            14: "Resource Requirements Matrix",
            15: "Risk Assessment Matrix",
            16: "Unit Economics Baseline",
            17: "Market Size Segmentation",
            18: "Competitive Moat Analysis"
        }
        
        return task_titles.get(task_number, f"Task {task_number}")