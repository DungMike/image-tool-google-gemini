import Papa from 'papaparse';
import type { ParsedPrompts, FileType, UploadedFile, ChunkingConfig } from '@/types';

// Parse prompts từ textarea
export function parseTextareaPrompts(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Count words in text (simple word count)
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Split text into sentences (improved sentence splitting)
export function splitIntoSentences(text: string): string[] {
  // Split by sentence endings, but preserve the punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/) // Split after sentence endings followed by whitespace
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
  
  // If no sentences found with punctuation, treat each line as a sentence
  if (sentences.length === 0 || (sentences.length === 1 && !sentences[0].match(/[.!?]/))) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.endsWith('.') || line.endsWith('!') || line.endsWith('?') ? line : line + '.');
  }
  
  return sentences;
}

// Group sentences into chunks based on configuration
export function chunkSentences(sentences: string[], config: ChunkingConfig): string[] {
  if (!config.enabled || sentences.length === 0) {
    return sentences;
  }

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);
    
    // Check if adding this sentence would exceed limits
    const wouldExceedSentenceLimit = currentChunk.length >= config.sentencesPerChunk;
    const wouldExceedWordLimit = currentWordCount + sentenceWordCount > config.maxWordsPerChunk;
    
    // If we would exceed limits and have at least one sentence, finish current chunk
    if ((wouldExceedSentenceLimit || wouldExceedWordLimit) && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [sentence];
      currentWordCount = sentenceWordCount;
    } else {
      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentWordCount += sentenceWordCount;
    }
  }

  // Add remaining sentences as final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

// Process prompts with chunking
export function processPromptsWithChunking(prompts: string[], config: ChunkingConfig): string[] {
  if (!config.enabled) {
    console.log('📝 Chunking disabled, returning original prompts:', prompts.length);
    return prompts;
  }

  console.log('📝 Processing prompts with chunking:', {
    originalPrompts: prompts.length,
    config
  });

  // Combine all prompts into sentences first
  const allSentences: string[] = [];
  
  for (const prompt of prompts) {
    const sentences = splitIntoSentences(prompt);
    console.log(`📝 Prompt "${prompt.substring(0, 50)}..." split into ${sentences.length} sentences`);
    allSentences.push(...sentences);
  }

  console.log(`📝 Total sentences to chunk: ${allSentences.length}`);

  // Group all sentences into chunks
  const chunks = chunkSentences(allSentences, config);
  
  console.log(`📝 Created ${chunks.length} chunks from ${allSentences.length} sentences`);
  chunks.forEach((chunk, index) => {
    console.log(`📝 Chunk ${index + 1}: ${countWords(chunk)} words - "${chunk.substring(0, 100)}..."`);
  });

  return chunks;
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
        .map((item: any) => String(item).trim())
        .filter((prompt: string) => prompt.length > 0);
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
  uploadedFile?: UploadedFile,
  chunkingConfig?: ChunkingConfig
): Promise<ParsedPrompts> {
  let prompts: string[] = [];
  let source: 'textarea' | 'csv' | 'json' | 'txt' = 'textarea';
  let filename: string | undefined;

  // Ưu tiên file upload nếu có
  if (uploadedFile) {
    try {
      prompts = parseFileContent(uploadedFile.content, uploadedFile.type);
      
      if (prompts.length === 0) {
        throw new Error('No valid prompts found in uploaded file');
      }
      
      source = uploadedFile.type;
      filename = uploadedFile.file.name;
    } catch (error) {
      console.error('Error parsing uploaded file:', error);
      throw error;
    }
  } else {
    // Fallback về textarea
    prompts = parseTextareaPrompts(textareaValue);
    
    if (prompts.length === 0) {
      throw new Error('Please enter prompts in the textarea or upload a file');
    }
  }

  // Apply chunking if configured
  if (chunkingConfig) {
    prompts = processPromptsWithChunking(prompts, chunkingConfig);
    
    console.log(`📝 Chunking applied: ${prompts.length} chunks created`);
    console.log('📊 Chunk word counts:', prompts.map(chunk => countWords(chunk)));
  }
  
  return {
    prompts,
    source,
    filename,
  };
}

// Validate prompts (updated for TTS with word count validation)
export function validatePrompts(prompts: string[], maxWords: number = 4000): { valid: string[]; invalid: string[]; warnings: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  
  prompts.forEach(prompt => {
    const trimmed = prompt.trim();
    
    // Kiểm tra độ dài tối thiểu
    if (trimmed.length < 3) {
      invalid.push(prompt);
      return;
    }
    
    // Kiểm tra số từ
    const wordCount = countWords(trimmed);
    if (wordCount > maxWords) {
      invalid.push(prompt);
      warnings.push(`Text with ${wordCount} words exceeds limit of ${maxWords} words`);
      return;
    }
    
    // Cảnh báo nếu số từ rất ít (có thể quá ngắn cho TTS)
    if (wordCount < 5) {
      warnings.push(`Text with only ${wordCount} words may be too short for quality TTS`);
    }
    
    // Kiểm tra độ dài tối đa (characters - backup check)
    if (trimmed.length > 20000) { // Increased for TTS chunks
      invalid.push(prompt);
      return;
    }
    
    // Kiểm tra ký tự đặc biệt có thể gây vấn đề
    const hasProblematicChars = /[<>\{}[\]\\`]/.test(trimmed);
    if (hasProblematicChars) {
      warnings.push(`Text may contain problematic characters: ${trimmed.substring(0, 50)}...`);
    }
    
    valid.push(trimmed);
  });
  
  return { valid, invalid, warnings };
}

// Format prompt cho Gemini API
export function formatPromptForGemini(prompt: string, aspectRatio?: string): string {
  // Thêm prefix để cải thiện chất lượng ảnh
  const enhancedPrompt = `Create a high-quality, detailed image${aspectRatio ? ` aspect ratio: ${aspectRatio}` : ''}: ${prompt}`;
  
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
