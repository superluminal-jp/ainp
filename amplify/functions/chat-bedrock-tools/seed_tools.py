#!/usr/bin/env python3
"""
Script to seed the toolSpecs DynamoDB table with default tools.
This should be run after deployment to populate the table with initial tools.
"""

import boto3
from datetime import datetime
import sys


def get_default_tools():
    """Get the default tool specifications."""
    return [
        {
            "name": "web_search",
            "description": "Search the web for current information about a topic",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up on the web",
                    }
                },
                "required": ["query"],
            },
            "category": "search",
            "isActive": True,
        },
        {
            "name": "calculator",
            "description": "Perform mathematical calculations",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate "
                        + "(e.g., '2 + 3 * 4', 'sqrt(16)', 'sin(pi/2)')",
                    }
                },
                "required": ["expression"],
            },
            "category": "utility",
            "isActive": True,
        },
        {
            "name": "get_current_time",
            "description": "Get the current date and time. Use this tool whenever the user asks for "
            + "the current time, date, or 'what time is it'.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Timezone to get time for (e.g., 'UTC', 'US/Eastern'). Defaults to UTC.",
                    }
                },
            },
            "category": "utility",
            "isActive": True,
        },
        {
            "name": "search_documents",
            "description": "Search through uploaded documents in vector databases",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query to find relevant documents",
                    },
                    "database_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of database IDs to search in",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of top results to return (default: 5)",
                    },
                },
                "required": ["query", "database_ids"],
            },
            "category": "search",
            "isActive": True,
        },
    ]


def seed_tools(table_name, aws_profile=None):
    """Seed the toolSpecs table with default tools."""
    try:
        # Initialize DynamoDB resource
        session = (
            boto3.Session(profile_name=aws_profile) if aws_profile else boto3.Session()
        )
        dynamodb = session.resource("dynamodb")
        table = dynamodb.Table(table_name)

        tools = get_default_tools()
        current_time = datetime.utcnow().isoformat()

        print(f"Seeding {len(tools)} tools into table {table_name}...")

        for tool in tools:
            # Check if tool already exists
            try:
                response = table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr("name").eq(
                        tool["name"]
                    )
                )
                if response["Items"]:
                    print(f"Tool '{tool['name']}' already exists, skipping...")
                    continue
            except Exception as e:
                print(f"Error checking for existing tool '{tool['name']}': {str(e)}")
                continue

            # Add tool to table
            item = {
                "name": tool["name"],
                "description": tool["description"],
                "inputSchema": tool["inputSchema"],
                "category": tool["category"],
                "isActive": tool["isActive"],
                "createdAt": current_time,
                "updatedAt": current_time,
            }

            try:
                table.put_item(Item=item)
                print(f"✓ Added tool: {tool['name']}")
            except Exception as e:
                print(f"✗ Error adding tool '{tool['name']}': {str(e)}")

        print("Tool seeding completed!")

    except Exception as e:
        print(f"Error seeding tools: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Seed toolSpecs DynamoDB table with default tools"
    )
    parser.add_argument("table_name", help="DynamoDB table name for toolSpecs")
    parser.add_argument("--profile", help="AWS profile to use (optional)")

    args = parser.parse_args()

    seed_tools(args.table_name, args.profile)
