## Brief overview
Guidelines for AI integration patterns and admin system development in this Next.js application, focusing on Gemini AI integration, content generation workflows, and administrative interface conventions.

## AI integration patterns
- Use dedicated API routes for AI operations (e.g., `/api/generate-description/route.ts`)
- Implement proper error handling for AI service failures with fallback mechanisms
- Structure AI requests with clear input validation using Zod schemas
- Return structured responses that can be easily consumed by frontend components
- Use environment variables for AI service configuration and API keys
- Implement rate limiting and request throttling for AI endpoints

## Content generation workflow
- Provide AI-generated content as suggestions rather than automatic replacements
- Allow users to review and edit AI-generated content before saving
- Implement preview functionality for AI-generated descriptions and content
- Use loading states and progress indicators during AI processing
- Store both original and AI-enhanced content when applicable

## Admin system conventions
- Use consistent layout patterns with collapsible menus and navigation
- Implement CRUD operations with proper confirmation dialogs for destructive actions
- Use data tables with sorting, filtering, and pagination for list views
- Provide detailed edit forms with validation feedback and error handling
- Include debug panels and development tools in admin interfaces
- Implement file management with preview capabilities and drag-drop functionality

## Database management patterns
- Provide backup and restore functionality through admin interface
- Include database migration tracking and rollback capabilities
- Use transaction-based operations for complex data modifications
- Implement soft deletes where appropriate to maintain data integrity
- Store operation logs for audit trails and debugging purposes

## File handling conventions
- Use dedicated file management components with preview capabilities
- Implement proper file validation (type, size, format) before upload
- Provide image optimization and multiple format support
- Use modal dialogs for file selection and management workflows
- Include file metadata storage and retrieval functionality

## Testing approach for AI features
- Mock AI service responses in tests to ensure consistent behavior
- Test both successful AI responses and error scenarios
- Include integration tests for complete AI workflow chains
- Validate AI response parsing and error handling logic
- Test rate limiting and throttling mechanisms
