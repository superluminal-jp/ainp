"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSimpleHeader } from "@/components/use-page-header";
import { AppHeader } from "@/components/app-header";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import ChatInput from "@/components/chat-input";
import ChatDisplay, { type ChatMessage } from "@/components/chat-display";
import {
  Target,
  Users,
  Clock,
  CheckCircle,
  Wrench,
  Database,
} from "lucide-react";
import type { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

export default function UseCaseBuilderPage() {
  useSimpleHeader(
    "Use Case Builder",
    "AI Neural Platform - Use Case Definition and Requirements Gathering"
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (message: string, files?: File[]) => {
    if (!message.trim()) {
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      role: "user",
      timestamp: new Date(),
      files,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    try {
      const systemPrompt = `You are an expert AI consultant specializing in use case analysis and requirements gathering. 

## DECISION TREE FRAMEWORK
Use this decision tree to determine the optimal AI utilization stage:
1. **Stage 3 (Tool Integration)**: Must execute deterministic actions (API, DB, code)
2. **Stage 2 (RAG)**: Require up-to-date or traceable domain knowledge
3. **Stage 1 (System Prompt Control)**: Need stable persona, structured format, or strict policy guardrails
4. **Stage 0 (LLM-only)**: Default fallback for creative tasks

## REFERENCE DATA

### Typical Use Case Classifications:
${usecaseData.map((item) => `- **${item.id}**: ${item.use} → Stage ${item.stage} (${item.reason})`).join("\n")}

### Motivation-based Classifications:
${motivationData.map((item) => `- **${item.id}**: ${item.motivation} → Stage ${item.stage} (${item.reason})`).join("\n")}

### Key Hearing Areas to Consider:
${hearingItems.map((item) => `- **${item.title}**: ${item.items.join(", ")}`).join("\n")}

### Recommended Questions for Analysis:
${questionExamples.map((category) => `**${category.category}**:\n${category.questions.map((q) => `- ${q}`).join("\n")}`).join("\n\n")}

### Relevant Frameworks:
${frameworks.map((framework) => `- ${framework}`).join("\n")}

## YOUR ANALYSIS TASK

Analyze the user's use case and provide a comprehensive response including:

1. **Stage Assessment**: Determine the optimal AI utilization stage (0-3) with clear reasoning
2. **Use Case Classification**: Match against typical use cases and motivations
3. **Requirements Analysis**: Identify key requirements from the hearing areas
4. **Implementation Strategy**: Recommend specific frameworks and approaches
5. **Follow-up Questions**: Suggest relevant questions from the question examples
6. **Risk Assessment**: Identify potential challenges and mitigation strategies

Structure your response clearly with headings and bullet points for easy reading.`;

      const requestPayload = {
        messages: [...messages, newMessage].map((msg) => ({
          role: msg.role,
          text: msg.text.trim(),
          timestamp: msg.timestamp.toISOString(),
        })),
        systemPrompt: systemPrompt,
        modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
        databaseIds: [],
        useTools: false,
        selectedToolIds: [],
      };

      const result = await client.queries.chatWithBedrockTools(requestPayload);

      if (result.errors && result.errors.length > 0) {
        throw new Error(
          `AI Analysis Error: ${result.errors.map((e) => e.message).join(", ")}`
        );
      }

      if (result.data) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.data.response,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error("No response received from AI");
      }
    } catch (error) {
      console.error("Error analyzing use case:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Error analyzing use case: ${error instanceof Error ? error.message : "Unknown error"}`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the user message that preceded this AI response
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex > 0 && messages[messageIndex - 1].role === "user") {
      const userMessage = messages[messageIndex - 1];

      // Remove the current AI response and regenerate
      setMessages((prev) => prev.slice(0, messageIndex));
      setIsTyping(true);

      try {
        const systemPrompt = `You are an expert AI consultant specializing in use case analysis and requirements gathering. 

## DECISION TREE FRAMEWORK
Use this decision tree to determine the optimal AI utilization stage:
1. **Stage 3 (Tool Integration)**: Must execute deterministic actions (API, DB, code)
2. **Stage 2 (RAG)**: Require up-to-date or traceable domain knowledge
3. **Stage 1 (System Prompt Control)**: Need stable persona, structured format, or strict policy guardrails
4. **Stage 0 (LLM-only)**: Default fallback for creative tasks

## REFERENCE DATA

### Typical Use Case Classifications:
${usecaseData.map((item) => `- **${item.id}**: ${item.use} → Stage ${item.stage} (${item.reason})`).join("\n")}

### Motivation-based Classifications:
${motivationData.map((item) => `- **${item.id}**: ${item.motivation} → Stage ${item.stage} (${item.reason})`).join("\n")}

### Key Hearing Areas to Consider:
${hearingItems.map((item) => `- **${item.title}**: ${item.items.join(", ")}`).join("\n")}

### Recommended Questions for Analysis:
${questionExamples.map((category) => `**${category.category}**:\n${category.questions.map((q) => `- ${q}`).join("\n")}`).join("\n\n")}

### Relevant Frameworks:
${frameworks.map((framework) => `- ${framework}`).join("\n")}

## YOUR ANALYSIS TASK

Analyze the user's use case and provide a comprehensive response including:

1. **Stage Assessment**: Determine the optimal AI utilization stage (0-3) with clear reasoning
2. **Use Case Classification**: Match against typical use cases and motivations
3. **Requirements Analysis**: Identify key requirements from the hearing areas
4. **Implementation Strategy**: Recommend specific frameworks and approaches
5. **Follow-up Questions**: Suggest relevant questions from the question examples
6. **Risk Assessment**: Identify potential challenges and mitigation strategies

Structure your response clearly with headings and bullet points for easy reading.`;

        const requestPayload = {
          messages: [
            {
              role: userMessage.role,
              text: userMessage.text.trim(),
              timestamp: userMessage.timestamp.toISOString(),
            },
          ],
          systemPrompt: systemPrompt,
          modelId: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
          databaseIds: [],
          useTools: false,
          selectedToolIds: [],
        };

        const result =
          await client.queries.chatWithBedrockTools(requestPayload);

        if (result.errors && result.errors.length > 0) {
          throw new Error(
            `AI Analysis Error: ${result.errors.map((e) => e.message).join(", ")}`
          );
        }

        if (result.data) {
          const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            text: result.data.response,
            role: "assistant",
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiMessage]);
        } else {
          throw new Error("No response received from AI");
        }
      } catch (error) {
        console.error("Error regenerating response:", error);
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `Error regenerating response: ${error instanceof Error ? error.message : "Unknown error"}`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const mermaidChart = `
flowchart TD
    %% ─── Decision tree for selecting the minimal sufficient layer ───
    START([Define task<br/>• Accuracy target<br/>• Freshness need<br/>• Side-effects<br/>• Compliance])

    %% First decision: deterministic external action?
    A{Must execute<br/>deterministic action<br/>API, DB, code?}
    START --> A
    A -- Yes --> TOOL[**Stage 3 Tool Integration**]

    %% Second decision: freshness / traceability
    A -- No --> B{Require up-to-date or<br/>traceable domain<br/>knowledge?}
    B -- Yes --> RAG[**Stage 2 Retrieval-Augmented Generation**]

    %% Third decision: persona / format / policy
    B -- No --> C{Need stable persona,<br/>structured format, or<br/>strict policy guardrails?}
    C -- Yes --> SYS[**Stage 1 System Prompt Control**]

    %% Default fallback
    C -- No --> LLM[**Stage 0 LLM-only**]

    %% Styling
    classDef stage fill:#f9f9f9,stroke:#333,stroke-width:1.1px,font-weight:bold;
    class TOOL,RAG,SYS,LLM stage;
  `;

  const usecaseData = [
    {
      id: "QNA",
      use: "Search-equivalent accuracy with citations required",
      stage: "2",
      reason: "Fresh, verifiable knowledge required → RAG",
    },
    {
      id: "GEN",
      use: "Plain text generation",
      stage: "0",
      reason: "Emphasizes creativity, tolerates errors",
    },
    {
      id: "SUM",
      use: "Summarization and translation",
      stage: "0",
      reason: "Fits within simultaneous source input",
    },
    {
      id: "CODE",
      use: "Code generation",
      stage: "0",
      reason: "Execution verified by developers",
    },
    {
      id: "EDU",
      use: "Educational material creation",
      stage: "1",
      reason: "Stable expression and persona",
    },
    {
      id: "CRE",
      use: "Poetry and storytelling",
      stage: "0",
      reason: "Creativity priority",
    },
    {
      id: "TASK",
      use: "TODO operations, schedule registration",
      stage: "3",
      reason: "Acts on external systems",
    },
    {
      id: "DISC",
      use: "Casual conversation and emotional care",
      stage: "1",
      reason: "Consistent character",
    },
    {
      id: "META",
      use: "LLM operation explanation",
      stage: "0",
      reason: "Complete with internal knowledge",
    },
  ];

  const motivationData = [
    {
      id: "INF",
      motivation: "Fact acquisition",
      stage: "2",
      reason: "Source required, latest information",
    },
    {
      id: "PROD",
      motivation: "Productivity improvement",
      stage: "1",
      reason: "Structured output, safety",
    },
    {
      id: "LEARN",
      motivation: "Learning support",
      stage: "1",
      reason: "Explanation consistency",
    },
    {
      id: "EXP",
      motivation: "Creative expression",
      stage: "0",
      reason: "Immediate generation",
    },
    {
      id: "EMO",
      motivation: "Emotional processing",
      stage: "1",
      reason: "Tone management",
    },
    {
      id: "PLAY",
      motivation: "Entertainment",
      stage: "0",
      reason: "Flexibility priority",
    },
    {
      id: "SYS",
      motivation: "System usage",
      stage: "0",
      reason: "Meta information only",
    },
  ];

  const hearingItems = [
    {
      title: "Current Business Flow Understanding",
      icon: Users,
      items: [
        "Detailed description of current business processes",
        "Key personnel involved in the business and their roles",
        "Tools and systems currently in use",
        "Time and effort required for each process",
      ],
    },
    {
      title: "Issue Identification",
      icon: Target,
      items: [
        "Major bottlenecks in business operations",
        "Duplicate work and wasteful processes",
        "Areas prone to mistakes",
        "Identification of time-consuming tasks",
      ],
    },
    {
      title: "Improvement Request Collection",
      icon: CheckCircle,
      items: [
        "Specific improvement proposals from the field",
        "Priority items for improvement",
        "Image of ideal business flow",
        "Expected improvement effects",
      ],
    },
    {
      title: "System Requirements Confirmation",
      icon: Wrench,
      items: [
        "Required functional and performance requirements",
        "Security requirements",
        "Integration requirements with other systems",
        "Data migration necessity",
      ],
    },
    {
      title: "Constraint Conditions Confirmation",
      icon: Clock,
      items: [
        "Budget constraints",
        "Time constraints",
        "Technical constraints",
        "Legal and compliance requirements",
      ],
    },
    {
      title: "Evaluation Metrics Setting",
      icon: Database,
      items: [
        "Quantitative targets for efficiency improvement",
        "Quality improvement indicators",
        "Cost reduction targets",
        "ROI calculation methods",
      ],
    },
  ];

  const questionExamples = [
    {
      category: "Current Business Flow Understanding",
      questions: [
        "Could you explain your daily business flow in chronological order?",
        "Please tell us specifically about work that requires collaboration between departments.",
      ],
    },
    {
      category: "Issue Identification",
      questions: [
        "What are the most time-consuming processes in your business operations?",
        "Please tell us about tasks where mistakes often occur and their causes.",
      ],
    },
    {
      category: "Improvement Request Collection",
      questions: [
        "If there were an ideal business environment, what aspects would be improved?",
        "Are there any tasks that could be automated? Please be specific.",
      ],
    },
    {
      category: "System Requirements Confirmation",
      questions: [
        "What are the minimum required functions for the new system?",
        "How frequently do you need data backups?",
      ],
    },
    {
      category: "Constraint Conditions Confirmation",
      questions: [
        "What is the timeline outlook for system implementation?",
        "Are there any industry standards or regulations that must be complied with?",
      ],
    },
    {
      category: "Evaluation Metrics Setting",
      questions: [
        "How much time reduction do you specifically expect from business efficiency improvements?",
        "Are cost reduction targets set?",
      ],
    },
  ];

  const frameworks = [
    "Lean Six Sigma: Continuous improvement through DMAIC (Define–Measure–Analyze–Improve–Control)",
    "Business Process Model and Notation (BPMN): Business flow visualization using standard notation",
    "Value Stream Mapping (VSM): Waste elimination through value-added analysis",
    "Theory of Constraints (TOC): Bottleneck identification and throughput optimization",
    "RPA Framework: Structured automation utilizing UiPath and Automation Anywhere",
    "Agile / Scrum: Requirement adjustment through iterative PoC and feedback",
    "Design Thinking: Process design emphasizing user understanding and idea validation",
  ];

  return (
    <>
      <AppHeader />
      <div className="flex-1 flex flex-col bg-background p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Use Case Definition and Requirements Gathering
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Clarify the processes users want to execute and tasks they want to
            complete, and determine the optimal AI utilization stage
          </p>
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              AI analysis includes: Decision tree framework,{" "}
              {usecaseData.length} use case classifications,{" "}
              {motivationData.length} motivation types, {hearingItems.length}{" "}
              hearing areas, and {frameworks.length} frameworks
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 min-h-[400px]">
            <ChatDisplay
              messages={messages}
              isTyping={isTyping}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
            />
          </div>
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            placeholder="Describe your use case in detail. Include business context, goals, current processes, and specific requirements or constraints..."
          />
        </div>

        <Tabs defaultValue="decision-tree" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="decision-tree">Decision Tree</TabsTrigger>
            <TabsTrigger value="usecase-tables">
              Use Case Classification
            </TabsTrigger>
            <TabsTrigger value="hearing">Hearing Items</TabsTrigger>
            <TabsTrigger value="questions">Question Examples</TabsTrigger>
            <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          </TabsList>

          <TabsContent value="decision-tree" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Utilization Stage Decision Flowchart</CardTitle>
                <CardDescription>
                  Decision tree for determining the optimal AI utilization stage
                  based on task characteristics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MermaidDiagram chart={mermaidChart} className="w-full" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usecase-tables" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Typical Use Case Classification</CardTitle>
                  <CardDescription>
                    Minimum stage and reasoning by use case
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Use Case</th>
                          <th className="text-left p-2">Stage</th>
                          <th className="text-left p-2">Reasoning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usecaseData.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-2">
                              <Badge variant="outline">{item.id}</Badge>
                            </td>
                            <td className="p-2">{item.use}</td>
                            <td className="p-2">
                              <Badge variant="secondary">{item.stage}</Badge>
                            </td>
                            <td className="p-2 text-xs">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Motivation-based Classification</CardTitle>
                  <CardDescription>
                    Minimum stage and reasoning by motivation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Motivation</th>
                          <th className="text-left p-2">Stage</th>
                          <th className="text-left p-2">Reasoning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {motivationData.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="p-2">
                              <Badge variant="outline">{item.id}</Badge>
                            </td>
                            <td className="p-2">{item.motivation}</td>
                            <td className="p-2">
                              <Badge variant="secondary">{item.stage}</Badge>
                            </td>
                            <td className="p-2 text-xs">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hearing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Business Efficiency Use Case Hearing Items
                </CardTitle>
                <CardDescription>
                  Systematic hearing items for system implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hearingItems.map((category, index) => {
                    const Icon = category.icon;
                    return (
                      <Card key={index}>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Icon className="h-5 w-5" />
                            {category.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {category.items.map((item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <span className="text-primary">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hearing Question Examples</CardTitle>
                <CardDescription>
                  Specific question examples corresponding to each category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {questionExamples.map((category, index) => (
                    <div key={index}>
                      <h3 className="font-semibold text-lg mb-3 text-primary">
                        {category.category}
                      </h3>
                      <div className="space-y-2">
                        {category.questions.map((question, qIndex) => (
                          <div
                            key={qIndex}
                            className="p-3 bg-muted/50 rounded-md"
                          >
                            <p className="text-sm">
                              <span className="font-medium text-primary">
                                Q:{" "}
                              </span>
                              {question}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frameworks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Reference Theories, Frameworks, and Methods
                </CardTitle>
                <CardDescription>
                  Proven methodologies for business efficiency improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {frameworks.map((framework, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold text-primary">
                          {framework.split(":")[0]}
                        </span>
                        {framework.includes(":") && (
                          <>: {framework.split(":").slice(1).join(":")}</>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
