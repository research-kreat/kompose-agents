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
    
    def generate_kompose_idea(self, data=None):
        """
        Generate a complete business idea with all 18 tasks
        
        Returns:
            list: Results from all tasks
        """
        # Create the agent for all tasks
        kompose_agent = Agent(
            role="Business Idea Generator",
            goal="Generate comprehensive startup ideas and business approaches",
            backstory="""You are an expert in business development, market analysis, 
            and startup creation. You help entrepreneurs develop innovative business 
            ideas with detailed implementation strategies.""",
            verbose=True,
            llm=self.llm
        )
        
        # Define all 18 tasks
        tasks = []
        
        # Task 1: Initial Business Idea Generation
        tasks.append(Task(
            description=f"""
            Generate an innovative business idea based on current market trends and opportunities.
            Consider the following factors:
            - Emerging market needs
            - Technological advancements
            - Potential for disruption
            - Scalability
            - Target audience
            
            The idea should be specific, feasible, and innovative.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "idea_name": "Name of the business idea",
                "tagline": "Brief 1-line description",
                "summary": "3-4 sentence explanation of the business concept",
                "innovation_factor": "What makes this idea innovative",
                "target_market": "Primary target audience",
                "potential_impact": "Potential impact of this business"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with business idea details"
        ))
        
        # Task 2: Market Analysis
        tasks.append(Task(
            description=f"""
            Perform a comprehensive market analysis for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "market_size": "Size of the total addressable market in dollars",
                "market_growth": "Annual growth rate percentage",
                "key_trends": ["List of 3-5 key market trends"],
                "major_players": ["List of 3-5 existing companies in this space"],
                "market_gaps": ["List of 3-4 unmet needs or gaps in the market"],
                "market_challenges": ["List of 3-4 challenges in the market"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with market analysis"
        ))
        
        # Task 3: Customer Segmentation
        tasks.append(Task(
            description=f"""
            Define detailed customer segments for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "primary_segment": {{
                    "name": "Name of primary customer segment",
                    "demographics": "Demographics of this segment",
                    "psychographics": "Psychographic profile",
                    "pain_points": ["List of 3-4 key pain points"],
                    "needs": ["List of 3-4 key needs"]
                }},
                "secondary_segment": {{
                    "name": "Name of secondary customer segment",
                    "demographics": "Demographics of this segment",
                    "psychographics": "Psychographic profile",
                    "pain_points": ["List of 3-4 key pain points"],
                    "needs": ["List of 3-4 key needs"]
                }},
                "segment_growth_potential": "Analysis of growth potential by segment"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with customer segmentation"
        ))
        
        # Task 4: Value Proposition
        tasks.append(Task(
            description=f"""
            Develop a compelling value proposition for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "core_value_proposition": "The main value proposition in one sentence",
                "key_benefits": ["List of 4-5 key benefits for customers"],
                "differentiators": ["List of 3-4 key differentiators from competitors"],
                "value_proposition_statement": "A comprehensive 3-4 sentence value proposition",
                "problem_solution_fit": "How the solution addresses customer problems"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with value proposition"
        ))
        
        # Task 5: Business Model
        tasks.append(Task(
            description=f"""
            Define the business model for the idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "revenue_model": "Primary method of generating revenue",
                "pricing_strategy": "Pricing approach and rationale",
                "revenue_streams": ["List of 3-4 potential revenue streams"],
                "cost_structure": {{
                    "fixed_costs": ["List of main fixed costs"],
                    "variable_costs": ["List of main variable costs"]
                }},
                "key_metrics": ["List of 4-5 key performance indicators"],
                "break_even_estimate": "Estimated time to break even"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with business model"
        ))
        
        # Task 6: Competitor Analysis
        tasks.append(Task(
            description=f"""
            Analyze the competitors in this market space.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "direct_competitors": [
                    {{
                        "name": "Competitor 1 name",
                        "strengths": ["List of 2-3 strengths"],
                        "weaknesses": ["List of 2-3 weaknesses"],
                        "market_share": "Estimated market share percentage"
                    }},
                    {{
                        "name": "Competitor 2 name",
                        "strengths": ["List of 2-3 strengths"],
                        "weaknesses": ["List of 2-3 weaknesses"],
                        "market_share": "Estimated market share percentage"
                    }}
                ],
                "indirect_competitors": ["List of 3-4 indirect competitors"],
                "competitive_advantages": ["List of 3-4 potential advantages for your business"],
                "barriers_to_entry": ["List of 3-4 barriers to market entry"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with competitor analysis"
        ))
        
        # Task 7: SWOT Analysis
        tasks.append(Task(
            description=f"""
            Perform a SWOT analysis for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "strengths": ["List of 4-5 internal strengths"],
                "weaknesses": ["List of 4-5 internal weaknesses"],
                "opportunities": ["List of 4-5 external opportunities"],
                "threats": ["List of 4-5 external threats"],
                "key_insights": "Brief analysis of the most critical SWOT elements"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with SWOT analysis"
        ))
        
        # Task 8: Marketing Strategy
        tasks.append(Task(
            description=f"""
            Develop a marketing strategy for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "brand_positioning": "How the brand should be positioned",
                "marketing_channels": ["List of 4-5 key marketing channels"],
                "content_strategy": "Approach to content creation and distribution",
                "customer_acquisition": "Strategy for acquiring customers",
                "growth_tactics": ["List of 3-4 specific growth tactics"],
                "key_messaging": ["List of 3-4 key messages for marketing"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with marketing strategy"
        ))
        
        # Task 9: Product Development Roadmap
        tasks.append(Task(
            description=f"""
            Create a product development roadmap for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "mvp_features": ["List of 4-5 core features for MVP"],
                "development_phases": [
                    {{
                        "phase": "Phase 1 (MVP)",
                        "timeline": "Estimated timeline",
                        "key_milestones": ["List of 3-4 key milestones"]
                    }},
                    {{
                        "phase": "Phase 2",
                        "timeline": "Estimated timeline",
                        "key_milestones": ["List of 3-4 key milestones"]
                    }},
                    {{
                        "phase": "Phase 3",
                        "timeline": "Estimated timeline",
                        "key_milestones": ["List of 3-4 key milestones"]
                    }}
                ],
                "technology_stack": ["List of potential technologies to use"],
                "development_challenges": ["List of 3-4 potential challenges"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with product development roadmap"
        ))
        
        # Task 10: Financial Projections (Fixed)
        tasks.append(Task(
            description=f"""
            Create financial projections for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "startup_costs": {{
                    "total": "Estimated total startup costs",
                    "breakdown": ["List of 4-5 major startup cost categories with amounts"]
                }},
                "monthly_expenses": {{
                    "total": "Estimated monthly expenses",
                    "breakdown": ["List of 4-5 major expense categories with amounts"]
                }},
                "revenue_projections": {{
                    "year_1": "Projected revenue for year 1",
                    "year_2": "Projected revenue for year 2",
                    "year_3": "Projected revenue for year 3"
                }},
                "profitability_timeline": "Estimated timeline to profitability",
                "funding_requirements": "Estimated funding needed"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with financial projections"
        ))

        # Task 11: Team Structure
        tasks.append(Task(
            description=f"""
            Define the ideal team structure for the business.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "founding_team": ["List of 2-4 key founding roles needed"],
                "initial_hires": ["List of 3-5 first employees to hire"],
                "skills_required": ["List of 5-7 essential skills needed"],
                "organizational_structure": "Brief description of org structure",
                "hiring_timeline": "Timeline for building the team",
                "culture_values": ["List of 3-5 key cultural values for the company"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with team structure"
        ))
        
        # Task 12: Go-to-Market Strategy
        tasks.append(Task(
            description=f"""
            Develop a go-to-market strategy for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "launch_strategy": "Overall approach to market launch",
                "target_geography": "Initial geographic market focus",
                "launch_timeline": "Timeline for market entry",
                "key_launch_activities": ["List of 4-5 key launch activities"],
                "success_metrics": ["List of 3-4 key metrics to track success"],
                "partnerships_needed": ["List of 3-4 potential partnerships"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with go-to-market strategy"
        ))
        
        # Task 13: Risk Assessment
        tasks.append(Task(
            description=f"""
            Conduct a risk assessment for the business idea.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "market_risks": ["List of 3-4 key market risks"],
                "operational_risks": ["List of 3-4 key operational risks"],
                "financial_risks": ["List of 3-4 key financial risks"],
                "technology_risks": ["List of 3-4 key technology risks"],
                "regulatory_risks": ["List of 2-3 key regulatory risks"],
                "mitigation_strategies": ["List of 4-5 risk mitigation strategies"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with risk assessment"
        ))
        
        # Task 14: Technology Requirements
        tasks.append(Task(
            description=f"""
            Define the technology requirements for the business.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "core_technologies": ["List of 3-5 core technologies needed"],
                "infrastructure_needs": ["List of 3-4 infrastructure requirements"],
                "technical_capabilities": ["List of 4-5 technical capabilities needed"],
                "build_vs_buy": "Approach to building vs buying technology",
                "technology_roadmap": "Brief roadmap for technology development",
                "maintenance_considerations": "Ongoing maintenance considerations"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with technology requirements"
        ))
        
        # Task 15: Scalability Plan
        tasks.append(Task(
            description=f"""
            Create a scalability plan for the business.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "growth_drivers": ["List of 3-4 key growth drivers"],
                "scalability_challenges": ["List of 3-4 challenges to scaling"],
                "expansion_strategy": "Overall approach to scaling the business",
                "market_expansion": ["List of 3-4 potential new markets"],
                "operational_scaling": "How operations will scale with growth",
                "technology_scaling": "How technology will scale with growth"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with scalability plan"
        ))
        
        # Task 16: Legal and Regulatory Considerations
        tasks.append(Task(
            description=f"""
            Identify legal and regulatory considerations for the business.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "business_structure": "Recommended legal structure",
                "regulations": ["List of 3-5 key regulations to consider"],
                "compliance_requirements": ["List of 3-4 compliance requirements"],
                "intellectual_property": "IP protection strategy",
                "contracts_needed": ["List of 3-4 essential contracts"],
                "legal_risks": ["List of 2-3 key legal risks"]
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with legal and regulatory considerations"
        ))
        
        # Task 17: Key Partnerships
        tasks.append(Task(
            description=f"""
            Identify key partnerships for the business.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "strategic_partners": ["List of 3-4 potential strategic partners"],
                "technology_partners": ["List of 2-3 potential technology partners"],
                "distribution_partners": ["List of 2-3 potential distribution partners"],
                "service_providers": ["List of 3-4 essential service providers"],
                "partnership_benefits": ["List of 3-4 key benefits from partnerships"],
                "partnership_approach": "Strategy for establishing partnerships"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with key partnerships"
        ))
        
        # Task 18: Implementation Action Plan
        tasks.append(Task(
            description=f"""
            Create an implementation action plan for the first 12 months.
            
            FORMAT YOUR RESPONSE AS JSON:
            {{
                "months_1_3": ["List of 5-6 key actions for months 1-3"],
                "months_4_6": ["List of 5-6 key actions for months 4-6"],
                "months_7_9": ["List of 5-6 key actions for months 7-9"],
                "months_10_12": ["List of 5-6 key actions for months 10-12"],
                "critical_milestones": ["List of 4-5 critical milestones"],
                "resource_allocation": "Key resources needed and how to allocate them"
            }}
            """,
            agent=kompose_agent,
            expected_output="JSON with implementation action plan"
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
            1: "Business Idea Generation",
            2: "Market Analysis",
            3: "Customer Segmentation",
            4: "Value Proposition",
            5: "Business Model",
            6: "Competitor Analysis",
            7: "SWOT Analysis",
            8: "Marketing Strategy",
            9: "Product Development Roadmap",
            10: "Financial Projections",
            11: "Team Structure",
            12: "Go-to-Market Strategy",
            13: "Risk Assessment",
            14: "Technology Requirements",
            15: "Scalability Plan",
            16: "Legal and Regulatory Considerations",
            17: "Key Partnerships",
            18: "Implementation Action Plan"
        }
        
        return task_titles.get(task_number, f"Task {task_number}")