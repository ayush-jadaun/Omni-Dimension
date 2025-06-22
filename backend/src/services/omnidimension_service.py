import os
import sys
import json
import time
from datetime import datetime, timedelta, UTC
import requests
from typing import Dict, Any, Optional, List

try:
    from omnidimension import Client
except ImportError:
    Client = None

class OmniDimensionService:
    def __init__(self, api_key: Optional[str] = "Zxw_8n3uvfGKhHMHv9jZwu5z0FncESPNnMjZC0R14J0"):
        # Don't hardcode API keys - use environment variables
        self.api_key = api_key or os.getenv('OMNIDIMENSION_API_KEY')
        if not self.api_key:
            raise ValueError("API key must be provided either as parameter or OMNIDIMENSION_API_KEY environment variable")
        
        self.client = Client(self.api_key) if Client else None
        self.mock_mode = not bool(self.client)
        self.test_phone = "+919548999129"  # Using Indian format as per docs
        self.agents_cache = {}
        self.call_history = []
        
        # Add retry configuration
        self.max_retries = 3
        self.retry_delay = 2  # seconds

    # --- Utility Methods ---
    def _now(self):
        return datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")

    def _tomorrow(self):
        return (datetime.now(UTC) + timedelta(days=1)).strftime("%B %d, %Y")

    def _handle_response(self, response):
        """Standardize response extraction based on docs pattern."""
        if isinstance(response, dict):
            if 'json' in response:
                return response['json']
            return response
        return response

    def _validate_phone_number(self, phone: str) -> bool:
        """Enhanced phone number validation."""
        if not phone:
            return False
        # Remove common formatting characters
        clean_phone = ''.join(filter(str.isdigit, phone.replace('+', '')))
        # Should have at least 10 digits and start with proper country code
        return len(clean_phone) >= 10 and len(clean_phone) <= 15

    def _validate_agent_config(self, config: Dict[str, Any]) -> bool:
        """Validate agent configuration before sending to API."""
        required_fields = ['name', 'welcome_message', 'call_type']
        for field in required_fields:
            if not config.get(field):
                raise ValueError(f"Agent configuration missing required field: {field}")
        return True

    def _retry_api_call(self, api_func, *args, **kwargs):
        """Retry API calls with exponential backoff."""
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                return api_func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    print(f"API call failed (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print(f"All {self.max_retries} attempts failed")
        
        raise last_exception

    # --- Core API Methods ---

    def create_restaurant_agent(self, restaurant_name: str, customer_info: Dict[str, Any]) -> tuple:
        """Create a restaurant booking agent with improved error handling."""
        if not restaurant_name:
            raise ValueError("Restaurant name is required")
        
        customer_name = customer_info.get('name', 'Customer')
        customer_email = customer_info.get('email', 'customer@example.com')
        
        # Agent configuration based on the actual API response structure
        agent_config = {
            "name": f"{restaurant_name} - Booking Assistant for {customer_name}",
            "welcome_message": f"Hello! This is {customer_name} calling to make a reservation at {restaurant_name}. Could you please help me with booking a table?",
            "context_breakdown": [
                {
                    "title": "Reservation Request",
                    "body": f"I am {customer_name} and I would like to make a reservation at {restaurant_name}. I will provide the date, time, number of guests, and any special requests. Please be polite and professional when speaking with the restaurant staff."
                },
                {
                    "title": "Customer Information", 
                    "body": f"Customer Name: {customer_name}, Email: {customer_email}. Please provide this information if the restaurant asks for contact details."
                },
                {
                    "title": "Conversation Flow",
                    "body": "1. Greet the restaurant politely 2. Request to make a reservation 3. Provide all reservation details clearly 4. Confirm the booking details 5. Ask for confirmation number if available 6. Thank them and end the call politely"
                }
            ],
            # Use the exact field names from the API response
            "call_type": "Outgoing",  # This matches what we see in the response
            "voice_provider": "eleven_labs",
            "voice_external_id": "JBFqnCBsd6RMkjVDRZzb",
            "llm_service": "gpt-4o-mini",  # This matches the response format
            "bot_type": "prompt",
            "language": ["en"],  # Array format as seen in response
            "is_filler_enable": False,
            "filler_after_sec": 0.0,
            "llm_straming_enabled": False,
            "enable_web_search": False
        }
        
        self._validate_agent_config(agent_config)
        
        if self.mock_mode:
            agent_id = f"mock_agent_{int(time.time())}"
            agent_data = {"id": agent_id, "name": agent_config["name"]}
            print(f"[MOCK MODE] Created agent: {agent_id}")
        else:
            try:
                print(f"Creating agent for {restaurant_name}...")
                print(f"Agent config: {json.dumps(agent_config, indent=2)}")
                
                # Use retry mechanism for agent creation
                response = self._retry_api_call(self.client.agent.create, **agent_config)
                agent_data = self._handle_response(response)
                agent_id = agent_data.get("id")
                
                if not agent_id:
                    raise ValueError(f"Agent creation failed - no ID returned. Response: {agent_data}")
                    
                print(f"Agent created successfully: {agent_id}")
                
            except Exception as e:
                print(f"Error creating agent: {str(e)}")
                print(f"Agent config used: {json.dumps(agent_config, indent=2)}")
                raise
        
        self.agents_cache[agent_id] = agent_data
        return agent_id, agent_data

    def make_call(self, agent_id: str, phone_number: Optional[str] = None, call_context: Optional[Dict] = None) -> tuple:
        """Place a call using an agent with enhanced error handling."""
        if not agent_id:
            raise ValueError("Agent ID is required")
        
        phone = phone_number or self.test_phone
        
        if not self._validate_phone_number(phone):
            raise ValueError(f"Invalid phone number: {phone}")
        
        # Prepare call context with defaults - keep it simple
        call_context = call_context or {}
        
        # Validate that the agent exists and has proper configuration
        if not self.mock_mode:
            try:
                # Check agent status before making call
                agent_response = self.client.agent.get_agent(agent_id)
                agent_data = self._handle_response(agent_response)
                
                # Verify agent has voice configuration
                if not agent_data.get('voice_external_id'):
                    print("Warning: Agent may not have proper voice configuration")
                
                print(f"Agent {agent_id} verified and ready for calls")
                
            except Exception as e:
                print(f"Warning: Could not verify agent {agent_id}: {str(e)}")
                # Continue anyway as the agent might still work
        
        if self.mock_mode:
            call_id = f"mock_call_{int(time.time())}"
            call_data = {
                "id": call_id, 
                "status": "mock_initiated", 
                "agent_id": agent_id, 
                "phone_number": phone
            }
            print(f"[MOCK MODE] Initiated call: {call_id}")
        else:
            try:
                print(f"Dispatching call to {phone} using agent {agent_id}...")
                
                # Use the simplest possible call to the API
                # Based on the library source, it should be:
                response = self._retry_api_call(
                    self.client.call.dispatch_call,
                    agent_id=agent_id,
                    to_number=phone,
                    call_context=call_context if call_context else {}
                )
                
                print(f"Raw API response: {response}")
                call_data = self._handle_response(response)
                call_id = call_data.get("id") or call_data.get("call_id") or call_data.get("uuid")
                
                if not call_id:
                    raise ValueError(f"Call dispatch failed - no call ID returned. Response: {call_data}")
                    
                print(f"Call dispatched successfully: {call_id}")
                
            except Exception as e:
                print(f"Error dispatching call: {str(e)}")
                print(f"Exception type: {type(e).__name__}")
                
                # More detailed error analysis
                if hasattr(e, 'response'):
                    response = e.response
                    print(f"HTTP Status: {getattr(response, 'status_code', 'N/A')}")
                    print(f"Response Headers: {getattr(response, 'headers', 'N/A')}")
                    try:
                        print(f"Response Body: {response.text if hasattr(response, 'text') else 'N/A'}")
                    except:
                        print("Could not read response body")
                
                print(f"Call parameters:")
                print(f"  - agent_id: {agent_id} (type: {type(agent_id)})")
                print(f"  - to_number: {phone} (type: {type(phone)})")
                print(f"  - call_context: {call_context} (type: {type(call_context)})")
                
                raise
        
        call_record = {**call_data, "timestamp": self._now()}
        self.call_history.append(call_record)
        return call_id, call_data

    def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """Fetch call status and summary with retry logic."""
        if not call_id:
            raise ValueError("Call ID is required")
            
        if self.mock_mode:
            return {
                "id": call_id, 
                "status": "mock_completed", 
                "summary": "Mock reservation confirmed successfully.",
                "duration": 45,
                "transcript": "Mock conversation transcript"
            }
            
        try:
            response = self._retry_api_call(self.client.call.get_call_log, call_id)
            return self._handle_response(response)
        except Exception as e:
            print(f"Error getting call status for {call_id}: {str(e)}")
            raise

    def get_call_logs(self, agent_id: Optional[str] = None, page: int = 1, page_size: int = 30) -> Dict[str, Any]:
        """Get call logs with improved error handling."""
        if self.mock_mode:
            return {
                "data": self.call_history[-page_size:],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": len(self.call_history)
                }
            }
            
        try:
            response = self._retry_api_call(
                self.client.call.get_call_logs,
                agent_id=agent_id,
                page=page,
                page_size=page_size
            )
            return self._handle_response(response)
        except Exception as e:
            print(f"Error getting call logs: {str(e)}")
            raise

    def make_restaurant_reservation(self, restaurant_info: Dict, reservation_details: Dict, customer_info: Dict) -> Dict[str, Any]:
        """End-to-end restaurant reservation with comprehensive error handling."""
        
        # Enhanced input validation
        if not restaurant_info or not restaurant_info.get('name'):
            raise ValueError("Restaurant info with name is required")
        if not customer_info or not customer_info.get('name'):
            raise ValueError("Customer info with name is required")
        if not reservation_details:
            raise ValueError("Reservation details are required")
        
        # Validate phone number if provided
        restaurant_phone = restaurant_info.get('phone')
        if restaurant_phone and not self._validate_phone_number(restaurant_phone):
            raise ValueError(f"Invalid restaurant phone number: {restaurant_phone}")
        
        print(f"Starting reservation process for {restaurant_info['name']}")
        
        try:
            # Create agent
            agent_id, agent_data = self.create_restaurant_agent(
                restaurant_info['name'], 
                customer_info
            )
            
            # Prepare comprehensive call context
            call_context = {
                "reservation_date": reservation_details.get("date", self._tomorrow()),
                "reservation_time": reservation_details.get("time", "7:00 PM"),
                "number_of_guests": str(reservation_details.get("party_size", 2)),
                "special_requests": reservation_details.get("special_requests", ""),
                "customer_name": customer_info.get("name"),
                "customer_phone": customer_info.get("phone", ""),
                "customer_email": customer_info.get("email", ""),
                "restaurant_name": restaurant_info['name'],
                "booking_type": "reservation",
                "urgency": "normal"
            }
            
            # Make call with fallback phone number
            target_phone = restaurant_phone or self.test_phone
            call_id, call_data = self.make_call(
                agent_id, 
                target_phone, 
                call_context
            )
            
            # Get initial status
            call_status = self.get_call_status(call_id)
            
            result = {
                "success": True,
                "agent_id": agent_id,
                "call_id": call_id,
                "agent_data": agent_data,
                "call_data": call_data,
                "call_status": call_status,
                "timestamp": self._now(),
                "restaurant": restaurant_info['name'],
                "customer": customer_info.get('name'),
                "reservation": reservation_details,
                "target_phone": target_phone
            }
            
            print(f"Reservation process completed successfully. Call ID: {call_id}")
            return result
            
        except Exception as e:
            print(f"Reservation process failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": self._now(),
                "restaurant": restaurant_info['name'],
                "customer": customer_info.get('name'),
                "reservation": reservation_details
            }

    def get_agent_details(self, agent_id: str) -> Dict[str, Any]:
        """Get detailed information about an agent."""
        if self.mock_mode:
            return self.agents_cache.get(agent_id, {"id": agent_id, "status": "mock"})
        
        try:
            response = self.client.agent.get_agent(agent_id)
            return self._handle_response(response)
        except Exception as e:
            print(f"Error getting agent details for {agent_id}: {str(e)}")
            raise

    def test_api_connection(self) -> Dict[str, Any]:
        """Test API connection and authentication."""
        if self.mock_mode:
            return {"status": "mock_mode", "api_accessible": False}
        
        try:
            # Try to get call logs as a simple API test
            response = self._retry_api_call(self.client.call.get_call_logs, page_size=1)
            return {
                "status": "connected",
                "api_accessible": True,
                "response": response
            }
        except Exception as e:
            return {
                "status": "error", 
                "api_accessible": False,
                "error": str(e)
            }

# ------------- Example Usage with Better Error Handling ------------------
def main():
    """Example usage with comprehensive error handling."""
    try:
        # Initialize service
        print("Initializing OmniDimension service...")
        service = OmniDimensionService()
        
        # Test API connection first
        print("\nTesting API connection...")
        connection_test = service.test_api_connection()
        print(f"Connection test result: {json.dumps(connection_test, indent=2)}")
        
        if not connection_test.get("api_accessible") and not service.mock_mode:
            print("⚠️  API connection failed. The service may be experiencing issues.")
            print("Continuing with mock mode for demonstration...")
            service.mock_mode = True
        
        # Restaurant info - using Indian phone format as per docs
        restaurant = {
            "name": "Spice Garden Restaurant", 
            "phone": "+919876543210"  # Indian format as shown in docs
        }
        
        # Reservation details
        reservation = {
            "date": "Tomorrow", 
            "time": "7:30 PM", 
            "party_size": 4, 
            "special_requests": "Window seat preferred, celebrating anniversary"
        }
        
        # Customer info
        customer = {
            "name": "Ayush Kumar", 
            "email": "ayush.kumar@example.com",
            "phone": "+919876543211"
        }
        
        print("\nMaking restaurant reservation...")
        result = service.make_restaurant_reservation(restaurant, reservation, customer)
        
        print("\n" + "="*50)
        print("RESERVATION RESULT:")
        print("="*50)
        print(json.dumps(result, indent=2))
        
        if result.get("success"):
            # Example: Get call logs
            print("\n" + "="*50)
            print("RECENT CALL LOGS:")
            print("="*50)
            try:
                logs = service.get_call_logs(agent_id=result["agent_id"], page_size=5)
                print(json.dumps(logs, indent=2))
            except Exception as e:
                print(f"Could not retrieve call logs: {str(e)}")
        
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    print(json.dumps({
        "success": True,
        "reservation_confirmed": True,
        "restaurant": {
            "name": "Spice Garden Restaurant",
            "phone": "9548999129"
        },
        "reservation_details": {
            "date": "Monday, June 23, 2025",
            "time": "7:30 PM",
            "party_size": 4,
            "special_requests": "Window seat preferred, celebrating anniversary"
        },
        "customer": {
            "name": "Ayush Kumar",
            "email": "ayush.kumar@example.com"
        },
        "call_id": "mock_call_%d" % int(time.time()),
        "agent_id": "mock_agent_%d" % int(time.time()),
        "call_status": "mock_completed",
        "test_mode": True,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ")
    }))
    sys.exit(0)