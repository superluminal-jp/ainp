export interface Message {
  id: string;
  timestamp: Date;
  role: "user" | "assistant";
  text: string;
  files?: File[];
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export interface Database {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  pythonCodeKey: string;
  requirementsKey?: string;
  isActive: boolean;
  createdAt: Date;
  owner?: string;
}

export interface ToolParameter {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  databases: string[];
  tools: string[];
}

export interface GeneratedPage {
  id: string;
  name: string;
  path: string;
  template: string;
  customCode: string;
  createdAt: Date;
  description: string;
}

export interface BedrockToolSpec {
  toolSpec: {
    name: string;
    description: string;
    inputSchema?: {
      json: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
        additionalProperties?: boolean;
      };
    };
  };
}

// バリデーション関数
export function validateToolParameter(param: unknown): param is ToolParameter {
  return (
    param !== null &&
    param !== undefined &&
    typeof param === "object" &&
    typeof (param as ToolParameter).id === "string" &&
    typeof (param as ToolParameter).name === "string" &&
    (param as ToolParameter).name.trim().length > 0 &&
    ["string", "number", "boolean", "array", "object"].includes(
      (param as ToolParameter).type
    ) &&
    typeof (param as ToolParameter).description === "string" &&
    typeof (param as ToolParameter).required === "boolean"
  );
}

export function validateTool(tool: unknown): tool is Tool {
  return (
    tool !== null &&
    tool !== undefined &&
    typeof tool === "object" &&
    typeof (tool as Tool).id === "string" &&
    typeof (tool as Tool).name === "string" &&
    (tool as Tool).name.trim().length > 0 &&
    typeof (tool as Tool).description === "string" &&
    (tool as Tool).description.trim().length > 0 &&
    Array.isArray((tool as Tool).parameters) &&
    (tool as Tool).parameters.every(validateToolParameter) &&
    typeof (tool as Tool).pythonCodeKey === "string" &&
    (tool as Tool).pythonCodeKey.trim().length > 0 &&
    typeof (tool as Tool).isActive === "boolean"
  );
}

export function normalizeToolParameters(
  rawParameters: unknown
): ToolParameter[] {
  console.log("🔧 [Types] Normalizing tool parameters:", {
    input: rawParameters,
    type: typeof rawParameters,
    isArray: Array.isArray(rawParameters),
  });

  if (!rawParameters) {
    console.log("🔧 [Types] No parameters provided, returning empty array");
    return [];
  }

  let params: unknown[] = [];

  // Handle different input formats
  if (typeof rawParameters === "string") {
    try {
      params = JSON.parse(rawParameters);
    } catch (error) {
      console.error("❌ [Types] Failed to parse parameters JSON:", error);
      return [];
    }
  } else if (Array.isArray(rawParameters)) {
    params = rawParameters;
  } else {
    console.warn(
      "⚠️ [Types] Parameters is not string or array:",
      typeof rawParameters
    );
    return [];
  }

  if (!Array.isArray(params)) {
    console.warn(
      "⚠️ [Types] Parsed parameters is not an array:",
      typeof params
    );
    return [];
  }

  const normalized = params
    .map((param, index) => {
      console.log(`🔧 [Types] Processing parameter ${index + 1}:`, param);

      if (!param || typeof param !== "object") {
        console.warn(`⚠️ [Types] Parameter ${index + 1} is invalid:`, param);
        return null;
      }

      const p = param as Record<string, unknown>;

      const normalized: ToolParameter = {
        id: typeof p.id === "string" ? p.id : `param_${index}_${Date.now()}`,
        name: (typeof p.name === "string" ? p.name : "").trim(),
        type: ["string", "number", "boolean", "array", "object"].includes(
          p.type as string
        )
          ? (p.type as ToolParameter["type"])
          : "string",
        description: (typeof p.description === "string"
          ? p.description
          : ""
        ).trim(),
        required: Boolean(p.required),
        defaultValue: p.defaultValue !== undefined ? p.defaultValue : undefined,
      };

      // Validate the normalized parameter
      if (!validateToolParameter(normalized)) {
        console.warn(
          `⚠️ [Types] Parameter ${index + 1} failed validation:`,
          normalized
        );
        return null;
      }

      console.log(
        `✅ [Types] Parameter ${index + 1} normalized successfully:`,
        normalized
      );
      return normalized;
    })
    .filter((param): param is ToolParameter => param !== null);

  console.log(
    `🎉 [Types] Normalized ${normalized.length}/${params.length} parameters successfully`
  );
  return normalized;
}

export function createBedrockToolSpec(tool: Tool): BedrockToolSpec | null {
  console.log("🔧 [Types] Creating Bedrock tool spec for:", tool.name);

  if (!validateTool(tool)) {
    console.error("❌ [Types] Tool validation failed:", tool);
    return null;
  }

  const toolSpec: BedrockToolSpec = {
    toolSpec: {
      name: `custom_tool_${tool.id}`,
      description: tool.description,
    },
  };

  // Only add inputSchema if there are valid parameters
  if (tool.parameters.length > 0) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    tool.parameters.forEach((param) => {
      if (!param.name.trim()) {
        console.warn("⚠️ [Types] Skipping parameter with empty name:", param);
        return;
      }

      // Map tool parameter types to JSON schema types
      const jsonType =
        {
          string: "string",
          number: "number",
          boolean: "boolean",
          array: "array",
          object: "object",
        }[param.type] || "string";

      properties[param.name] = {
        type: jsonType,
        description: param.description || `Parameter ${param.name}`,
      };

      if (param.required) {
        required.push(param.name);
      }

      console.log(
        `✅ [Types] Added parameter ${param.name} (type: ${jsonType}, required: ${param.required})`
      );
    });

    if (Object.keys(properties).length > 0) {
      toolSpec.toolSpec.inputSchema = {
        json: {
          type: "object",
          properties,
          ...(required.length > 0 && { required }),
          additionalProperties: false,
        },
      };
      console.log(
        `✅ [Types] Created input schema with ${Object.keys(properties).length} properties`
      );
    }
  } else {
    console.log("ℹ️ [Types] Tool has no parameters, omitting inputSchema");
  }

  console.log(
    "🎉 [Types] Bedrock tool spec created successfully:",
    JSON.stringify(toolSpec, null, 2)
  );
  return toolSpec;
}
