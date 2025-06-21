import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { cleanPath } from "@/lib/utils";

interface GeneratePageRequest {
  name: string;
  path: string;
  code: string;
  description?: string;
  template?: string;
}

interface GeneratePageResponse {
  success: boolean;
  message: string;
  path?: string;
  filePath?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GeneratePageResponse>> {
  try {
    const body = (await request.json()) as GeneratePageRequest;
    const { name, path, code, description } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Page name is required",
          message: "Page name is required",
        },
        { status: 400 }
      );
    }

    if (!path?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Page path is required",
          message: "Page path is required",
        },
        { status: 400 }
      );
    }

    if (!code?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Page code is required",
          message: "Page code is required",
        },
        { status: 400 }
      );
    }

    // Clean and validate the path
    const cleanedPath = cleanPath(path);
    const pageName =
      cleanedPath.replace(/^\//, "") ||
      cleanPath(name.replace(/[^a-zA-Z0-9]/g, ""));

    if (!pageName) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid page name or path",
          message: "Invalid page name or path",
        },
        { status: 400 }
      );
    }

    // Create the directory path in the generated folder
    const dirPath = join(process.cwd(), "src", "app", "generated", pageName);
    const filePath = join(dirPath, "page.tsx");

    // Check if directory already exists
    if (existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Page already exists at this path",
          message: "Page already exists at this path",
        },
        { status: 409 }
      );
    }

    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Ensure the code has proper metadata export
    let finalCode = code;
    if (!finalCode.includes("export const metadata")) {
      const metadataExport = `
export const metadata = {
  title: "${name} - AINP",
  description: "${description || `Generated page: ${name}`}",
};

`;
      // Insert metadata after imports but before the component
      const lines = finalCode.split("\n");
      const insertIndex =
        lines.findIndex((line) => line.trim().startsWith("export default")) ||
        lines.length;
      lines.splice(insertIndex, 0, metadataExport);
      finalCode = lines.join("\n");
    }

    // Write the file
    writeFileSync(filePath, finalCode, "utf8");

    return NextResponse.json({
      success: true,
      message: "Page created successfully",
      path: `/generated/${pageName}`,
      filePath: filePath,
    });
  } catch (error) {
    console.error("Error generating page:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: `Failed to generate page: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Page Generator API",
    version: "1.0.0",
    endpoints: {
      POST: "Generate a new page file",
      GET: "Get API information",
    },
    requiredFields: ["name", "path", "code"],
    optionalFields: ["description", "template"],
  });
}
