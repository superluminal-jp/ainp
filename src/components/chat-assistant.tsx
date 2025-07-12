"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import ChatDisplay, { ChatMessage } from "./chat-display";
import ChatInput from "./chat-input";
import type {
  ToolSuggestion,
  PromptSuggestion,
  JSONParseResult,
  SchemaPropertyInput,
} from "@/lib/types";

import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Helper function to extract suggestions from natural language responses
// Helper function to sanitize and parse JSON safely
function safeJSONParse(jsonString: string): JSONParseResult {
  try {
    // Remove any leading/trailing whitespace
    jsonString = jsonString.trim();

    // Try to fix common JSON issues
    let cleanedJson = jsonString;

    // Remove any trailing commas before closing braces/brackets
    cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, "$1");

    // Try to escape unescaped quotes in string values
    // This is a simple heuristic - it won't catch all cases but helps with common issues
    cleanedJson = cleanedJson.replace(/("(?:[^"\\]|\\.)*)\\n/g, "$1\\\\n");

    console.log(
      "🔍 Attempting to parse JSON:",
      cleanedJson.substring(0, 300) + "..."
    );

    return JSON.parse(cleanedJson) as JSONParseResult;
  } catch (error) {
    console.error("❌ JSON parsing failed:", error);
    console.log("🔍 Failed JSON string:", jsonString.substring(0, 500) + "...");

    // Try one more time with a more aggressive cleanup
    try {
      // Extract just the JSON object structure
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let extracted = jsonMatch[0];

        // Remove problematic characters that might break JSON
        extracted = extracted.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

        console.log(
          "🔍 Attempting cleanup parse:",
          extracted.substring(0, 300) + "..."
        );
        return JSON.parse(extracted) as JSONParseResult;
      }
    } catch (cleanupError) {
      console.error("❌ Cleanup parsing also failed:", cleanupError);
    }

    throw error;
  }
}

function extractSuggestionsFromText(
  text: string
): ToolSuggestion | PromptSuggestion {
  // Enhanced pattern matching to extract suggestions from comprehensive AI responses
  const suggestions: Partial<ToolSuggestion & PromptSuggestion> = {};

  // Look for tool name suggestions
  const namePatterns = [
    /"name":\s*"([^"]+)"/i,
    /name[:\s]+["']([^"']+)["']/i,
    /tool.*name[:\s]*["']([^"']+)["']/i,
    /^([a-z_]+)\s*:/m, // Match function-like names at start of lines
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      suggestions.name = match[1];
      break;
    }
  }

  // Look for description suggestions
  const descriptionPatterns = [
    /"description":\s*"([^"]+)"/i,
    /description[:\s]+["']([^"']+)["']/i,
    /tool.*description[:\s]*["']([^"']+)["']/i,
    /A\s+([^.]+tool[^.]*\.)/, // Match sentences starting with "A" that mention "tool"
  ];

  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match) {
      (suggestions as ToolSuggestion).description = match[1];
      break;
    }
  }

  // Look for content suggestions (for prompts)
  const contentPatterns = [
    /"content":\s*"([^"]+)"/i,
    /content[:\s]+["']([^"']+)["']/i,
    /prompt[:\s]*["']([^"']+)["']/i,
  ];

  for (const pattern of contentPatterns) {
    const match = text.match(pattern);
    if (match) {
      (suggestions as PromptSuggestion).content = match[1];
      break;
    }
  }

  // Look for requirements suggestions
  const requirementsPatterns = [
    /"requirements":\s*"([^"]+)"/i,
    /requirements[:\s]*([^\n]+)/i,
    /pip install\s+([^\n]+)/i,
    /packages?[:\s]*([^\n]+)/i,
  ];

  for (const pattern of requirementsPatterns) {
    const match = text.match(pattern);
    if (match) {
      (suggestions as ToolSuggestion).requirements = match[1].trim();
      break;
    }
  }

  // Look for execution code suggestions
  const codePattern = /```python\s*([\s\S]*?)```/i;
  const codeMatch = text.match(codePattern);
  if (codeMatch) {
    (suggestions as ToolSuggestion).executionCode = codeMatch[1].trim();
  }

  // Look for input schema suggestions with multiple patterns
  const schemaPatterns = [
    /"inputSchema":\s*(\{[\s\S]*?\})/i,
    /\*\*Input Schema:\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/i,
    /Input Schema[:\s]*\n([\s\S]*?)(?=\n\*\*|$)/i,
    /\{[\s\S]*?"type":\s*"object"[\s\S]*?"properties"[\s\S]*?\}/i,
  ];

  for (const pattern of schemaPatterns) {
    const schemaMatch = text.match(pattern);
    if (schemaMatch) {
      try {
        let schemaText = schemaMatch[1] || schemaMatch[0];

        // Clean up the schema text
        schemaText = schemaText.trim();

        // If it's not starting with {, look for the JSON object within the match
        if (!schemaText.startsWith("{")) {
          const jsonMatch = schemaText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            schemaText = jsonMatch[0];
          }
        }

        const parsedSchema = JSON.parse(schemaText);
        if (parsedSchema.properties || parsedSchema.type === "object") {
          (suggestions as ToolSuggestion).inputSchema = parsedSchema;
          console.log("Extracted input schema:", parsedSchema);
          break;
        }
      } catch (e) {
        console.log("Failed to parse schema from pattern:", pattern, e);
        continue;
      }
    }
  }

  // If no schema found, try to extract individual properties
  if (!(suggestions as ToolSuggestion).inputSchema) {
    const propertyMatches = text.match(
      /"([^"]+)":\s*\{\s*"type":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"/g
    );
    if (propertyMatches && propertyMatches.length > 0) {
      const properties: Record<string, SchemaPropertyInput> = {};
      const required: string[] = [];

      propertyMatches.forEach((match) => {
        const propMatch = match.match(
          /"([^"]+)":\s*\{\s*"type":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"/
        );
        if (propMatch) {
          const [, name, type, description] = propMatch;
          properties[name] = { type, description };
          if (match.includes('"required"') || match.includes("required")) {
            required.push(name);
          }
        }
      });

      if (Object.keys(properties).length > 0) {
        (suggestions as ToolSuggestion).inputSchema = {
          type: "object",
          properties,
          required,
        };
      }
    }
  }

  return suggestions as ToolSuggestion | PromptSuggestion;
}

interface ChatAssistantProps {
  title: string;
  placeholder?: string;
  systemPrompt: string;
  onSuggestionReceived?: (
    suggestion: ToolSuggestion | PromptSuggestion
  ) => void;
  className?: string;
  suggestionType?: "tool" | "prompt"; // Add type to determine response format
}

export default function ChatAssistant({
  title,
  placeholder = "Ask for help with creating or improving your content...",
  systemPrompt,
  onSuggestionReceived,
  className = "",
  suggestionType = "tool",
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string, files?: File[]) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      role: "user",
      timestamp: new Date(),
      files,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    try {
      // Call Bedrock AI assistant
      const requestPayload = {
        messages: [...messages, newMessage].map((msg) => ({
          role: msg.role,
          text: msg.text.trim(),
          timestamp: msg.timestamp.toISOString(),
        })),
        systemPrompt:
          systemPrompt +
          "\n\n**IMPORTANT: Return your response as a valid JSON object that matches the exact schema specified in the prompt. Do not include any additional text, formatting, or explanation outside of the JSON object.**",
        modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
        databaseIds: [],
        useTools: false,
        selectedToolIds: [],
        // Note: AWS Bedrock doesn't support responseFormat parameter
        // We rely on enhanced system prompt for structured output
        forceStructuredOutput: true, // Custom flag to indicate we want structured output
      };

      const result = await client.queries.chatWithBedrockTools(requestPayload);

      if (result.errors && result.errors.length > 0) {
        throw new Error(
          `AI Assistant Error: ${result.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (result.data) {
        const responseData = result.data;
        let aiResponseText = responseData.response || "I'm here to help!";

        // Handle structured output response
        try {
          console.log("🔍 Raw AI response:", aiResponseText);
          console.log(
            "🔍 Response data structuredOutput flag:",
            responseData.structuredOutput
          );
          console.log(
            "🔍 Request used structured output:",
            requestPayload.forceStructuredOutput
          );

          // If structured output was used, the response should already be valid JSON
          if (responseData.structuredOutput) {
            console.log("✅ Using structured output response");

            // Clean and parse the JSON response
            let cleanedResponseText = aiResponseText;

            // Try to extract JSON from the response if it's wrapped in text
            const jsonMatch = cleanedResponseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cleanedResponseText = jsonMatch[0];
            }

            console.log(
              "🔍 Cleaned response text:",
              cleanedResponseText.substring(0, 500) + "..."
            );

            const parsedResponse = safeJSONParse(cleanedResponseText);

            // Apply structured response directly
            if (onSuggestionReceived) {
              console.log(
                "✅ Applying structured suggestions:",
                parsedResponse
              );
              onSuggestionReceived(
                parsedResponse as ToolSuggestion | PromptSuggestion
              );
              toast.success("Structured output applied successfully!", {
                description: `${suggestionType === "tool" ? "Tool" : "Prompt"} form populated with AI suggestions`,
              });
            }

            // Create a friendly response message
            const suggestionTypeText =
              suggestionType === "tool" ? "tool" : "prompt";
            aiResponseText = `✨ I've created a ${suggestionTypeText} suggestion using structured output! The form should now be populated with the following:\n\n`;

            if (
              parsedResponse.name &&
              typeof parsedResponse.name === "string"
            ) {
              aiResponseText += `📝 **Name:** ${parsedResponse.name}\n`;
            }
            if (
              parsedResponse.description &&
              typeof parsedResponse.description === "string"
            ) {
              aiResponseText += `📋 **Description:** ${parsedResponse.description.substring(0, 100)}${parsedResponse.description.length > 100 ? "..." : ""}\n`;
            }
            if (
              parsedResponse.content &&
              typeof parsedResponse.content === "string"
            ) {
              aiResponseText += `📝 **Content:** ${parsedResponse.content.substring(0, 100)}${parsedResponse.content.length > 100 ? "..." : ""}\n`;
            }
            if (
              parsedResponse.inputSchema &&
              typeof parsedResponse.inputSchema === "object"
            ) {
              const inputSchema = parsedResponse.inputSchema as {
                properties?: Record<string, unknown>;
              };
              const propCount = Object.keys(
                inputSchema.properties || {}
              ).length;
              aiResponseText += `⚙️ **Input Schema:** ${propCount} properties defined\n`;
            }
            if (
              parsedResponse.executionCode &&
              typeof parsedResponse.executionCode === "string"
            ) {
              aiResponseText += `💻 **Execution Code:** ${parsedResponse.executionCode.split("\n").length} lines of Python code\n`;
            }
            if (
              parsedResponse.requirements &&
              typeof parsedResponse.requirements === "string"
            ) {
              const packages = parsedResponse.requirements
                .split("\n")
                .filter((p: string) => p.trim());
              aiResponseText += `📦 **Requirements:** ${packages.length} packages\n`;
            }

            aiResponseText += `\n🎯 **Structured Output Success!** You can review and modify the generated content before saving. Let me know if you need any adjustments!`;
          } else {
            console.log("⚠️ Fallback: Using manual JSON parsing");
            // Fallback to manual JSON extraction for non-structured responses
            let jsonText = aiResponseText;
            const codeBlockMatch = aiResponseText.match(
              /```(?:json)?\s*([\s\S]*?)```/
            );
            if (codeBlockMatch) {
              jsonText = codeBlockMatch[1].trim();
              console.log(
                "🔍 Extracted JSON from code block:",
                jsonText.substring(0, 200) + "..."
              );
            } else {
              // Try to extract JSON object from the text
              const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                jsonText = jsonMatch[0];
                console.log(
                  "🔍 Extracted JSON from text:",
                  jsonText.substring(0, 200) + "..."
                );
              }
            }

            const parsedResponse = safeJSONParse(jsonText);

            const response = parsedResponse as ToolSuggestion &
              PromptSuggestion & {
                message?: string;
                suggestions?: ToolSuggestion | PromptSuggestion;
                tips?: string[];
              };

            // Check if it's a direct tool/prompt suggestion JSON object
            if (
              response.name ||
              response.description ||
              response.content ||
              response.inputSchema ||
              response.executionCode
            ) {
              // This is a direct suggestion object - use it directly
              if (onSuggestionReceived) {
                onSuggestionReceived(response);
              }

              // Create a friendly response message
              const suggestionType = response.inputSchema ? "tool" : "prompt";
              aiResponseText = `I've created a ${suggestionType} suggestion for you! The form should now be populated with the following:\n\n`;

              if (response.name) {
                aiResponseText += `📝 **Name:** ${response.name}\n`;
              }
              if (response.description) {
                aiResponseText += `📋 **Description:** ${response.description.substring(0, 100)}${response.description.length > 100 ? "..." : ""}\n`;
              }
              if (response.content) {
                aiResponseText += `📝 **Content:** ${response.content.substring(0, 100)}${response.content.length > 100 ? "..." : ""}\n`;
              }
              if (response.inputSchema) {
                const propCount = Object.keys(
                  response.inputSchema.properties || {}
                ).length;
                aiResponseText += `⚙️ **Input Schema:** ${propCount} properties defined\n`;
              }
              if (response.executionCode) {
                aiResponseText += `💻 **Execution Code:** ${response.executionCode.split("\n").length} lines of Python code\n`;
              }
              if (response.requirements) {
                const packages = response.requirements
                  .split("\n")
                  .filter((p: string) => p.trim());
                aiResponseText += `📦 **Requirements:** ${packages.length} packages\n`;
              }

              aiResponseText += `\nYou can review and modify the generated content before saving. Let me know if you need any adjustments!`;
            } else if (response.message) {
              // Legacy format with message wrapper
              aiResponseText = response.message;

              // Handle suggestions
              if (response.suggestions && onSuggestionReceived) {
                onSuggestionReceived(response.suggestions);
              }

              // Add tips to the response
              if (response.tips && response.tips.length > 0) {
                aiResponseText +=
                  "\n\n💡 **Tips:**\n" +
                  response.tips.map((tip: string) => `• ${tip}`).join("\n");
              }
            }
          }
        } catch (parseError) {
          // If parsing fails, try to extract suggestions from natural language response
          console.error("❌ JSON parsing failed:", parseError);
          console.log("🔍 Original AI response:", aiResponseText);
          console.log("🔍 Using fallback extraction method");

          // Show user-friendly error message
          toast.error("JSON parsing failed", {
            description:
              "Attempting to extract suggestions from natural language response...",
          });

          // Try to extract suggestions from natural language response
          // This is a fallback method when structured output isn't available
          if (onSuggestionReceived) {
            const suggestions = extractSuggestionsFromText(aiResponseText);
            if (suggestions) {
              console.log(
                "✅ Extracted suggestions via fallback:",
                suggestions
              );
              onSuggestionReceived(suggestions);
              toast.success("Suggestions extracted successfully!", {
                description:
                  "Used fallback extraction method to parse AI response",
              });
            } else {
              console.log("❌ No suggestions found via fallback");
              toast.warning("No suggestions extracted", {
                description:
                  "Unable to extract structured suggestions from AI response",
              });
            }
          }
        }

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);
        toast.success("AI suggestion received!");
      } else {
        throw new Error("No response received from AI assistant");
      }
    } catch (error) {
      console.error("Error calling AI assistant:", error);

      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error while processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
      toast.error("Failed to get AI assistance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the message and regenerate response
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.role === "user") {
        // Remove the assistant message and regenerate
        setMessages((prev) => prev.slice(0, messageIndex));
        await handleSendMessage(
          previousUserMessage.text,
          previousUserMessage.files
        );
      }
    }
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 p-3">
        {/* Chat Display */}
        <div className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Ask me anything to get started!
                </p>
                <p className="text-xs text-muted-foreground">
                  I can help you create and improve your content.
                </p>
              </div>
            </div>
          ) : (
            <ChatDisplay
              messages={messages}
              isTyping={isLoading}
              onRegenerate={handleRegenerate}
              className="p-0"
            />
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={placeholder}
          disabled={isLoading}
          allowFileAttach={false}
        />
      </CardContent>
    </Card>
  );
}
