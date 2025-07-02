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
  defaultValue?: any;
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
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
      };
    };
  };
}

// バリデーション関数
export function validateToolParameter(param: any): param is ToolParameter {
  return (
    param &&
    typeof param === "object" &&
    typeof param.id === "string" &&
    typeof param.name === "string" &&
    param.name.trim().length > 0 &&
    ["string", "number", "boolean", "array", "object"].includes(param.type) &&
    typeof param.description === "string" &&
    typeof param.required === "boolean"
  );
}

export function validateTool(tool: any): tool is Tool {
  return (
    tool &&
    typeof tool === "object" &&
    typeof tool.id === "string" &&
    typeof tool.name === "string" &&
    tool.name.trim().length > 0 &&
    typeof tool.description === "string" &&
    tool.description.trim().length > 0 &&
    Array.isArray(tool.parameters) &&
    tool.parameters.every(validateToolParameter) &&
    typeof tool.pythonCodeKey === "string" &&
    tool.pythonCodeKey.trim().length > 0 &&
    typeof tool.isActive === "boolean"
  );
}

export function normalizeToolParameters(rawParameters: any): ToolParameter[] {
  console.log("🔧 [Types] Normalizing tool parameters:", {
    input: rawParameters,
    type: typeof rawParameters,
    isArray: Array.isArray(rawParameters),
  });

  if (!rawParameters) {
    console.log("🔧 [Types] No parameters provided, returning empty array");
    return [];
  }

  let params: any[] = [];
  
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
    console.warn("⚠️ [Types] Parameters is not string or array:", typeof rawParameters);
    return [];
  }

  if (!Array.isArray(params)) {
    console.warn("⚠️ [Types] Parsed parameters is not an array:", typeof params);
    return [];
  }

  const normalized = params
    .map((param, index) => {
      console.log(`🔧 [Types] Processing parameter ${index + 1}:`, param);
      
      if (!param || typeof param !== "object") {
        console.warn(`⚠️ [Types] Parameter ${index + 1} is invalid:`, param);
        return null;
      }

      const normalized: ToolParameter = {
        id: param.id || `param_${index}_${Date.now()}`,
        name: (param.name || "").trim(),
        type: ["string", "number", "boolean", "array", "object"].includes(param.type) 
          ? param.type 
          : "string",
        description: (param.description || "").trim(),
        required: Boolean(param.required),
        defaultValue: param.defaultValue !== undefined ? param.defaultValue : undefined,
      };

      // Validate the normalized parameter
      if (!validateToolParameter(normalized)) {
        console.warn(`⚠️ [Types] Parameter ${index + 1} failed validation:`, normalized);
        return null;
      }

      console.log(`✅ [Types] Parameter ${index + 1} normalized successfully:`, normalized);
      return normalized;
    })
    .filter((param): param is ToolParameter => param !== null);

  console.log(`🎉 [Types] Normalized ${normalized.length}/${params.length} parameters successfully`);
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
    const properties: Record<string, any> = {};
    const required: string[] = [];

    tool.parameters.forEach((param) => {
      if (!param.name.trim()) {
        console.warn("⚠️ [Types] Skipping parameter with empty name:", param);
        return;
      }

      // Map tool parameter types to JSON schema types
      const jsonType = {
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

      console.log(`✅ [Types] Added parameter ${param.name} (type: ${jsonType}, required: ${param.required})`);
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
      console.log(`✅ [Types] Created input schema with ${Object.keys(properties).length} properties`);
    }
  } else {
    console.log("ℹ️ [Types] Tool has no parameters, omitting inputSchema");
  }

  console.log("🎉 [Types] Bedrock tool spec created successfully:", JSON.stringify(toolSpec, null, 2));
  return toolSpec;
}
