from omnidimension import Client
client = Client("Zxw_8n3uvfGKhHMHv9jZwu5z0FncESPNnMjZC0R14J0")

# Get details of a specific agent


# List all agents with pagination
response = client.agent.list(page=1, page_size=10)
print(response)
print(response)