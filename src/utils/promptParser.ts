import Papa from 'papaparse';
import type { ParsedPrompts, FileType, UploadedFile } from '@/types';

// Parse prompts từ textarea
export function parseTextareaPrompts(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Detect file type từ extension
export function detectFileType(filename: string): FileType | null {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

// Read file content
export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Parse CSV file
function parseCsvPrompts(content: string): string[] {
  try {
    const result = Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
      transformHeader: undefined,
    });
    
    if (result.errors.length > 0) {
      console.warn('CSV parsing errors:', result.errors);
    }
    
    // Lấy cột đầu tiên làm prompt
    const prompts: string[] = [];
    result.data.forEach((row: any) => {
      if (Array.isArray(row) && row.length > 0) {
        const prompt = String(row[0]).trim();
        if (prompt.length > 0) {
          prompts.push(prompt);
        }
      }
    });
    
    return prompts;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Invalid CSV format');
  }
}

// Parse JSON file
function parseJsonPrompts(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    
    // Nếu là array of strings
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => String(item).trim())
        .filter(prompt => prompt.length > 0);
    }
    
    // Nếu là object với property 'prompts'
    if (parsed.prompts && Array.isArray(parsed.prompts)) {
      return parsed.prompts
        .map(item => String(item).trim())
        .filter(prompt => prompt.length > 0);
    }
    
    // Nếu là object, lấy tất cả values
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.values(parsed)
        .map(item => String(item).trim())
        .filter(prompt => prompt.length > 0);
    }
    
    throw new Error('JSON must contain an array of prompts or an object with prompts array');
  } catch (error) {
    console.error('Error parsing JSON:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

// Parse TXT file
function parseTxtPrompts(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Parse file content dựa trên type
export function parseFileContent(content: string, type: FileType): string[] {
  switch (type) {
    case 'csv':
      return parseCsvPrompts(content);
    case 'json':
      return parseJsonPrompts(content);
    case 'txt':
      return parseTxtPrompts(content);
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }
}

// Main function để parse prompts từ nhiều nguồn
export async function parsePrompts(
  textareaValue: string,
  uploadedFile?: UploadedFile
): Promise<ParsedPrompts> {
  // Ưu tiên file upload nếu có
  if (uploadedFile) {
    try {
      const prompts = parseFileContent(uploadedFile.content, uploadedFile.type);
      
      if (prompts.length === 0) {
        throw new Error('No valid prompts found in uploaded file');
      }
      
      return {
        prompts,
        source: uploadedFile.type,
        filename: uploadedFile.file.name,
      };
    } catch (error) {
      console.error('Error parsing uploaded file:', error);
      throw error;
    }
  }
  
  // Fallback về textarea
  const textPrompts = parseTextareaPrompts(textareaValue);
  
  if (textPrompts.length === 0) {
    throw new Error('Please enter prompts in the textarea or upload a file');
  }
  
  return {
    prompts: textPrompts,
    source: 'textarea',
  };
}

// Validate prompts
export function validatePrompts(prompts: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  prompts.forEach(prompt => {
    const trimmed = prompt.trim();
    
    // Kiểm tra độ dài tối thiểu
    if (trimmed.length < 3) {
      invalid.push(prompt);
      return;
    }
    
    // Kiểm tra độ dài tối đa (Gemini có giới hạn)
    if (trimmed.length > 2000) {
      invalid.push(prompt);
      return;
    }
    
    // Kiểm tra ký tự đặc biệt có thể gây vấn đề
    const hasProblematicChars = /[<>{}[\]\\`]/.test(trimmed);
    if (hasProblematicChars) {
      console.warn(`Prompt may contain problematic characters: ${trimmed.substring(0, 50)}...`);
    }
    
    valid.push(trimmed);
  });
  
  return { valid, invalid };
}

// Format prompt cho Gemini API
export function formatPromptForGemini(prompt: string): string {
  // Thêm prefix để cải thiện chất lượng ảnh
  const enhancedPrompt = `Create a high-quality, detailed image: ${prompt}`;
  
  // Làm sạch và format
  return enhancedPrompt
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate example prompts
export function getExamplePrompts(): string[] {
  return [
    'A serene mountain landscape at sunset with golden light reflecting on a crystal clear lake',
    'A futuristic city skyline with flying cars and neon lights in cyberpunk style',
    'A cozy coffee shop interior with warm lighting, books on shelves, and steam rising from a cup',
    'A magical forest with glowing mushrooms, fairy lights, and mystical creatures',
    'A vintage car driving through a desert highway under a starry night sky',
  ];
}

// Export utility để tạo template files
export const fileTemplates = {
  csv: `prompt
"A serene mountain landscape at sunset"
"A futuristic city skyline with neon lights"
"A cozy coffee shop with warm lighting"`,
  
  json: JSON.stringify([
    'A serene mountain landscape at sunset',
    'A futuristic city skyline with neon lights',
    'A cozy coffee shop with warm lighting',
  ], null, 2),
  
  txt: `A serene mountain landscape at sunset
A futuristic city skyline with neon lights
A cozy coffee shop with warm lighting`,
};
